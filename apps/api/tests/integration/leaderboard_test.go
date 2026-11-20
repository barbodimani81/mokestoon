//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/barbodimani81/mokestoon/apps/api/internal/leaderboard"
	"github.com/barbodimani81/mokestoon/apps/api/internal/platform"
	"github.com/jackc/pgx/v5"
)

func TestAuthorizedStandings(t *testing.T) {
	ctx := context.Background()
	db, err := platform.OpenDatabase(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	tx, err := db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	run := func(q string, args ...any) {
		t.Helper()
		if _, e := tx.Exec(ctx, q, args...); e != nil {
			t.Fatal(e)
		}
	}
	create := func(kind, name string) string {
		t.Helper()
		var id string
		if e := tx.QueryRow(ctx, "INSERT INTO f7.users(kind) VALUES($1) RETURNING id::text", kind).Scan(&id); e != nil {
			t.Fatal(e)
		}
		if name != "" {
			run("INSERT INTO f7.player_profiles(user_id,display_name) VALUES($1,$2)", id, name)
		}
		return id
	}
	score := func(id string, points int) {
		t.Helper()
		var event string
		if e := tx.QueryRow(ctx, "INSERT INTO f7.progress_events(user_id,id,kind,reason) VALUES($1,gen_random_uuid(),'request_completed','test') RETURNING id::text", id).Scan(&event); e != nil {
			t.Fatal(e)
		}
		run("INSERT INTO f7.score_transactions(user_id,event_id,points) VALUES($1,$2,$3)", id, event, points)
		run("INSERT INTO f7.wallet_transactions(user_id,event_id,amount) VALUES($1,$2,5)", id, event)
	}
	first, second, third, zero := create("account", "North"), create("account", "West"), create("account", "East"), create("account", "")
	guest, outsider := create("development", "Guest"), create("account", "Outside")
	score(first, 6)
	score(first, 3)
	score(second, 9)
	score(third, 3)
	score(guest, 100)
	score(outsider, 100)
	allowed := []string{zero, second, third, first, guest, third}
	get := func(ids []string, limit int, cursor string) leaderboard.Page {
		t.Helper()
		r, e := leaderboard.ReadPage(ctx, tx, ids, limit, cursor)
		if e != nil {
			t.Fatal(e)
		}
		return r
	}
	if page := get(nil, 10, ""); len(page.Entries) != 0 || page.Next != "" {
		t.Fatal("empty authorization exposed standings")
	}
	page := get(allowed, 1, "")
	if len(page.Entries) != 1 || page.Entries[0].Rank != 1 || page.Entries[0].Score != 9 || page.Next == "" {
		t.Fatal("first page", page)
	}
	if first > second {
		first, second = second, first
	}
	var expected string
	if e := tx.QueryRow(ctx, "SELECT display_name FROM f7.player_profiles WHERE user_id=$1", first).Scan(&expected); e != nil {
		t.Fatal(e)
	}
	if *page.Entries[0].DisplayName != expected {
		t.Fatal("unstable order within tie")
	}
	// A purchase affects the wallet only, and must not invalidate a score page.
	run(`WITH event AS(INSERT INTO f7.progress_events(user_id,id,kind,reason) VALUES($1,gen_random_uuid(),'purchase','object.tv') RETURNING user_id,id)
         INSERT INTO f7.wallet_transactions SELECT user_id,id,-5 FROM event`, first)
	tail := get(allowed, 3, page.Next)
	if len(tail.Entries) != 3 || tail.Next != "" || tail.Entries[0].Rank != 1 || *tail.Entries[0].DisplayName == expected ||
		tail.Entries[1].Rank != 3 || tail.Entries[1].Score != 3 || tail.Entries[2].Rank != 4 || tail.Entries[2].Score != 0 || tail.Entries[2].DisplayName != nil {
		t.Fatalf("ranks %+v", tail)
	}
	raw, _ := json.Marshal(page)
	for _, private := range append(append([]string{}, allowed...), outsider, "user_id", "email", "faaz") {
		if strings.Contains(string(raw), private) {
			t.Fatal("private information in page")
		}
	}
	for _, bad := range []string{"oops", page.Next + "x", strings.Repeat("g", 64) + ".1"} {
		if _, err = leaderboard.ReadPage(ctx, tx, allowed, 10, bad); !errors.Is(err, leaderboard.ErrPage) {
			t.Fatal("invalid cursor", err)
		}
	}
	for _, limit := range []int{0, 101} {
		if _, err = leaderboard.ReadPage(ctx, tx, allowed, limit, ""); !errors.Is(err, leaderboard.ErrPage) {
			t.Fatal("invalid limit", err)
		}
	}
	if _, err = leaderboard.ReadPage(ctx, tx, []string{first}, 2, page.Next); !errors.Is(err, leaderboard.ErrChanged) {
		t.Fatal("cursor survived audience change")
	}
	score(third, 12)
	if _, err = leaderboard.ReadPage(ctx, tx, allowed, 2, page.Next); !errors.Is(err, leaderboard.ErrChanged) {
		t.Fatal("stale score page accepted")
	}
	updated := get(allowed, 100, "")
	if len(updated.Entries) != 4 || updated.Entries[0].Score != 15 || updated.Entries[0].Rank != 1 {
		t.Fatal("fresh ranking")
	}
}

func TestLeaderboardRequiresServerVisibility(t *testing.T) {
	ctx := context.Background()
	db, err := platform.OpenDatabase(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	board := leaderboard.Board{DB: db}
	if _, err = board.ForViewer(ctx, "", leaderboard.Scope{Kind: "global"}, 1, ""); !errors.Is(err, leaderboard.ErrUnavailable) {
		t.Fatal("missing policy must deny")
	}
	var account string
	if err = db.QueryRow(ctx, "INSERT INTO f7.users(kind) VALUES('account') RETURNING id::text").Scan(&account); err != nil {
		t.Fatal(err)
	}
	// Stand-in for an approved policy. Only this test viewer may read this account.
	board.Visible = func(ctx context.Context, tx pgx.Tx, viewer string, scope leaderboard.Scope) ([]string, error) {
		if viewer != account || scope.Kind != "group" {
			return nil, leaderboard.ErrUnavailable
		}
		var id string
		err := tx.QueryRow(ctx, "SELECT id::text FROM f7.users WHERE id=$1 AND kind='account'", viewer).Scan(&id)
		return []string{id}, err
	}
	page, err := board.ForViewer(ctx, account, leaderboard.Scope{Kind: "group"}, 1, "")
	if err != nil || len(page.Entries) != 1 || page.Entries[0].Score != 0 {
		t.Fatal("approved read failed", err)
	}
	if _, err = board.ForViewer(ctx, "unrelated", leaderboard.Scope{Kind: "group"}, 1, ""); !errors.Is(err, leaderboard.ErrUnavailable) {
		t.Fatal("unapproved viewer")
	}
}
