package garage

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestDecodeTypes(t *testing.T) {
	var x struct {
		Km      Km      `json:"km"`
		Days    Days    `json:"days"`
		Day     Date    `json:"day"`
		FromISO Date    `json:"fromIso"`
		At      Instant `json:"at"`
		AtDay   Instant `json:"atDay"`
	}
	in := `{"km": 1609.6, "days": 182.6, "day": "2024-10-12", "fromIso": "2024-10-12T21:00:00.000Z",
		"at": "2025-01-02T10:04:05.678+07:00", "atDay": "2025-01-02"}`
	if err := json.Unmarshal([]byte(in), &x); err != nil {
		t.Fatal(err)
	}
	if x.Km != 1610 {
		t.Errorf("km = %d, want 1610", x.Km)
	}
	if x.Days != 183 {
		t.Errorf("days = %d, want 183", x.Days)
	}
	if x.Day != "2024-10-12" || x.FromISO != "2024-10-12" {
		t.Errorf("dates = %q, %q", x.Day, x.FromISO)
	}
	for name, v := range map[string]Instant{"at": x.At, "atDay": x.AtDay} {
		b, _ := json.Marshal(v)
		want := map[string]string{"at": `"2025-01-02T03:04:05.678Z"`, "atDay": `"2025-01-02T00:00:00.000Z"`}[name]
		if string(b) != want {
			t.Errorf("%s = %s, want %s", name, b, want)
		}
	}
}

func TestDecodeRejects(t *testing.T) {
	for _, in := range []string{
		`{"km": -1}`, `{"km": "12"}`, `{"day": "2024-13-01"}`, `{"day": "вчера"}`, `{"at": "noon"}`,
	} {
		var x struct {
			Km  Km      `json:"km"`
			Day Date    `json:"day"`
			At  Instant `json:"at"`
		}
		if err := json.Unmarshal([]byte(in), &x); err == nil {
			t.Errorf("%s: want error", in)
		}
	}
}

const (
	id1 = "11111111-1111-4111-8111-111111111111"
	id2 = "22222222-2222-4222-8222-222222222222"
)

func TestValidate(t *testing.T) {
	ok := Changes{Upsert: Garage{Systems: []System{{ID: id1, VehicleID: id2, Name: "Двигатель", Category: "engine"}}}}
	if err := ok.Validate(); err != nil {
		t.Fatalf("valid changes: %v", err)
	}

	cases := map[string]struct {
		c    Changes
		want string
	}{
		"enum": {Changes{Upsert: Garage{Systems: []System{{ID: id1, VehicleID: id2, Category: "rocket"}}}},
			"upsert.systems[0].category: unknown value"},
		"uppercase id": {Changes{Delete: IDs{Events: []string{strings.ToUpper("aaaaaaaa-1111-4111-8111-111111111111")}}},
			"delete.events[0]: not a UUID"},
		"duplicate component": {Changes{Upsert: Garage{Events: []Event{{ID: id1, VehicleID: id2, Type: "repair",
			ComponentIDs: []string{id1, id1}}}}}, "upsert.events[0].componentIds[1]: duplicate"},
		"long name": {Changes{Upsert: Garage{Systems: []System{{ID: id1, VehicleID: id2, Category: "engine",
			Name: strings.Repeat("я", maxNameLen+1)}}}}, "upsert.systems[0].name: too long"},
	}
	for name, tc := range cases {
		err := tc.c.Validate()
		if err == nil || err.Error() != tc.want {
			t.Errorf("%s: got %v, want %q", name, err, tc.want)
		}
	}
}
