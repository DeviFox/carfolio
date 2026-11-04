package garage

import (
	"fmt"
	"slices"
	"unicode/utf8"
)

// Limits on what one request may carry. A garage is a few cars with a few
// hundred records each; these leave a wide margin and still bound the work.
const (
	maxRecords       = 50_000 // upserts plus deletes in one batch
	maxEventParts    = 100    // componentIds on one record
	maxNameLen       = 200
	maxNotesLen      = 10_000
	maxCurrencyLen   = 10
	maxFluidKeyLen   = 50
	minYear, maxYear = 1800, 3000
)

// The client's enums (lib/types.ts). The migration repeats them as CHECKs.
var (
	unitsValues      = []string{"km", "mi"}
	bodyTypes        = []string{"sedan", "hatchback", "wagon", "coupe", "crossover", "suv", "pickup", "minivan", "van", "other"}
	categories       = []string{"engine", "transmission", "brakes", "suspension", "tires", "electrical", "cooling", "body", "other"}
	componentKinds   = []string{"consumable", "replaceable", "inspectable"}
	axles            = []string{"front", "rear"}
	sides            = []string{"left", "right"}
	eventTypes       = []string{"replacement", "purchase", "inspection", "repair", "fluid_service", "observation"}
	mileageSources   = []string{"owner", "service", "estimate"}
	conditions       = []string{"good", "worn", "critical", "unknown"}
	priorities       = []string{"low", "normal", "high"}
	reminderStatuses = []string{"open", "done", "dismissed"}
)

// Validate reports the first problem in c, naming the field, e.g.
// "upsert.events[3].type: unknown value". Ownership and references are
// checked by the database.
func (c *Changes) Validate() error {
	if n := c.Upsert.count() + c.Delete.count(); n > maxRecords {
		return fmt.Errorf("too many records: %d (max %d)", n, maxRecords)
	}
	var v checker
	c.Upsert.validate(&v)
	c.Delete.validate(&v)
	return v.err
}

func (g *Garage) count() int {
	return len(g.Vehicles) + len(g.Systems) + len(g.Components) + len(g.InstalledParts) +
		len(g.Events) + len(g.MileageHistory) + len(g.Inspections) + len(g.Reminders)
}

func (d *IDs) count() int {
	return len(d.Vehicles) + len(d.Systems) + len(d.Components) + len(d.InstalledParts) +
		len(d.Events) + len(d.MileageHistory) + len(d.Inspections) + len(d.Reminders)
}

