// Package auth resolves session credentials to a player identity.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DevelopmentSessions struct{ DB *pgxpool.Pool }

func (s DevelopmentSessions) Create(ctx context.Context) (string, error) {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(secret)
	hash := sha256.Sum256([]byte(token))
	_, err := s.DB.Exec(ctx, `WITH p AS (INSERT INTO f7.users(kind) VALUES ('development') RETURNING id)
 INSERT INTO f7.sessions(token_hash,user_id,expires_at) SELECT $1,id,now()+interval '30 days' FROM p`, hash[:])
	return token, err
}
func (s DevelopmentSessions) Player(ctx context.Context, token string) (string, error) {
	hash := sha256.Sum256([]byte(token))
	var id string
	err := s.DB.QueryRow(ctx, `SELECT u.id::text FROM f7.sessions s JOIN f7.users u ON u.id=s.user_id
 WHERE token_hash=$1 AND expires_at>now() AND u.kind='development'`, hash[:]).Scan(&id)
	return id, err
}
