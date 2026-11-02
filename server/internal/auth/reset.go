package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/DeviFox/carfolio/server/internal/httpx"
	"github.com/DeviFox/carfolio/server/internal/mailer"
	"github.com/DeviFox/carfolio/server/internal/password"
)

const (
	resetTokenTTL   = time.Hour
	resetPagePath   = "/reset-password/"
	sendMailTimeout = 30 * time.Second
)

// forgotPassword always answers 204, whether or not the email is
// registered, so the endpoint cannot be used to discover accounts. The
// lookup and the email are done in the background for the same reason:
// response time does not depend on whether the account exists.
func (h *Handler) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email string `json:"email"`
	}
	if err := httpx.ReadJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	email := normalizeEmail(in.Email)
	if msg := validateEmail(email); msg != "" {
		httpx.Error(w, http.StatusUnprocessableEntity, msg)
		return
	}

	if !h.ipLimiter.Allow(h.clientIP(r)) || !h.resetLimiter.Allow(email) {
		httpx.Error(w, http.StatusTooManyRequests, "too many attempts, try again later")
		return
	}

	// The request context is cancelled as soon as the response is written,
	// so the background work gets its own context with a deadline.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), sendMailTimeout)
	go func() {
		defer cancel()
		if err := h.sendResetEmail(ctx, email); err != nil {
			h.log.Error("password reset email failed", "err", err)
		}
	}()

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) sendResetEmail(ctx context.Context, email string) error {
	user, _, err := h.store.UserByEmail(ctx, email)
	if errors.Is(err, ErrNotFound) {
		return nil // nothing to send; the client already got the same 204
	}
	if err != nil {
		return fmt.Errorf("find user: %w", err)
	}

	token, tokenHash, err := newToken()
	if err != nil {
		return err
	}
	if err := h.store.CreatePasswordReset(ctx, tokenHash, user.ID, resetTokenTTL); err != nil {
		return fmt.Errorf("store reset token: %w", err)
	}

	link := h.opts.AppURL + resetPagePath + "?token=" + url.QueryEscape(token)
	return h.mailer.Send(ctx, mailer.Message{
		To:      user.Email,
		Subject: "Сброс пароля Carvisio",
		Body: "Чтобы задать новый пароль, перейдите по ссылке:\n\n" + link +
			"\n\nСсылка действует 1 час и сработает один раз." +
			"\nЕсли вы не запрашивали сброс, просто проигнорируйте это письмо.",
	})
}

// resetPassword sets a new password using the token from the email link.
// All existing sessions are ended and the user is logged in with a new one.
func (h *Handler) resetPassword(w http.ResponseWriter, r *http.Request) {
	if !h.ipLimiter.Allow(h.clientIP(r)) {
		httpx.Error(w, http.StatusTooManyRequests, "too many attempts, try again later")
		return
	}

	var in struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := httpx.ReadJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if msg := validatePassword(in.Password); msg != "" {
		httpx.Error(w, http.StatusUnprocessableEntity, msg)
		return
	}

	// Hash before opening the transaction: argon2 is deliberately slow and
	// should not run while a row lock is held.
	hash, err := password.Hash(in.Password)
	if err != nil {
		h.serverError(w, "hash password", err)
		return
	}

	user, err := h.store.ResetPassword(r.Context(), hashToken(in.Token), hash)
	if errors.Is(err, ErrNotFound) {
		httpx.Error(w, http.StatusBadRequest, "invalid or expired reset link")
		return
	}
	if err != nil {
		h.serverError(w, "reset password", err)
		return
	}

	if err := h.startSession(w, r, user.ID); err != nil {
		h.serverError(w, "start session", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, user)
}
