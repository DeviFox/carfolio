package garage

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrConflict means a write points at a record the account doesn't have,
// e.g. a part for a car another device has already deleted.
var ErrConflict = errors.New("references a missing record")

// Postgres error code for a FOREIGN KEY violation.
const pgForeignKeyViolation = "23503"

type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

// Load returns the user's whole garage. The reads run in one REPEATABLE READ
// transaction, so they all see the same moment even while another device is
// writing.
func (s *Store) Load(ctx context.Context, userID string) (Garage, error) {
	var g Garage
	opts := pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly}
	err := pgx.BeginTxFunc(ctx, s.db, opts, func(tx pgx.Tx) error {
		var err error
		if g.Vehicles, err = loadVehicles(ctx, tx, userID); err != nil {
			return fmt.Errorf("vehicles: %w", err)
		}
		if g.Systems, err = loadSystems(ctx, tx, userID); err != nil {
			return fmt.Errorf("systems: %w", err)
		}
		if g.Components, err = loadComponents(ctx, tx, userID); err != nil {
			return fmt.Errorf("components: %w", err)
		}
		if g.InstalledParts, err = loadInstalledParts(ctx, tx, userID); err != nil {
			return fmt.Errorf("installed parts: %w", err)
		}
		if g.Events, err = loadEvents(ctx, tx, userID); err != nil {
			return fmt.Errorf("events: %w", err)
		}
		if g.MileageHistory, err = loadMileage(ctx, tx, userID); err != nil {
			return fmt.Errorf("mileage: %w", err)
		}
		if g.Inspections, err = loadInspections(ctx, tx, userID); err != nil {
			return fmt.Errorf("inspections: %w", err)
		}
		if g.Reminders, err = loadReminders(ctx, tx, userID); err != nil {
			return fmt.Errorf("reminders: %w", err)
		}
		return nil
	})
	return g, err
}

