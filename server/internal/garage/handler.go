package garage

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/DeviFox/carfolio/server/internal/auth"
	"github.com/DeviFox/carfolio/server/internal/httpx"
)

// A first import carries a whole browser garage at once.
const maxChangesBytes = 16 << 20 // 16 MiB

type Handler struct {
	store *Store
	log   *slog.Logger
}

func NewHandler(store *Store, log *slog.Logger) *Handler {
	return &Handler{store: store, log: log}
}

// Routes registers the garage endpoints behind requireUser, which must put
// the signed-in user into the request context (auth.Handler.RequireUser).
func (h *Handler) Routes(mux *http.ServeMux, requireUser func(http.Handler) http.Handler) {
	mux.Handle("GET /api/garage", requireUser(http.HandlerFunc(h.load)))
	mux.Handle("POST /api/garage/changes", requireUser(http.HandlerFunc(h.apply)))
}

func (h *Handler) load(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFrom(r.Context())
	g, err := h.store.Load(r.Context(), user.ID)
	if err != nil {
		h.serverError(w, "load garage", err)
		return
	}
	// The garage changes from other devices; never answer from a cache.
	w.Header().Set("Cache-Control", "no-store")
	httpx.WriteJSON(w, http.StatusOK, g)
}

func (h *Handler) apply(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFrom(r.Context())
	var c Changes
	// Unknown fields are allowed: a browser may hold records written by an
	// older version of the app, and those extra fields are simply dropped.
	err := httpx.ReadJSONWith(w, r, &c, httpx.ReadOptions{MaxBytes: maxChangesBytes, AllowUnknownFields: true})
	if err == nil {
		err = c.Validate()
	}
	if err != nil {
		// Logged: a refused batch is the owner's data that didn't land.
		h.log.Warn("garage changes refused", "user", user.ID, "err", err)
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	err = h.store.Apply(r.Context(), user.ID, c)
	if errors.Is(err, ErrConflict) {
		h.log.Warn("garage write conflict", "user", user.ID, "err", err)
		httpx.Error(w, http.StatusConflict, "changes reference a record that no longer exists")
		return
	}
	if err != nil {
		h.serverError(w, "apply garage changes", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) serverError(w http.ResponseWriter, op string, err error) {
	h.log.Error("request failed", "op", op, "err", err)
	httpx.Error(w, http.StatusInternalServerError, "internal error")
}
