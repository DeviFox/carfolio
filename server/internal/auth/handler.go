// Package auth implements registration, login, cookie sessions and
// password reset.
package auth

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/DeviFox/carfolio/server/internal/httpx"
	"github.com/DeviFox/carfolio/server/internal/mailer"
	"github.com/DeviFox/carfolio/server/internal/password"
)

const (
	minPasswordLen = 8
	maxPasswordLen = 128
	maxEmailLen    = 254
)

type Options struct {
	SecureCookie bool   // false only for local http development
	TrustProxy   bool   // read the client IP from X-Real-IP (set by nginx)
	AppURL       string // frontend base URL for links in emails
}

type Handler struct {
	store  *Store
	mailer mailer.Mailer
	log    *slog.Logger
	opts   Options

	ipLimiter    *limiter
	emailLimiter *limiter // failed logins per email
	resetLimiter *limiter // reset emails per address

	// Hash of a throwaway password. Login verifies against it when the email
	// is unknown, so both cases take the same time.
	dummyHash string
}

func NewHandler(store *Store, m mailer.Mailer, log *slog.Logger, opts Options) (*Handler, error) {
	dummy, err := password.Hash("dummy-password-for-timing")
	if err != nil {
		return nil, err
	}
	return &Handler{
		store:        store,
		mailer:       m,
		log:          log,
		opts:         opts,
		ipLimiter:    newLimiter(50, 15*time.Minute),
		emailLimiter: newLimiter(10, 15*time.Minute),
		resetLimiter: newLimiter(3, 15*time.Minute),
		dummyHash:    dummy,
	}, nil
}

func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/register", h.register)
	mux.HandleFunc("POST /api/auth/login", h.login)
	mux.HandleFunc("POST /api/auth/logout", h.logout)
	mux.HandleFunc("POST /api/auth/password/forgot", h.forgotPassword)
	mux.HandleFunc("POST /api/auth/password/reset", h.resetPassword)
	mux.Handle("GET /api/me", h.RequireUser(http.HandlerFunc(h.me)))
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	if !h.ipLimiter.Allow(h.clientIP(r)) {
		httpx.Error(w, http.StatusTooManyRequests, "too many attempts, try again later")
		return
	}

	var in credentials
	if err := httpx.ReadJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	email := normalizeEmail(in.Email)
	if msg := validateEmail(email); msg != "" {
		httpx.Error(w, http.StatusUnprocessableEntity, msg)
		return
	}
	if msg := validatePassword(in.Password); msg != "" {
		httpx.Error(w, http.StatusUnprocessableEntity, msg)
		return
	}

	hash, err := password.Hash(in.Password)
	if err != nil {
		h.serverError(w, "hash password", err)
		return
	}
	user, err := h.store.CreateUser(r.Context(), email, hash)
	if errors.Is(err, ErrEmailTaken) {
		httpx.Error(w, http.StatusConflict, "email already registered")
		return
	}
	if err != nil {
		h.serverError(w, "create user", err)
		return
	}

	if err := h.startSession(w, r, user.ID); err != nil {
		h.serverError(w, "start session", err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, user)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if err := httpx.ReadJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	email := normalizeEmail(in.Email)

	if !h.ipLimiter.Allow(h.clientIP(r)) || !h.emailLimiter.Allow(email) {
		httpx.Error(w, http.StatusTooManyRequests, "too many attempts, try again later")
		return
	}

	user, hash, err := h.store.UserByEmail(r.Context(), email)
	if errors.Is(err, ErrNotFound) {
		_, _ = password.Verify(in.Password, h.dummyHash)
		httpx.Error(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if err != nil {
		h.serverError(w, "find user", err)
		return
	}

	ok, err := password.Verify(in.Password, hash)
	if err != nil {
		h.serverError(w, "verify password", err)
		return
	}
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	h.emailLimiter.Reset(email)
	if err := h.startSession(w, r, user.ID); err != nil {
		h.serverError(w, "start session", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, user)
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(cookieName); err == nil {
		if err := h.store.DeleteSession(r.Context(), hashToken(c.Value)); err != nil {
			h.serverError(w, "delete session", err)
			return
		}
	}
	clearSessionCookie(w, h.opts.SecureCookie)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, UserFrom(r.Context()))
}

// RequireUser rejects requests without a valid session and puts the
// current user into the request context.
func (h *Handler) RequireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(cookieName)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "not authenticated")
			return
		}

		user, err := h.store.UserBySession(r.Context(), hashToken(c.Value))
		if errors.Is(err, ErrNotFound) {
			clearSessionCookie(w, h.opts.SecureCookie)
			httpx.Error(w, http.StatusUnauthorized, "not authenticated")
			return
		}
		if err != nil {
			h.serverError(w, "load session", err)
			return
		}

		setSessionCookie(w, c.Value, h.opts.SecureCookie) // slide the 400-day cookie
		ctx := context.WithValue(r.Context(), userKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

type userKey struct{}

// UserFrom returns the user stored by RequireUser.
func UserFrom(ctx context.Context) User {
	u, _ := ctx.Value(userKey{}).(User)
	return u
}

func (h *Handler) startSession(w http.ResponseWriter, r *http.Request, userID string) error {
	token, tokenHash, err := newToken()
	if err != nil {
		return err
	}
	if err := h.store.CreateSession(r.Context(), tokenHash, userID); err != nil {
		return err
	}
	setSessionCookie(w, token, h.opts.SecureCookie)
	return nil
}

func (h *Handler) clientIP(r *http.Request) string {
	if h.opts.TrustProxy {
		if ip := r.Header.Get("X-Real-IP"); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (h *Handler) serverError(w http.ResponseWriter, op string, err error) {
	h.log.Error("request failed", "op", op, "err", err)
	httpx.Error(w, http.StatusInternalServerError, "internal error")
}

func normalizeEmail(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func validateEmail(email string) string {
	if email == "" || len(email) > maxEmailLen {
		return "invalid email"
	}
	// ParseAddress also accepts `Name <a@b>`; require the bare address.
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return "invalid email"
	}
	return ""
}

func validatePassword(pw string) string {
	n := utf8.RuneCountInString(pw)
	if n < minPasswordLen {
		return "password must be at least 8 characters"
	}
	if n > maxPasswordLen {
		return "password must be at most 128 characters"
	}
	return ""
}
