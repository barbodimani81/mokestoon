package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const AccessLifetime = 15 * time.Minute
const SessionLifetime = 30 * 24 * time.Hour

var ErrCredentials = errors.New("invalid or expired credentials")
var ErrInput = errors.New("invalid input")
var ErrLimited = errors.New("too many attempts")

type Sessions struct{ DB *pgxpool.Pool }
type Credentials struct {
	Access, Refresh string
	Expires         time.Time
}

func secret() string {
	var b [32]byte
	rand.Read(b[:])
	return base64.RawURLEncoding.EncodeToString(b[:])
}
func digest(s string) []byte { h := sha256.Sum256([]byte(s)); return h[:] }

// The stable random prefix can only revoke this session. Authentication and
// rotation require the hash of the entire, current refresh credential.
func newCredentials(revocation string) Credentials {
	return Credentials{Access: secret(), Refresh: revocation + "." + secret()}
}
func issue(ctx context.Context, tx pgx.Tx, user string) (Credentials, error) {
	revocation := secret()
	c := newCredentials(revocation)
	err := tx.QueryRow(ctx, `INSERT INTO f7.account_sessions(user_id,access_hash,refresh_hash,access_expires_at,expires_at,revocation_hash) VALUES ($1,$2,$3,now()+$4*interval '1 second',now()+$5*interval '1 second',$6) RETURNING expires_at`, user, digest(c.Access), digest(c.Refresh), int(AccessLifetime.Seconds()), int(SessionLifetime.Seconds()), digest(revocation)).Scan(&c.Expires)
	return c, err
}
func (s Sessions) Player(ctx context.Context, access string) (string, error) {
	var id string
	err := s.DB.QueryRow(ctx, "SELECT user_id::text FROM f7.account_sessions WHERE access_hash=$1 AND access_expires_at>now()", digest(access)).Scan(&id)
	return id, err
}
func (s Sessions) Rotate(ctx context.Context, refresh string) (Credentials, error) {
	revocation, _, ok := strings.Cut(refresh, ".")
	if !ok || len(revocation) != 43 {
		return Credentials{}, ErrCredentials
	}
	c := newCredentials(revocation)
	err := s.DB.QueryRow(ctx, `UPDATE f7.account_sessions SET refresh_hash=$2,access_hash=$3,access_expires_at=least(expires_at,now()+$4*interval '1 second')
       WHERE refresh_hash=$1 AND expires_at>now() RETURNING expires_at`, digest(refresh), digest(c.Refresh), digest(c.Access), int(AccessLifetime.Seconds())).Scan(&c.Expires)
	if errors.Is(err, pgx.ErrNoRows) {
		err = ErrCredentials
	}
	return c, err
}
func (s Sessions) Revoke(ctx context.Context, access, refresh string) error {
	revocation, _, _ := strings.Cut(refresh, ".")
	_, err := s.DB.Exec(ctx, "DELETE FROM f7.account_sessions WHERE revocation_hash=$1 OR access_hash=$2", digest(revocation), digest(access))
	return err
}
