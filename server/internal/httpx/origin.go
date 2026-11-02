package httpx

import (
	"net/http"
	"net/url"
	"slices"
)

// CheckOrigin is CSRF protection for cookie auth: a state-changing request
// that carries an Origin header must come from this host or an allowed
// origin. Modern browsers send Origin on every cross-site POST, and the
// SameSite=Lax session cookie covers the rest; requests without Origin
// (curl, server-to-server) are let through.
func CheckOrigin(allowed []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}

		origin := r.Header.Get("Origin")
		if origin == "" || slices.Contains(allowed, origin) {
			next.ServeHTTP(w, r)
			return
		}
		if u, err := url.Parse(origin); err == nil && u.Host == r.Host {
			next.ServeHTTP(w, r)
			return
		}
		Error(w, http.StatusForbidden, "origin not allowed")
	})
}
