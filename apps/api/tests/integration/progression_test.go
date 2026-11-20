//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/barbodimani81/mokestoon/apps/api/internal/auth"
	"github.com/barbodimani81/mokestoon/apps/api/internal/economy"
	"github.com/barbodimani81/mokestoon/apps/api/internal/health"
	httpapi "github.com/barbodimani81/mokestoon/apps/api/internal/http"
	"github.com/barbodimani81/mokestoon/apps/api/internal/platform"
)

func TestPlaytestProgression(t *testing.T) {
	ctx := context.Background()
	db, err := platform.OpenDatabase(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	const origin = "http://127.0.0.1:5173"
	sessions := auth.DevelopmentSessions{DB: db}
	store := economy.Store{DB: db, Catalog: economy.PlaytestCatalog()}
	t.Setenv("F7_PLAYTEST", "1")
	t.Setenv("APP_ENV", "local")
	t.Setenv("PUBLIC_WEB_ORIGIN", origin)
	h, err := httpapi.Playtest(httpapi.Router(health.Probe{DB: db}), store, "127.0.0.1:8080")
	if err != nil {
		t.Fatal(err)
	}
	call := func(cookie *http.Cookie, player, path, body, from string) *httptest.ResponseRecorder {
		method := "GET"
		if body != "" {
			method = "POST"
		}
		r := httptest.NewRequest(method, origin+"/api/v1/"+path, strings.NewReader(body))
		r.RemoteAddr = "127.0.0.1:31337"
		r.Header.Set("Origin", from)
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-F7-Player", player)
		if cookie != nil {
			r.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	if call(nil, "", "development/session", "{}", "http://example.invalid").Code != 403 || call(nil, "", "players/me", "", origin).Code != 401 {
		t.Fatal("missing origin or authentication checks")
	}
	login := func() (*http.Cookie, string) {
		w := call(nil, "", "development/session", "{}", origin)
		if w.Code != 204 {
			t.Fatalf("login %d %s", w.Code, w.Body.String())
		}
		c := w.Result().Cookies()[0]
		if !c.HttpOnly || c.SameSite != http.SameSiteStrictMode {
			t.Fatal("session cookie")
		}
		id, err := sessions.Player(ctx, c.Value)
		if err != nil {
			t.Fatal(err)
		}
		return c, id
	}
	c, id := login()
	other, otherID := login()
	if call(other, id, "game-events/batch", `{"events":[]}`, origin).Code != 409 {
		t.Fatal("player precondition")
	}
	if call(c, id, "purchases", `{"unlock_id":"object.tv","cost_faaz":0}`, origin).Code != 400 {
		t.Fatal("accepted client price")
	}
	if _, err = db.Exec(ctx, "UPDATE f7.users SET created_at=now()-interval '1 hour' WHERE id=$1", id); err != nil {
		t.Fatal(err)
	}
	data := func(id string, req string) string {
		return `{"events":[{"event_id":"` + id + `","request_id":"` + req + `","character_id":"barbod","activity_id":"snack","duration_ticks":25}]}`
	}
	const first = "12000000-1111-4000-8000-111111111111"
	const second = "22000000-1111-4000-8000-111111111111"
	const requestA = "33000000-1111-4000-8000-111111111111"
	const requestB = "44000000-1111-4000-8000-111111111111"
	fast := call(other, otherID, "game-events/batch", data(first, requestA), origin)
	if fast.Code != 200 || !strings.Contains(fast.Body.String(), "rejected") {
		t.Fatal("impossible duration for a new player")
	}
	for _, invalid := range []string{
		strings.Replace(data(first, requestA), "barbod", "parsa", 1),
		strings.Replace(data(first, requestA), ":25", ":24", 1),
		strings.Replace(data(first, requestA), "snack", "unknown", 1),
	} {
		if !strings.Contains(call(c, id, "game-events/batch", invalid, origin).Body.String(), "rejected") {
			t.Fatal("accepted impossible completion")
		}
	}
	claim := func(e, r string) string {
		w := call(c, id, "game-events/batch", data(e, r), origin)
		if w.Code != 200 {
			t.Fatal(w.Body.String())
		}
		return w.Body.String()
	}
	if !strings.Contains(claim(first, requestA), `"amount_faaz":5`) || !strings.Contains(claim(first, requestA), `"amount_faaz":5`) || !strings.Contains(claim(second, requestA), "conflict") {
		t.Fatal("reward retries")
	}
	claim(second, requestB)
	purchase := func(key, item string) int {
		return call(c, id, "purchases", `{"idempotency_key":"`+key+`","unlock_id":"`+item+`"}`, origin).Code
	}
	const buy = "55000000-1111-4000-8000-111111111111"
	if purchase(buy, "activity.ps4") != 422 {
		t.Fatal("prerequisite / balance")
	}
	var wg sync.WaitGroup
	codes := make(chan int, 4)
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); codes <- purchase(buy, "object.tv") }()
	}
	wg.Wait()
	close(codes)
	for code := range codes {
		if code != 200 {
			t.Fatalf("purchase retry %d", code)
		}
	}
	if purchase(buy, "activity.ps4") != 409 {
		t.Fatal("key reused")
	}
	var receipt economy.PurchaseResult
	result := call(c, id, "purchases", `{"idempotency_key":"`+buy+`","unlock_id":"object.tv"}`, origin)
	if err = json.Unmarshal(result.Body.Bytes(), &receipt); err != nil || receipt.PurchaseID != buy || receipt.UnlockID != "object.tv" || receipt.PurchasedAt.IsZero() {
		t.Fatal("invalid purchase confirmation", err)
	}
	var s economy.State
	if err := json.Unmarshal(call(c, id, "players/me", "", origin).Body.Bytes(), &s); err != nil || s.Faaz != 0 || s.Score != 6 || len(s.Unlocks) != 1 {
		t.Fatalf("ledger %+v %v", s, err)
	}
	var page economy.History
	getPage := func(path string) {
		t.Helper()
		w := call(c, id, "players/me/wallet/transactions?"+path, "", origin)
		page = economy.History{}
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &page) != nil {
			t.Fatalf("wallet history %d %s", w.Code, w.Body.String())
		}
	}
	getPage("limit=1")
	if len(page.Transactions) != 1 || page.Transactions[0].Amount != -10 || page.Next != buy {
		t.Fatalf("purchase history %+v", page)
	}
	getPage("cursor=" + page.Next)
	if len(page.Transactions) != 2 || page.Transactions[0].Amount != 5 || page.Transactions[1].Amount != 5 || page.Next != "" {
		t.Fatalf("reward history %+v", page)
	}
	if w := call(c, id, "players/me/wallet/transactions?limit=101", "", origin); w.Code != 422 {
		t.Fatal("unbounded pagination")
	}
	if w := call(c, id, "players/me/unlocks", "", origin); !strings.Contains(w.Body.String(), "object.tv") {
		t.Fatal("missing unlock")
	}
	// At 15 Faaz a player can afford the PS4 but still needs the TV.
	if _, err = db.Exec(ctx, "UPDATE f7.users SET created_at=now()-interval '1 hour' WHERE id=$1", otherID); err != nil {
		t.Fatal(err)
	}
	for _, suffix := range []string{"1", "2", "3"} {
		reward := data("aa000000-1111-4000-8000-11111111111"+suffix, "bb000000-1111-4000-8000-11111111111"+suffix)
		if !strings.Contains(call(other, otherID, "game-events/batch", reward, origin).Body.String(), "accepted") {
			t.Fatal("setup balance")
		}
	}
	if call(other, otherID, "purchases", `{"idempotency_key":"`+buy+`","unlock_id":"activity.ps4"}`, origin).Code != 422 {
		t.Fatal("skipped prerequisite")
	}
	if err := json.Unmarshal(call(other, otherID, "players/me", "", origin).Body.Bytes(), &s); err != nil || s.Faaz != 15 || s.Score != 9 || len(s.Unlocks) != 0 {
		t.Fatal("player isolation")
	}
	if _, err = db.Exec(ctx, "UPDATE f7.sessions SET expires_at=now() WHERE user_id=$1", id); err != nil {
		t.Fatal(err)
	}
	if call(c, id, "players/me", "", origin).Code != 401 {
		t.Fatal("expired session")
	}
	t.Setenv("APP_ENV", "production")
	if _, err = httpapi.Playtest(h, store, "127.0.0.1:8080"); err == nil {
		t.Fatal("development access in production")
	}
}
