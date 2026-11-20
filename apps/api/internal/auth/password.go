package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"
)

const passwordPrefix = "$argon2id$v=19$m=65536,t=1,p=4$"

var hashWorkers = make(chan struct{}, 4)

func validPassword(p string) bool {
	return len(p) <= 256 && utf8.RuneCountInString(p) >= 12 && utf8.ValidString(p)
}
func derive(ctx context.Context, p string, salt []byte) ([]byte, error) {
	select {
	case hashWorkers <- struct{}{}:
		defer func() { <-hashWorkers }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	return argon2.IDKey([]byte(p), salt, 1, 64*1024, 4, 32), nil
}
func hashPassword(ctx context.Context, p string) (string, error) {
	var salt [16]byte
	rand.Read(salt[:])
	hash, err := derive(ctx, p, salt[:])
	if err != nil {
		return "", err
	}
	return passwordPrefix + base64.RawStdEncoding.EncodeToString(salt[:]) + "$" + base64.RawStdEncoding.EncodeToString(hash), nil
}
func checkPassword(ctx context.Context, p, stored string) (bool, error) {
	parts := strings.Split(strings.TrimPrefix(stored, passwordPrefix), "$")
	var salt [16]byte
	var wanted [32]byte
	valid := false
	if strings.HasPrefix(stored, passwordPrefix) && len(parts) == 2 {
		a, e1 := base64.RawStdEncoding.DecodeString(parts[0])
		b, e2 := base64.RawStdEncoding.DecodeString(parts[1])
		if e1 == nil && e2 == nil && len(a) == len(salt) && len(b) == len(wanted) {
			copy(salt[:], a)
			copy(wanted[:], b)
			valid = true
		}
	}
	// Unknown accounts go through the same bounded password calculation.
	got, err := derive(ctx, p, salt[:])
	if err != nil {
		return false, err
	}
	return subtle.ConstantTimeCompare(wanted[:], got) == 1 && valid, nil
}
