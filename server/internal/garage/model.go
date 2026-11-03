// Package garage stores a user's cars and their service history.
//
// The JSON shapes match the client's GarageData (lib/types.ts), so the
// browser can send its records as they are. Optional fields are pointers:
// nil is "not set", which the client tells apart from zero.
package garage

import (
	"bytes"
	"encoding/json"
	"errors"
	"math"
	"time"
)

// Garage is everything one user has, or a set of records to write.
type Garage struct {
	Vehicles       []Vehicle       `json:"vehicles"`
	Systems        []System        `json:"systems"`
	Components     []Component     `json:"components"`
	InstalledParts []InstalledPart `json:"installedParts"`
	Events         []Event         `json:"events"`
	MileageHistory []MileageEntry  `json:"mileageHistory"`
	Inspections    []Inspection    `json:"inspections"`
	Reminders      []Reminder      `json:"reminders"`
}

// IDs names records to delete, by collection.
type IDs struct {
	Vehicles       []string `json:"vehicles"`
	Systems        []string `json:"systems"`
	Components     []string `json:"components"`
	InstalledParts []string `json:"installedParts"`
	Events         []string `json:"events"`
	MileageHistory []string `json:"mileageHistory"`
	Inspections    []string `json:"inspections"`
	Reminders      []string `json:"reminders"`
}

// Changes is one batch of writes from the client, applied all or nothing.
type Changes struct {
	// Merge keeps the stored version of a record whose id already exists
	// instead of overwriting it. Used when a browser's garage is first
	// added to an account: whatever the account already has wins.
	Merge  bool   `json:"merge"`
	Upsert Garage `json:"upsert"`
	Delete IDs    `json:"delete"`
}

type Vehicle struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Make             string  `json:"make"`
	Model            string  `json:"model"`
	Year             *int    `json:"year,omitempty"`
	FuelType         *string `json:"fuelType,omitempty"`
	Engine           *string `json:"engine,omitempty"`
	BodyType         *string `json:"bodyType,omitempty"`
	CurrentMileageKm *Km     `json:"currentMileageKm,omitempty"`
	Units            string  `json:"units"`
	CreatedAt        Instant `json:"createdAt"`
	UpdatedAt        Instant `json:"updatedAt"`
}

type System struct {
	ID         string `json:"id"`
	VehicleID  string `json:"vehicleId"`
	Name       string `json:"name"`
	Category   string `json:"category"`
	SortOrder  int    `json:"sortOrder"`
	IsArchived bool   `json:"isArchived"`
}

type Component struct {
	ID         string  `json:"id"`
	VehicleID  string  `json:"vehicleId"`
	SystemID   string  `json:"systemId"`
	Name       string  `json:"name"`
	Kind       string  `json:"kind"`
	Fluid      *string `json:"fluid,omitempty"`
	Axle       *string `json:"axle,omitempty"`
	Side       *string `json:"side,omitempty"`
	IsArchived bool    `json:"isArchived"`
}

type InstalledPart struct {
	ID                   string  `json:"id"`
	ComponentID          string  `json:"componentId"`
	InstalledAtMileageKm *Km     `json:"installedAtMileageKm,omitempty"`
	InstalledAtDate      *Date   `json:"installedAtDate,omitempty"`
	ExpectedLifeKm       *Km     `json:"expectedLifeKm,omitempty"`
	ExpectedLifeDays     *Days   `json:"expectedLifeDays,omitempty"`
	RemovedAtMileageKm   *Km     `json:"removedAtMileageKm,omitempty"`
	RemovedAtDate        *Date   `json:"removedAtDate,omitempty"`
	Notes                *string `json:"notes,omitempty"`
}

type Event struct {
	ID              string   `json:"id"`
	VehicleID       string   `json:"vehicleId"`
	Type            string   `json:"type"`
	Date            Date     `json:"date"`
	MileageKm       *Km      `json:"mileageKm,omitempty"`
	ComponentIDs    []string `json:"componentIds"`
	InstalledPartID *string  `json:"installedPartId,omitempty"`
	CostMinorUnits  *int64   `json:"costMinorUnits,omitempty"`
	Currency        *string  `json:"currency,omitempty"`
	Notes           *string  `json:"notes,omitempty"`
}

type MileageEntry struct {
	ID        string  `json:"id"`
	VehicleID string  `json:"vehicleId"`
	MileageKm Km      `json:"mileageKm"`
	Date      Instant `json:"date"`
	Source    string  `json:"source"`
}

type Inspection struct {
	ID          string  `json:"id"`
	ComponentID string  `json:"componentId"`
	Date        Date    `json:"date"`
	MileageKm   *Km     `json:"mileageKm,omitempty"`
	Condition   string  `json:"condition"`
	Notes       *string `json:"notes,omitempty"`
}

type Reminder struct {
	ID             string  `json:"id"`
	VehicleID      string  `json:"vehicleId"`
	ComponentID    *string `json:"componentId,omitempty"`
	Title          string  `json:"title"`
	DueAtMileageKm *Km     `json:"dueAtMileageKm,omitempty"`
	DueAtDate      *Date   `json:"dueAtDate,omitempty"`
	Priority       string  `json:"priority"`
	Status         string  `json:"status"`
}

// Km is a distance in whole kilometres. The client may send a fraction (a
// reading converted from miles); it is rounded to the nearest kilometre.
type Km int64

const maxKm = 100_000_000

func (k *Km) UnmarshalJSON(b []byte) error {
	n, err := wholeNumber(b, maxKm)
	*k = Km(n)
	return err
}

// Days is a duration in whole days. The client lets the owner type a
// fraction; it is rounded, not refused.
type Days int64

const maxDays = 100 * 366

func (d *Days) UnmarshalJSON(b []byte) error {
	n, err := wholeNumber(b, maxDays)
	*d = Days(n)
	return err
}

// wholeNumber reads a JSON number in [0, max] and rounds it.
func wholeNumber(b []byte, max float64) (int64, error) {
	var f float64
	if err := json.Unmarshal(b, &f); err != nil {
		return 0, err
	}
	if math.IsNaN(f) || f < 0 || f > max {
		return 0, errors.New("number out of range")
	}
	return int64(math.Round(f)), nil
}

// Date is a calendar day, "2006-01-02". The client has stored some days as
// full ISO timestamps; only their date part is kept, as the client itself
// reads them.
type Date string

const dateLayout = "2006-01-02"

func (d *Date) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	if len(s) < len(dateLayout) {
		return errors.New("invalid date")
	}
	s = s[:len(dateLayout)]
	if _, err := time.Parse(dateLayout, s); err != nil {
		return errors.New("invalid date")
	}
	*d = Date(s)
	return nil
}

// Instant is a moment in time. It reads RFC 3339 (or a bare date, taken as
// midnight UTC) and writes what JavaScript's toISOString() does, so dates
// that came from the client compare as strings the way they did before.
type Instant time.Time

const isoLayout = "2006-01-02T15:04:05.000Z"

func (t *Instant) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	v, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		v, err = time.Parse(dateLayout, s)
	}
	if err != nil {
		return errors.New("invalid timestamp")
	}
	*t = Instant(v)
	return nil
}

func (t Instant) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteByte('"')
	buf.WriteString(time.Time(t).UTC().Format(isoLayout))
	buf.WriteByte('"')
	return buf.Bytes(), nil
}