func (g *Garage) validate(v *checker) {
	for i, x := range g.Vehicles {
		v.at("upsert.vehicles[%d]", i)
		v.id("id", x.ID)
		v.text("name", x.Name, maxNameLen)
		v.text("make", x.Make, maxNameLen)
		v.text("model", x.Model, maxNameLen)
		if x.Year != nil && (*x.Year < minYear || *x.Year > maxYear) {
			v.fail("year", "out of range")
		}
		v.optText("fuelType", x.FuelType, maxNameLen)
		v.optText("engine", x.Engine, maxNameLen)
		v.optOneOf("bodyType", x.BodyType, bodyTypes)
		v.oneOf("units", x.Units, unitsValues)
	}
	for i, x := range g.Systems {
		v.at("upsert.systems[%d]", i)
		v.id("id", x.ID)
		v.id("vehicleId", x.VehicleID)
		v.text("name", x.Name, maxNameLen)
		v.oneOf("category", x.Category, categories)
	}
	for i, x := range g.Components {
		v.at("upsert.components[%d]", i)
		v.id("id", x.ID)
		v.id("vehicleId", x.VehicleID)
		v.id("systemId", x.SystemID)
		v.text("name", x.Name, maxNameLen)
		v.oneOf("kind", x.Kind, componentKinds)
		v.optText("fluid", x.Fluid, maxFluidKeyLen)
		v.optOneOf("axle", x.Axle, axles)
		v.optOneOf("side", x.Side, sides)
	}
	for i, x := range g.InstalledParts {
		v.at("upsert.installedParts[%d]", i)
		v.id("id", x.ID)
		v.id("componentId", x.ComponentID)
		v.optText("notes", x.Notes, maxNotesLen)
	}
	for i, x := range g.Events {
		v.at("upsert.events[%d]", i)
		v.id("id", x.ID)
		v.id("vehicleId", x.VehicleID)
		v.oneOf("type", x.Type, eventTypes)
		if len(x.ComponentIDs) > maxEventParts {
			v.fail("componentIds", "too many")
		}
		for j, id := range x.ComponentIDs {
			v.id(fmt.Sprintf("componentIds[%d]", j), id)
			if slices.Contains(x.ComponentIDs[:j], id) {
				v.fail(fmt.Sprintf("componentIds[%d]", j), "duplicate")
			}
		}
		v.optID("installedPartId", x.InstalledPartID)
		if x.CostMinorUnits != nil && *x.CostMinorUnits < 0 {
			v.fail("costMinorUnits", "negative")
		}
		v.optText("currency", x.Currency, maxCurrencyLen)
		v.optText("notes", x.Notes, maxNotesLen)
	}
	for i, x := range g.MileageHistory {
		v.at("upsert.mileageHistory[%d]", i)
		v.id("id", x.ID)
		v.id("vehicleId", x.VehicleID)
		v.oneOf("source", x.Source, mileageSources)
	}
	for i, x := range g.Inspections {
		v.at("upsert.inspections[%d]", i)
		v.id("id", x.ID)
		v.id("componentId", x.ComponentID)
		v.oneOf("condition", x.Condition, conditions)
		v.optText("notes", x.Notes, maxNotesLen)
	}
	for i, x := range g.Reminders {
		v.at("upsert.reminders[%d]", i)
		v.id("id", x.ID)
		v.id("vehicleId", x.VehicleID)
		v.optID("componentId", x.ComponentID)
		v.text("title", x.Title, maxNameLen)
		v.oneOf("priority", x.Priority, priorities)
		v.oneOf("status", x.Status, reminderStatuses)
	}
}

func (d *IDs) validate(v *checker) {
	lists := []struct {
		name string
		ids  []string
	}{
		{"vehicles", d.Vehicles}, {"systems", d.Systems}, {"components", d.Components},
		{"installedParts", d.InstalledParts}, {"events", d.Events},
		{"mileageHistory", d.MileageHistory}, {"inspections", d.Inspections}, {"reminders", d.Reminders},
	}
	for _, l := range lists {
		v.at("delete")
		for i, id := range l.ids {
			v.id(fmt.Sprintf("%s[%d]", l.name, i), id)
		}
	}
}

// checker keeps the first validation error; later checks become no-ops.
type checker struct {
	path string
	err  error
}

func (v *checker) at(format string, args ...any) { v.path = fmt.Sprintf(format, args...) }

func (v *checker) fail(field, problem string) {
	if v.err == nil {
		v.err = fmt.Errorf("%s.%s: %s", v.path, field, problem)
	}
}

func (v *checker) id(field, s string) {
	if !isUUID(s) {
		v.fail(field, "not a UUID")
	}
}

func (v *checker) optID(field string, s *string) {
	if s != nil {
		v.id(field, *s)
	}
}

func (v *checker) text(field, s string, max int) {
	if !utf8.ValidString(s) {
		v.fail(field, "invalid UTF-8")
	} else if utf8.RuneCountInString(s) > max {
		v.fail(field, "too long")
	}
}

func (v *checker) optText(field string, s *string, max int) {
	if s != nil {
		v.text(field, *s, max)
	}
}

func (v *checker) oneOf(field, s string, allowed []string) {
	if !slices.Contains(allowed, s) {
		v.fail(field, "unknown value")
	}
}

func (v *checker) optOneOf(field string, s *string, allowed []string) {
	if s != nil {
		v.oneOf(field, *s, allowed)
	}
}

// isUUID accepts the form crypto.randomUUID() produces: 8-4-4-4-12
// lowercase hex digits. Postgres returns UUIDs in lowercase, so an
// uppercase id would come back as a different string.
func isUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch i {
		case 8, 13, 18, 23:
			if c != '-' {
				return false
			}
		default:
			if !('0' <= c && c <= '9' || 'a' <= c && c <= 'f') {
				return false
			}
		}
	}
	return true
}
