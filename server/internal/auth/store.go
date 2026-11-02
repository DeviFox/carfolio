package auth

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrEmailTaken = errors.New("email already registered")
)

// Postgres error code for a UNIQUE constraint violation.
const pgUniqueViolation = "23505"

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

// Store is the database access for users, sessions and password resets.
type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func (s *Store) CreateUser(ctx context.Context, email, passwordHash string) (User, error) {
	var u User
	err := s.db.QueryRow(ctx, `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id, email, created_at`,
		email, passwordHash,
	).Scan(&u.ID, &u.Email, &u.CreatedAt)

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
		return User{}, ErrEmailTaken
	}
	return u, err
}

// UserByEmail returns the user and their password hash.
func (s *Store) UserByEmail(ctx context.Context, email string) (User, string, error) {
	var u User
	var hash string
	err := s.db.QueryRow(ctx, `
		SELECT id, email, created_at, password_hash
		FROM users
		WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.CreatedAt, &hash)

	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, "", ErrNotFound
	}
	return u, hash, err
}

func (s *Store) CreateSession(ctx context.Context, tokenHash []byte, userID string) error {
	_, err := s.db.Exec(ctx, `
		INSERT INTO sessions (token_hash, user_id)
		VALUES ($1, $2)`,
		tokenHash, userID,
	)
	return err
}

// UserBySession returns the session's user and marks the session as seen.
func (s *Store) UserBySession(ctx context.Context, tokenHash []byte) (User, error) {
	var u User
	err := s.db.QueryRow(ctx, `
		WITH s AS (
			UPDATE sessions
			SET last_seen_at = now()
			WHERE token_hash = $1
			RETURNING user_id
		)
		SELECT u.id, u.email, u.created_at
		FROM users u
		JOIN s ON s.user_id = u.id`,
		tokenHash,
	).Scan(&u.ID, &u.Email, &u.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash []byte) error {
	_, err := s.db.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

// CreatePasswordReset stores a new reset token and invalidates the user's
// earlier unused ones, so only the most recent email link works.
func (s *Store) CreatePasswordReset(ctx context.Context, tokenHash []byte, userID string, ttl time.Duration) error {
	return pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `
			DELETE FROM password_resets
			WHERE user_id = $1 AND used_at IS NULL`,
			userID,
		); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO password_resets (token_hash, user_id, expires_at)
			VALUES ($1, $2, now() + $3 * interval '1 second')`,
			tokenHash, userID, int64(ttl.Seconds()),
		)
		return err
	})
}

// ResetPassword consumes a valid reset token, sets the new password hash and
// ends all of the user's sessions. It returns ErrNotFound when the token is
// unknown, already used or expired.
func (s *Store) ResetPassword(ctx context.Context, tokenHash []byte, passwordHash string) (User, error) {
	var u User
	err := pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
		// FOR UPDATE locks the row: two concurrent requests with the same
		// token cannot both succeed.
		var userID string
		err := tx.QueryRow(ctx, `
			SELECT user_id
			FROM password_resets
			WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
			FOR UPDATE`,
			tokenHash,
		).Scan(&userID)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}

		if _, err := tx.Exec(ctx, `
			UPDATE password_resets SET used_at = now() WHERE token_hash = $1`,
			tokenHash,
		); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			DELETE FROM sessions WHERE user_id = $1`,
			userID,
		); err != nil {
			return err
		}
		return tx.QueryRow(ctx, `
			UPDATE users
			SET password_hash = $2, updated_at = now()
			WHERE id = $1
			RETURNING id, email, created_at`,
			userID, passwordHash,
		).Scan(&u.ID, &u.Email, &u.CreatedAt)
	})
	return u, err
}
