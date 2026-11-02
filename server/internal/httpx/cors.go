package httpx

import (
	"net/http"
	"slices"
)

// CORS lets the listed origins call the API from the browser with cookies
// (fetch with credentials: "include"). The frontend lives on carvisio.pro
// and the API on api.carvisio.pro, so every API call is cross-origin.
//
// Requests from other origins get no CORS headers and the browser blocks
// the response; CheckOrigin additionally rejects their state-changing calls.
func CORS(allowed []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" || !slices.Contains(allowed, origin) {
			next.ServeHTTP(w, r)
			return
		}

		h := w.Header()
		h.Add("Vary", "Origin")
		h.Set("Access-Control-Allow-Origin", origin)
		h.Set("Access-Control-Allow-Credentials", "true")

		// Preflight: the browser asks before sending a JSON POST.
		if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
			h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE")
			h.Set("Access-Control-Allow-Headers", "Content-Type")
			h.Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
