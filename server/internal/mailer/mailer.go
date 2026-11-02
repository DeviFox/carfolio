// Package mailer sends transactional email.
//
// Handlers depend on the Mailer interface, not on a concrete provider:
// locally messages go to the log, in production an SMTP or API-based
// implementation can be plugged in without touching the handlers.
package mailer

import (
	"context"
	"log/slog"
)

type Message struct {
	To      string
	Subject string
	Body    string // plain text
}

type Mailer interface {
	Send(ctx context.Context, msg Message) error
}

// Log writes messages to the log instead of sending them.
type Log struct {
	Logger *slog.Logger
}

func (m Log) Send(_ context.Context, msg Message) error {
	m.Logger.Info("email (not sent, log mailer)",
		"to", msg.To, "subject", msg.Subject, "body", msg.Body)
	return nil
}
