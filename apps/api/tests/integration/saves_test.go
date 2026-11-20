//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/barbodimani81/mokestoon/apps/api/internal/auth"
	"github.com/barbodimani81/mokestoon/apps/api/internal/economy"
	httpapi "github.com/barbodimani81/mokestoon/apps/api/internal/http"
	"github.com/barbodimani81/mokestoon/apps/api/internal/platform"
	"github.com/barbodimani81/mokestoon/apps/api/internal/saves"
)

func TestSaveValidationOwnershipAndConcurrentReplacement(t *testing.T) {
	ctx := context.Background()
	db, err := platform.OpenDatabase(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	sessions := auth.DevelopmentSessions{DB: db}
	store := economy.Store{DB: db, Catalog: economy.PlaytestCatalog()}
	const origin = "http://127.0.0.1:5173"
	t.Setenv("F7_PLAYTEST", "1")
	t.Setenv("APP_ENV", "local")
	t.Setenv("PUBLIC_WEB_ORIGIN", origin)
	handler, err := httpapi.Playtest(http.NotFoundHandler(), store, "127.0.0.1:8080")
	if err != nil {
		t.Fatal(err)
	}
	session := func() (string, string) {
		token, err := sessions.Create(ctx)
		if err != nil {
			t.Fatal(err)
		}
		user, err := sessions.Player(ctx, token)
		if err != nil {
			t.Fatal(err)
		}
		return token, user
	}
	token, user := session()
	other, otherUser := session()
	send := func(method, token, user, requestOrigin string, raw []byte) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, origin+"/api/v1/players/me/save", bytes.NewReader(raw))
		r.RemoteAddr = "127.0.0.1:4444"
		r.Header.Set("Origin", requestOrigin)
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-F7-Player", user)
		r.AddCookie(&http.Cookie{Name: "f7_playtest", Value: token})
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	residents := map[string]any{}
	for i, id := range []string{"barbod", "kavian", "mahan", "parsa", "parham"} {
		residents[id] = map[string]any{"position": map[string]any{"x": 500 + i*20, "y": 500}, "fatigue": 0, "nextAmbient": 100}
	}
	payload := map[string]any{"ticks": 120, "nextRequest": 130, "requestCount": 1, "seed": 42, "dishes": 2, "clutter": 1, "tvReady": false, "ps4Ready": false, "residents": residents}
	update := func(expected int64) []byte {
		b, err := json.Marshal(map[string]any{"expected_version": expected, "schema_version": 1, "payload": payload})
		if err != nil {
			t.Fatal(err)
		}
		return b
	}
	check := func(w *httptest.ResponseRecorder, code int) {
		t.Helper()
		if w.Code != code {
			t.Fatalf("wanted %d got %d %s", code, w.Code, w.Body.String())
		}
	}
	get := func(token, user string) *httptest.ResponseRecorder { return send("GET", token, user, origin, nil) }
	put := func(raw []byte) *httptest.ResponseRecorder { return send("PUT", token, user, origin, raw) }
	check(get("", user), 401)
	check(get(token, user), 404)
	check(send("PUT", token, user, "http://example.invalid", update(0)), 403)
	check(send("PUT", other, user, origin, update(0)), 409)
	jelly := map[string]any{"id": "22000000-1111-4000-8000-111111111111", "friend": "parsa", "activity": "jelly_eat", "status": "cooling", "deadline": 100}
	payload["request"] = jelly
	check(put(update(0)), 422)
	jelly["readyAt"] = 175
	for _, key := range []string{"faaz", "f7_score", "unlocks"} {
		payload[key] = 42
		check(put(update(0)), 422)
		delete(payload, key)
	}
	check(put(bytes.Replace(update(0), []byte(`"schema_version":1`), []byte(`"schema_version":2`), 1)), 422)
	check(put(bytes.Replace(update(0), []byte(`"fatigue":0`), []byte(`"fatigue":120`), 1)), 422)
	check(put(bytes.Replace(update(0), []byte(`"residents":`), []byte(`"residents":"`+strings.Repeat("a", 33000)+`","x":`), 1)), 400)
	check(put(update(1)), 409)
	check(put(update(0)), 200)
	check(put(update(0)), 409)
	check(get(other, otherUser), 404)
	check(get(other, user), 409)
	writes := make(chan *httptest.ResponseRecorder, 2)
	one, two := update(1), bytes.Replace(update(1), []byte(`"dishes":2`), []byte(`"dishes":0`), 1)
	go func() { writes <- put(one) }()
	go func() { writes <- put(two) }()
	a, b := <-writes, <-writes
	if a.Code == 409 {
		a, b = b, a
	}
	check(a, 200)
	check(b, 409)
	var winner, got saves.Checkpoint
	if err = json.Unmarshal(a.Body.Bytes(), &winner); err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(get(token, user).Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	dishes := func(payload json.RawMessage) int {
		var c struct {
			Dishes int `json:"dishes"`
		}
		if err := json.Unmarshal(payload, &c); err != nil {
			t.Fatal(err)
		}
		return c.Dishes
	}
	if got.Version != 2 || got.Schema != 1 || got.Updated.IsZero() || dishes(got.Payload) != dishes(winner.Payload) {
		t.Fatal("stale write changed the checkpoint")
	}
}
