package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/mail"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Purpose string

const Verify Purpose = "verify"
const Reset Purpose = "reset"

type Mailer interface {
	Send(context.Context, string, Purpose, string) error
}
type EmailAccounts struct {
	DB         *pgxpool.Pool
	SigningKey []byte
	Mail       Mailer
}
type Profile struct {
	DisplayName string `json:"display_name"`
	PlayerID    string `json:"player_id"`
	Email       string `json:"email"`
}

func normalizeEmail(raw string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(raw))
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email || address.Name != "" || len(email) > 254 || strings.ContainsAny(email, "\r\n\x00") {
		return "", ErrInput
	}
	return email, nil
}
func (s EmailAccounts) signature(p Purpose, nonce string) string {
	mac := hmac.New(sha256.New, s.SigningKey)
	mac.Write([]byte(string(p) + "." + nonce))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
func (s EmailAccounts) validToken(p Purpose, token string) bool {
	nonce, sig, ok := strings.Cut(token, ".")
	return ok && len(nonce) == 43 && hmac.Equal([]byte(sig), []byte(s.signature(p, nonce)))
}

// Both per-mailbox and per-peer limits persist across API restarts.
func (s EmailAccounts) Limit(ctx context.Context, operation, peer, mailbox string) error {
	for _, bucket := range []struct {
		key string
		max int
	}{{"peer:" + peer, 120}, {"email:" + strings.ToLower(strings.TrimSpace(mailbox)), 10}} {
		var n int
		err := s.DB.QueryRow(ctx, `INSERT INTO f7.auth_limits AS l(bucket,attempts,expires_at)
            VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET
            attempts=CASE WHEN l.expires_at<=now() THEN 1 ELSE least(l.attempts+1,$2::integer+1) END,
            expires_at=CASE WHEN l.expires_at<=now() THEN excluded.expires_at ELSE l.expires_at END
            RETURNING attempts`, digest(operation+":"+bucket.key), bucket.max).Scan(&n)
		if err != nil {
			return err
		}
		if n > bucket.max {
			return ErrLimited
		}
		if mailbox == "" {
			break
		}
	}
	_, err := s.DB.Exec(ctx, "DELETE FROM f7.auth_limits WHERE expires_at<=now()")
	return err
}
func (s EmailAccounts) Begin(ctx context.Context, p Purpose, raw, guestToken string) error {
	email, err := normalizeEmail(raw)
	if err != nil {
		return err
	}
	var exists bool
	if err = s.DB.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM f7.email_accounts WHERE email=$1)", email).Scan(&exists); err != nil {
		return err
	}
	if (p == Verify && exists) || (p == Reset && !exists) {
		return s.Mail.Send(ctx, email, p, "")
	}
	nonce := secret()
	token := nonce + "." + s.signature(p, nonce)
	_, err = s.DB.Exec(ctx, `INSERT INTO f7.email_challenges(token_hash,email,purpose,guest_id,expires_at)
        VALUES ($1,$2,$3,(SELECT s.user_id FROM f7.sessions s JOIN f7.users u ON s.user_id=u.id
        WHERE token_hash=$4 AND s.expires_at>now() AND u.kind='development'),now()+interval '20 minutes')`, digest(token), email, p, digest(guestToken))
	if err != nil {
		return err
	}
	if err = s.Mail.Send(ctx, email, p, token); err != nil {
		_, _ = s.DB.Exec(ctx, "DELETE FROM f7.email_challenges WHERE token_hash=$1", digest(token))
		return err
	}
	_, err = s.DB.Exec(ctx, "DELETE FROM f7.email_challenges WHERE expires_at<=now()")
	return err
}
func (s EmailAccounts) Complete(ctx context.Context, p Purpose, token, password, guestToken string) (Credentials, error) {
	var none Credentials
	if !validPassword(password) {
		return none, ErrInput
	}
	if !s.validToken(p, token) {
		return none, ErrCredentials
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return none, err
	}
	defer tx.Rollback(ctx)
	// Serialize independent links to the same inbox, including reset versus reset.
	var email string
	if err = tx.QueryRow(ctx, "SELECT email FROM f7.email_challenges WHERE token_hash=$1 AND purpose=$2 AND expires_at>now()", digest(token), p).Scan(&email); err != nil {
		return none, authError(err)
	}
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1,0))", email); err != nil {
		return none, err
	}
	var guest *string
	err = tx.QueryRow(ctx, "DELETE FROM f7.email_challenges WHERE token_hash=$1 AND purpose=$2 AND expires_at>clock_timestamp() RETURNING guest_id::text", digest(token), p).Scan(&guest)
	if err != nil {
		return none, authError(err)
	}
	hash, err := hashPassword(ctx, password)
	if err != nil {
		return none, err
	}
	var user string
	switch p {
	case Verify:
		if guest != nil && guestToken != "" {
			err = tx.QueryRow(ctx, `UPDATE f7.users SET kind='account' WHERE id=$1 AND kind='development' AND EXISTS(
                SELECT 1 FROM f7.sessions WHERE user_id=$1 AND token_hash=$2 AND expires_at>now()) RETURNING id::text`, *guest, digest(guestToken)).Scan(&user)
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				return none, err
			}
		}
		if user == "" {
			if err = tx.QueryRow(ctx, "INSERT INTO f7.users(kind) VALUES('account') RETURNING id::text").Scan(&user); err != nil {
				return none, err
			}
		}
		if _, err = tx.Exec(ctx, "INSERT INTO f7.email_accounts(user_id,email,password_hash) VALUES ($1,$2,$3)", user, email, hash); err != nil {
			return none, authError(err)
		}
		if _, err = tx.Exec(ctx, "DELETE FROM f7.sessions WHERE user_id=$1", user); err != nil {
			return none, err
		}
	case Reset:
		err = tx.QueryRow(ctx, "UPDATE f7.email_accounts SET password_hash=$2 WHERE email=$1 RETURNING user_id::text", email, hash).Scan(&user)
		if err != nil {
			return none, authError(err)
		}
		if _, err = tx.Exec(ctx, "DELETE FROM f7.account_sessions WHERE user_id=$1", user); err != nil {
			return none, err
		}
	default:
		return none, ErrInput
	}
	if _, err = tx.Exec(ctx, "DELETE FROM f7.email_challenges WHERE email=$1", email); err != nil {
		return none, err
	}
	c, err := issue(ctx, tx, user)
	if err != nil {
		return none, err
	}
	return c, tx.Commit(ctx)
}
func authError(err error) error {
	var e *pgconn.PgError
	if errors.Is(err, pgx.ErrNoRows) || (errors.As(err, &e) && e.Code == "23505") {
		return ErrCredentials
	}
	return err
}
func (s EmailAccounts) Login(ctx context.Context, raw, password string) (Credentials, error) {
	var none Credentials
	email, err := normalizeEmail(raw)
	if err != nil || len(password) > 256 {
		return none, ErrCredentials
	}
	var hash string
	err = s.DB.QueryRow(ctx, "SELECT password_hash FROM f7.email_accounts WHERE email=$1", email).Scan(&hash)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return none, err
	}
	ok, err := checkPassword(ctx, password, hash)
	if err != nil {
		return none, err
	}
	if !ok {
		return none, ErrCredentials
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return none, err
	}
	defer tx.Rollback(ctx)
	var id string
	// A password reset that won the race must invalidate this login attempt.
	err = tx.QueryRow(ctx, "SELECT user_id::text FROM f7.email_accounts WHERE email=$1 AND password_hash=$2 FOR SHARE", email, hash).Scan(&id)
	if err != nil {
		return none, authError(err)
	}
	c, err := issue(ctx, tx, id)
	if err != nil {
		return none, err
	}
	return c, tx.Commit(ctx)
}
func (s EmailAccounts) Profile(ctx context.Context, user string) (Profile, error) {
	p := Profile{PlayerID: user}
	err := s.DB.QueryRow(ctx, `SELECT a.email,coalesce(p.display_name,'') FROM f7.email_accounts a LEFT JOIN f7.player_profiles p USING(user_id) WHERE a.user_id=$1`, user).Scan(&p.Email, &p.DisplayName)
	return p, authError(err)
}
