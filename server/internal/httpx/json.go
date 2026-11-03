// Package httpx holds small helpers shared by HTTP handlers.
package httpx

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
)

const maxBodyBytes = 1 << 20 // 1 MiB

type ReadOptions struct {
	MaxBytes           int64
	AllowUnknownFields bool
}

// ReadJSON decodes the request body into dst, rejecting unknown fields,
// bodies over 1 MiB and trailing data.
func ReadJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	return ReadJSONWith(w, r, dst, ReadOptions{MaxBytes: maxBodyBytes})
}

// ReadJSONWith is ReadJSON with its limits set by opts.
func ReadJSONWith(w http.ResponseWriter, r *http.Request, dst any, opts ReadOptions) error {
	r.Body = http.MaxBytesReader(w, r.Body, opts.MaxBytes)

	dec := json.NewDecoder(r.Body)
	if !opts.AllowUnknownFields {
		dec.DisallowUnknownFields()
	}
	if err := dec.Decode(dst); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	if dec.More() {
		return errors.New("invalid JSON body: unexpected data after object")
	}
	return nil
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes {"error": msg}. msg is shown to the client, so it must never
// contain internal details; log those separately.
func Error(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, map[string]string{"error": msg})
}
