// Package migrations embeds the SQL migration files into the server binary,
// so a deploy is a single file with no migrations directory to ship.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
