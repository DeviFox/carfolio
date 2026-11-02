-- +goose Up
-- One-time password reset links. As with sessions, only sha256(token) is stored.
CREATE TABLE password_resets (
    token_hash bytea       PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used_at    timestamptz
);

CREATE INDEX password_resets_user_id_idx ON password_resets (user_id);

-- +goose Down
DROP TABLE password_resets;