// collect runs a query and scans every row with scan. It returns an empty
// slice, not nil, so the JSON is [] rather than null.
func collect[T any](ctx context.Context, tx pgx.Tx, sql, userID string, scan func(pgx.Rows, *T) error) ([]T, error) {
	rows, err := tx.Query(ctx, sql, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []T{}
	for rows.Next() {
		var x T
		if err := scan(rows, &x); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

func loadVehicles(ctx context.Context, tx pgx.Tx, userID string) ([]Vehicle, error) {
	return collect(ctx, tx, `
		SELECT id, name, make, model, year, fuel_type, engine, body_type,
		       current_mileage_km, units, created_at, updated_at
		FROM vehicles WHERE user_id = $1
		ORDER BY created_at, id`, userID,
		func(r pgx.Rows, x *Vehicle) error {
			var created, updated time.Time
			err := r.Scan(&x.ID, &x.Name, &x.Make, &x.Model, &x.Year, &x.FuelType, &x.Engine, &x.BodyType,
				&x.CurrentMileageKm, &x.Units, &created, &updated)
			x.CreatedAt, x.UpdatedAt = Instant(created), Instant(updated)
			return err
		})
}

func loadSystems(ctx context.Context, tx pgx.Tx, userID string) ([]System, error) {
	return collect(ctx, tx, `
		SELECT id, vehicle_id, name, category, sort_order, is_archived
		FROM vehicle_systems WHERE user_id = $1
		ORDER BY vehicle_id, sort_order, id`, userID,
		func(r pgx.Rows, x *System) error {
			return r.Scan(&x.ID, &x.VehicleID, &x.Name, &x.Category, &x.SortOrder, &x.IsArchived)
		})
}

func loadComponents(ctx context.Context, tx pgx.Tx, userID string) ([]Component, error) {
	return collect(ctx, tx, `
		SELECT id, vehicle_id, system_id, name, kind, fluid, axle, side, is_archived
		FROM components WHERE user_id = $1
		ORDER BY vehicle_id, system_id, name, id`, userID,
		func(r pgx.Rows, x *Component) error {
			return r.Scan(&x.ID, &x.VehicleID, &x.SystemID, &x.Name, &x.Kind, &x.Fluid, &x.Axle, &x.Side, &x.IsArchived)
		})
}

// Dates are read as text: Postgres prints a date as 2006-01-02, which is
// exactly the client's format.
func loadInstalledParts(ctx context.Context, tx pgx.Tx, userID string) ([]InstalledPart, error) {
	return collect(ctx, tx, `
		SELECT id, component_id, installed_at_mileage_km, installed_at_date::text,
		       expected_life_km, expected_life_days, removed_at_mileage_km, removed_at_date::text, notes
		FROM installed_parts WHERE user_id = $1
		ORDER BY component_id, installed_at_date NULLS FIRST, id`, userID,
		func(r pgx.Rows, x *InstalledPart) error {
			return r.Scan(&x.ID, &x.ComponentID, &x.InstalledAtMileageKm, &x.InstalledAtDate,
				&x.ExpectedLifeKm, &x.ExpectedLifeDays, &x.RemovedAtMileageKm, &x.RemovedAtDate, &x.Notes)
		})
}

func loadEvents(ctx context.Context, tx pgx.Tx, userID string) ([]Event, error) {
	return collect(ctx, tx, `
		SELECT e.id, e.vehicle_id, e.type, e.date::text, e.mileage_km,
		       coalesce((SELECT array_agg(ec.component_id ORDER BY ec.position)
		                 FROM event_components ec
		                 WHERE ec.user_id = e.user_id AND ec.event_id = e.id), '{}'),
		       e.installed_part_id, e.cost_minor_units, e.currency, e.notes
		FROM maintenance_events e WHERE e.user_id = $1
		ORDER BY e.date, e.id`, userID,
		func(r pgx.Rows, x *Event) error {
			return r.Scan(&x.ID, &x.VehicleID, &x.Type, &x.Date, &x.MileageKm, &x.ComponentIDs,
				&x.InstalledPartID, &x.CostMinorUnits, &x.Currency, &x.Notes)
		})
}

func loadMileage(ctx context.Context, tx pgx.Tx, userID string) ([]MileageEntry, error) {
	return collect(ctx, tx, `
		SELECT id, vehicle_id, mileage_km, date, source
		FROM mileage_entries WHERE user_id = $1
		ORDER BY date, id`, userID,
		func(r pgx.Rows, x *MileageEntry) error {
			var date time.Time
			err := r.Scan(&x.ID, &x.VehicleID, &x.MileageKm, &date, &x.Source)
			x.Date = Instant(date)
			return err
		})
}

func loadInspections(ctx context.Context, tx pgx.Tx, userID string) ([]Inspection, error) {
	return collect(ctx, tx, `
		SELECT id, component_id, date::text, mileage_km, condition, notes
		FROM inspections WHERE user_id = $1
		ORDER BY date, id`, userID,
		func(r pgx.Rows, x *Inspection) error {
			return r.Scan(&x.ID, &x.ComponentID, &x.Date, &x.MileageKm, &x.Condition, &x.Notes)
		})
}

func loadReminders(ctx context.Context, tx pgx.Tx, userID string) ([]Reminder, error) {
	return collect(ctx, tx, `
		SELECT id, vehicle_id, component_id, title, due_at_mileage_km, due_at_date::text, priority, status
		FROM reminders WHERE user_id = $1
		ORDER BY vehicle_id, id`, userID,
		func(r pgx.Rows, x *Reminder) error {
			return r.Scan(&x.ID, &x.VehicleID, &x.ComponentID, &x.Title, &x.DueAtMileageKm, &x.DueAtDate,
				&x.Priority, &x.Status)
		})
}

// Apply writes a batch of changes in one transaction: all of it lands or
// none of it does. Upserts go parents first (a car before its systems),
// deletes children first, so every foreign key holds after each statement.
//
// The statements are sent as one pgx.Batch: a single round trip to the
// database however many records there are.
func (s *Store) Apply(ctx context.Context, userID string, c Changes) error {
	b := &pgx.Batch{}
	queueUpserts(b, userID, &c.Upsert, c.Merge)
	queueDeletes(b, userID, &c.Delete)
	if b.Len() == 0 {
		return nil
	}

	err := pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
		return tx.SendBatch(ctx, b).Close()
	})
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == pgForeignKeyViolation {
		return fmt.Errorf("%w: %s", ErrConflict, pgErr.ConstraintName)
	}
	return err
}

func queueUpserts(b *pgx.Batch, userID string, g *Garage, merge bool) {
	vehicles := upsertSQL(merge, "vehicles", "name", "make", "model", "year", "fuel_type", "engine", "body_type",
		"current_mileage_km", "units", "created_at", "updated_at")
	for _, x := range g.Vehicles {
		b.Queue(vehicles, userID, x.ID, x.Name, x.Make, x.Model, x.Year, x.FuelType, x.Engine, x.BodyType,
			x.CurrentMileageKm, x.Units, time.Time(x.CreatedAt), time.Time(x.UpdatedAt))
	}

	systems := upsertSQL(merge, "vehicle_systems", "vehicle_id", "name", "category", "sort_order", "is_archived")
	for _, x := range g.Systems {
		b.Queue(systems, userID, x.ID, x.VehicleID, x.Name, x.Category, x.SortOrder, x.IsArchived)
	}

	components := upsertSQL(merge, "components", "vehicle_id", "system_id", "name", "kind", "fluid", "axle", "side", "is_archived")
	for _, x := range g.Components {
		b.Queue(components, userID, x.ID, x.VehicleID, x.SystemID, x.Name, x.Kind, x.Fluid, x.Axle, x.Side, x.IsArchived)
	}

	parts := upsertSQL(merge, "installed_parts", "component_id", "installed_at_mileage_km", "installed_at_date",
		"expected_life_km", "expected_life_days", "removed_at_mileage_km", "removed_at_date", "notes")
	for _, x := range g.InstalledParts {
		b.Queue(parts, userID, x.ID, x.ComponentID, x.InstalledAtMileageKm, x.InstalledAtDate,
			x.ExpectedLifeKm, x.ExpectedLifeDays, x.RemovedAtMileageKm, x.RemovedAtDate, x.Notes)
	}

	// A record and its componentIds are written by one statement: the CTE
	// upserts the record, and its RETURNING feeds the link rows. When merge
	// skips an existing record, RETURNING is empty and its links stay as they
	// are. When overwriting, the old links are cleared first.
	events := `WITH e AS (` +
		upsertSQL(merge, "maintenance_events", "vehicle_id", "type", "date", "mileage_km", "installed_part_id",
			"cost_minor_units", "currency", "notes") + ` RETURNING id)
		INSERT INTO event_components (user_id, event_id, component_id, position)
		SELECT $1, e.id, c.id, c.pos::smallint
		FROM e, unnest($11::uuid[]) WITH ORDINALITY AS c(id, pos)`
	for _, x := range g.Events {
		if !merge {
			b.Queue(`DELETE FROM event_components WHERE user_id = $1 AND event_id = $2`, userID, x.ID)
		}
		componentIDs := x.ComponentIDs
		if componentIDs == nil {
			componentIDs = []string{}
		}
		b.Queue(events, userID, x.ID, x.VehicleID, x.Type, x.Date, x.MileageKm, x.InstalledPartID,
			x.CostMinorUnits, x.Currency, x.Notes, componentIDs)
	}

	mileage := upsertSQL(merge, "mileage_entries", "vehicle_id", "mileage_km", "date", "source")
	for _, x := range g.MileageHistory {
		b.Queue(mileage, userID, x.ID, x.VehicleID, x.MileageKm, time.Time(x.Date), x.Source)
	}

	inspections := upsertSQL(merge, "inspections", "component_id", "date", "mileage_km", "condition", "notes")
	for _, x := range g.Inspections {
		b.Queue(inspections, userID, x.ID, x.ComponentID, x.Date, x.MileageKm, x.Condition, x.Notes)
	}

	reminders := upsertSQL(merge, "reminders", "vehicle_id", "component_id", "title", "due_at_mileage_km",
		"due_at_date", "priority", "status")
	for _, x := range g.Reminders {
		b.Queue(reminders, userID, x.ID, x.VehicleID, x.ComponentID, x.Title, x.DueAtMileageKm, x.DueAtDate,
			x.Priority, x.Status)
	}
}

func queueDeletes(b *pgx.Batch, userID string, d *IDs) {
	// Children first. Deleting a parent also cascades to its children, so a
	// child listed here may already be gone; that is not an error.
	lists := []struct {
		table string
		ids   []string
	}{
		{"reminders", d.Reminders},
		{"inspections", d.Inspections},
		{"mileage_entries", d.MileageHistory},
		{"maintenance_events", d.Events},
		{"installed_parts", d.InstalledParts},
		{"components", d.Components},
		{"vehicle_systems", d.Systems},
		{"vehicles", d.Vehicles},
	}
	for _, l := range lists {
		if len(l.ids) > 0 {
			// The table name comes from the list above, never from the request.
			b.Queue(`DELETE FROM `+l.table+` WHERE user_id = $1 AND id = ANY($2::uuid[])`, userID, l.ids)
		}
	}
}

// upsertSQL builds
//
//	INSERT INTO table (user_id, id, col...) VALUES ($1, $2, $3...)
//	ON CONFLICT (user_id, id) DO UPDATE SET col = excluded.col, ...
//
// or, with merge, ON CONFLICT DO NOTHING. Arguments go in the same order:
// user id, record id, then cols.
func upsertSQL(merge bool, table string, cols ...string) string {
	var sb strings.Builder
	fmt.Fprintf(&sb, "INSERT INTO %s (user_id, id, %s) VALUES ($1, $2", table, strings.Join(cols, ", "))
	for i := range cols {
		fmt.Fprintf(&sb, ", $%d", i+3)
	}
	sb.WriteString(") ON CONFLICT (user_id, id) DO ")
	if merge {
		sb.WriteString("NOTHING")
		return sb.String()
	}
	sb.WriteString("UPDATE SET ")
	for i, c := range cols {
		if i > 0 {
			sb.WriteString(", ")
		}
		fmt.Fprintf(&sb, "%s = excluded.%s", c, c)
	}
	return sb.String()
}
