//go:build integration

package integration

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"testing"

	"github.com/barbodimani81/mokestoon/apps/api/internal/auth"
	"github.com/barbodimani81/mokestoon/apps/api/internal/platform"
	"github.com/barbodimani81/mokestoon/apps/api/internal/players"
	"github.com/jackc/pgx/v5"
)

type mailbox struct{ token string }

func (m *mailbox) Send(_ context.Context, _ string, _ auth.Purpose, token string) error {
	m.token = token
	return nil
}
func randomText() string { var b [20]byte; rand.Read(b[:]); return hex.EncodeToString(b[:]) }

func TestVerifiedAccountsAndSessionLifecycle(t *testing.T) {
	ctx := context.Background()
	db, err := platform.OpenDatabase(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	inbox := new(mailbox)
	service := auth.EmailAccounts{DB: db, Mail: inbox, SigningKey: []byte(randomText())}
	sessions := auth.Sessions{DB: db}
	guests := auth.DevelopmentSessions{DB: db}
	guest, err := guests.Create(ctx)
	if err != nil {
		t.Fatal(err)
	}
	guestID, err := guests.Player(ctx, guest)
	if err != nil {
		t.Fatal(err)
	}
	email := randomText() + "@example.test"
	password := randomText()
	if err = service.Begin(ctx, auth.Verify, email, guest); err != nil {
		t.Fatal(err)
	}
	token := inbox.token
	if _, err = service.Login(ctx, email, password); !errors.Is(err, auth.ErrCredentials) {
		t.Fatal("unverified sign-in")
	}
	if _, err = service.Complete(ctx, auth.Reset, token, password, guest); !errors.Is(err, auth.ErrCredentials) {
		t.Fatal("accepted token for wrong purpose")
	}
	creds, err := service.Complete(ctx, auth.Verify, token, password, guest)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = service.Complete(ctx, auth.Verify, token, password, guest); !errors.Is(err, auth.ErrCredentials) {
		t.Fatal("reused verification")
	}
	if _, err = guests.Player(ctx, guest); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("guest remains valid")
	}
	id, err := sessions.Player(ctx, creds.Access)
	if err != nil || id != guestID {
		t.Fatal("guest progression lost", err)
	}
	p, err := service.Profile(ctx, id)
	if err != nil || p.Email != email {
		t.Fatal("profile mismatch", err)
	}
	profiles := players.Profiles{DB: db}
	if err = profiles.SetName(ctx, id, strings.Repeat("x", 33)); !errors.Is(err, players.ErrName) {
		t.Fatal("name length limit")
	}
	if err = profiles.SetName(ctx, id, "MixEd"); err != nil {
		t.Fatal(err)
	}
	other, err := guests.Create(ctx)
	if err != nil {
		t.Fatal(err)
	}
	otherID, err := guests.Player(ctx, other)
	if err != nil {
		t.Fatal(err)
	}
	if err = profiles.SetName(ctx, otherID, "mixed"); !errors.Is(err, players.ErrTaken) {
		t.Fatal("case-insensitive playtest name constraint")
	}
	if err = profiles.SetName(ctx, id, ""); err != nil {
		t.Fatal(err)
	}
	another, err := service.Login(ctx, strings.ToUpper(email), password)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(ctx, "UPDATE f7.account_sessions SET access_expires_at=now()-interval '1 second' WHERE user_id=$1", id)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = sessions.Player(ctx, creds.Access); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("accepted expired access")
	}
	type rotation struct {
		c   auth.Credentials
		err error
	}
	results := make(chan rotation, 2)
	for i := 0; i < 2; i++ {
		go func() { c, e := sessions.Rotate(ctx, creds.Refresh); results <- rotation{c, e} }()
	}
	a, b := <-results, <-results
	if a.err != nil {
		a, b = b, a
	}
	if a.err != nil || !errors.Is(b.err, auth.ErrCredentials) {
		t.Fatal("refresh must rotate once")
	}
	if got, e := sessions.Player(ctx, a.c.Access); e != nil || got != id {
		t.Fatal("rotation changed owner", e)
	}
	if err = sessions.Revoke(ctx, creds.Access, creds.Refresh); err != nil {
		t.Fatal(err)
	}
	if _, err = sessions.Rotate(ctx, a.c.Refresh); !errors.Is(err, auth.ErrCredentials) {
		t.Fatal("logged-out refresh")
	}
	if err = service.Begin(ctx, auth.Reset, email, ""); err != nil {
		t.Fatal(err)
	}
	newPassword := randomText()
	recovered, err := service.Complete(ctx, auth.Reset, inbox.token, newPassword, "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = sessions.Rotate(ctx, another.Refresh); !errors.Is(err, auth.ErrCredentials) {
		t.Fatal("old session survived password reset")
	}
	if _, err = service.Login(ctx, email, password); !errors.Is(err, auth.ErrCredentials) {
		t.Fatal("old password accepted")
	}
	if got, e := sessions.Player(ctx, recovered.Access); got != id || e != nil {
		t.Fatal("recovery changed user", e)
	}
	if _, err = service.Login(ctx, email, newPassword); err != nil {
		t.Fatal(err)
	}
	if err = service.Begin(ctx, auth.Reset, email, ""); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, "UPDATE f7.email_challenges SET expires_at=now() WHERE email=$1", email); err != nil {
		t.Fatal(err)
	}
	if _, err = service.Complete(ctx, auth.Reset, inbox.token, password, ""); !errors.Is(err, auth.ErrCredentials) {
		t.Fatal("expired recovery link accepted")
	}
	for i := 0; i < 10; i++ {
		if err = service.Limit(ctx, "login", "127.0.0.1", email); err != nil {
			t.Fatal(err)
		}
	}
	if err = service.Limit(ctx, "login", "127.0.0.1", email); !errors.Is(err, auth.ErrLimited) {
		t.Fatal("rate limit")
	}
}
