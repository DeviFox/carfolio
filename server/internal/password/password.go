// Package password hashes and verifies passwords with argon2id.
//
// Hashes are stored in the PHC string format, which carries its own
// parameters and salt:
//
//	$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
//
// so the parameters below can be raised later without breaking old hashes.
package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// OWASP minimum recommendation for argon2id.
const (
	memoryKiB  = 19 * 1024
	iterations = 2
	threads    = 1
	saltLen    = 16
	keyLen     = 32
)

var ErrMalformedHash = errors.New("password: malformed hash")

var b64 = base64.RawStdEncoding

func Hash(password string) (string, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(password), salt, iterations, memoryKiB, threads, keyLen)

	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, memoryKiB, iterations, threads,
		b64.EncodeToString(salt), b64.EncodeToString(key)), nil
}

// Verify reports whether password matches the encoded hash.
func Verify(password, encoded string) (bool, error) {
	// "", "argon2id", "v=19", "m=...,t=...,p=...", salt, hash
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, ErrMalformedHash
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false, ErrMalformedHash
	}

	var memory, time uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &parallelism); err != nil {
		return false, ErrMalformedHash
	}

	salt, err := b64.DecodeString(parts[4])
	if err != nil {
		return false, ErrMalformedHash
	}
	want, err := b64.DecodeString(parts[5])
	if err != nil {
		return false, ErrMalformedHash
	}

	got := argon2.IDKey([]byte(password), salt, time, memory, parallelism, uint32(len(want)))
	// Constant-time comparison: response time must not leak how many bytes matched.
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}
