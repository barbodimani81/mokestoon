package httpapi

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/barbodimani81/mokestoon/apps/api/internal/auth"
	"github.com/barbodimani81/mokestoon/apps/api/internal/economy"
	"github.com/barbodimani81/mokestoon/apps/api/internal/leaderboard"
	"github.com/barbodimani81/mokestoon/apps/api/internal/saves"
	"github.com/jackc/pgx/v5"
)

const devCookie = "f7_playtest"

type progressAPI struct {
	accounts *accountAPI
	sessions auth.DevelopmentSessions
	store    economy.Store
	origin   string
	host     string
}

func Playtest(handler http.Handler, store economy.Store, listen string) (http.Handler, error) {
	method := os.Getenv("F7_AUTH_METHOD")
	if method != "" && (method != "email" || os.Getenv("F7_PLAYTEST") != "1") {
		return nil, errors.New("F7_AUTH_METHOD=email requires the local playtest")
	}
	if os.Getenv("F7_PLAYTEST") != "1" {
		return handler, nil
	}
	host, _, err := net.SplitHostPort(listen)
	if err != nil || !net.ParseIP(host).IsLoopback() || os.Getenv("APP_ENV") != "local" {
		return nil, errors.New("playtest requires APP_ENV=local and a loopback listen address")
	}
	origin := os.Getenv("PUBLIC_WEB_ORIGIN")
	if origin == "" {
		origin = "http://127.0.0.1:5173"
	}
	u, err := url.Parse(origin)
	if err != nil || u.Scheme != "http" || (!net.ParseIP(u.Hostname()).IsLoopback() && u.Hostname() != "localhost") || u.User != nil || origin != "http://"+u.Host {
		return nil, errors.New("playtest requires an exact loopback web origin")
	}
	api := progressAPI{sessions: auth.DevelopmentSessions{DB: store.DB}, store: store, origin: origin, host: u.Host}
	mux := http.NewServeMux()
	mux.Handle("/", handler)
	register := func(pattern string, fn http.HandlerFunc) {
		mux.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil || !net.ParseIP(ip).IsLoopback() || r.Host != api.host || (r.Method != "GET" && r.Method != "HEAD" && r.Header.Get("Origin") != api.origin) {
				problem(w, 403, "FORBIDDEN", "Local origin required")
				return
			}
			w.Header().Set("Cache-Control", "no-store")
			fn(w, r)
		})
	}
	if method == "email" {
		key, err := hex.DecodeString(os.Getenv("F7_AUTH_SIGNING_KEY"))
		if err != nil || len(key) != 32 {
			return nil, errors.New("F7_AUTH_SIGNING_KEY must contain 32 hex-encoded random bytes")
		}
		address := os.Getenv("F7_SMTP_ADDR")
		host, _, err := net.SplitHostPort(address)
		if err != nil || !net.ParseIP(host).IsLoopback() {
			return nil, errors.New("F7_SMTP_ADDR must be a loopback SMTP address")
		}
		api.accounts = &accountAPI{board: leaderboard.Board{DB: store.DB}, accounts: auth.EmailAccounts{DB: store.DB, SigningKey: key, Mail: auth.LocalMailbox{Address: address, WebOrigin: origin}}, sessions: auth.Sessions{DB: store.DB}}
		api.accounts.routes(register)
	}
	register("GET /api/v1/catalog/unlocks", func(w http.ResponseWriter, r *http.Request) {
		respond(w, 200, map[string]any{"development": true, "email_accounts": api.accounts != nil, "unlocks": store.Catalog.Items})
	})
	register("POST /api/v1/development/session", api.session)
	register("GET /api/v1/players/me", api.protected(func(w http.ResponseWriter, r *http.Request, id string) { api.state(w, r, id) }))
	register("GET /api/v1/players/me/wallet/transactions", api.protected(api.wallet))
	register("GET /api/v1/players/me/unlocks", api.protected(api.unlocks))
	backups := saveAPI{saves.Store{DB: store.DB}}
	register("GET /api/v1/players/me/save", api.protected(backups.get))
	register("PUT /api/v1/players/me/save", api.protected(backups.put))
	register("POST /api/v1/purchases", api.protected(api.purchase))
	register("POST /api/v1/game-events/batch", api.protected(api.batch))
	return mux, nil
}
func respond(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
func problem(w http.ResponseWriter, status int, code, message string) {
	var id [16]byte
	_, _ = rand.Read(id[:])
	id[6] = (id[6] & 15) | 64
	id[8] = (id[8] & 63) | 128
	respond(w, status, map[string]any{"error": map[string]any{"code": code, "message": message, "request_id": fmt.Sprintf("%x-%x-%x-%x-%x", id[:4], id[4:6], id[6:8], id[8:10], id[10:]), "details": []string{}}})
}
func body(w http.ResponseWriter, r *http.Request, target any) bool {
	typ, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if typ != "application/json" {
		problem(w, 415, "MEDIA_TYPE", "JSON required")
		return false
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 32<<10))
	raw = bytes.TrimSpace(raw)
	if err != nil || len(raw) == 0 || raw[0] != '{' {
		problem(w, 400, "INVALID_BODY", "Expected a bounded JSON object")
		return false
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(target); err != nil || !errors.Is(d.Decode(&struct{}{}), io.EOF) {
		problem(w, 400, "INVALID_BODY", "Invalid JSON request")
		return false
	}
	return true
}
func (a progressAPI) player(r *http.Request) (string, error) {
	if a.accounts != nil {
		if access := cookie(r, accessCookie); access != "" {
			return a.accounts.sessions.Player(r.Context(), access)
		}
	}
	c, err := r.Cookie(devCookie)
	if err != nil {
		return "", pgx.ErrNoRows
	}
	return a.sessions.Player(r.Context(), c.Value)
}
func (a progressAPI) protected(fn func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := a.player(r)
		if errors.Is(err, pgx.ErrNoRows) {
			problem(w, 401, "UNAUTHENTICATED", "Start a playtest session")
			return
		}
		if err != nil {
			problem(w, 503, "UNAVAILABLE", "Database unavailable")
			return
		}
		if (r.Method != "GET" || r.URL.Path == "/api/v1/players/me/save") && r.Header.Get("X-F7-Player") != id {
			problem(w, 409, "PLAYER_CHANGED", "Refresh the current player")
			return
		}
		fn(w, r, id)
	}
}
func (a progressAPI) session(w http.ResponseWriter, r *http.Request) {
	if !body(w, r, &struct{}{}) {
		return
	}
	if _, err := a.player(r); err == nil {
		w.WriteHeader(204)
		return
	} else if !errors.Is(err, pgx.ErrNoRows) {
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
		return
	}
	token, err := a.sessions.Create(r.Context())
	if err != nil {
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: devCookie, Value: token, Path: "/api/v1/", HttpOnly: true, SameSite: http.SameSiteStrictMode, MaxAge: int((30 * 24 * time.Hour).Seconds())})
	w.WriteHeader(204)
}
func (a progressAPI) state(w http.ResponseWriter, r *http.Request, player string) {
	s, err := a.store.State(r.Context(), player)
	if err != nil {
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
		return
	}
	respond(w, 200, s)
}
func (a progressAPI) purchase(w http.ResponseWriter, r *http.Request, player string) {
	var p economy.Purchase
	if !body(w, r, &p) {
		return
	}
	err := a.store.Buy(r.Context(), player, p)
	switch {
	case err == nil:
		receipt, readErr := a.store.PurchaseResult(r.Context(), player, p.ID)
		if readErr != nil {
			problem(w, 503, "UNAVAILABLE", "Database unavailable")
			return
		}
		respond(w, 200, receipt)
	case errors.Is(err, economy.ErrInvalid):
		problem(w, 422, "INVALID_PURCHASE", "Unknown unlock or invalid key")
	case errors.Is(err, economy.ErrConflict):
		problem(w, 409, "IDEMPOTENCY_CONFLICT", "Key already used")
	case errors.Is(err, economy.ErrDenied):
		problem(w, 422, "UNAVAILABLE_PURCHASE", "Check balance, prerequisites and ownership")
	default:
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
	}
}
func (a progressAPI) batch(w http.ResponseWriter, r *http.Request, player string) {
	var b struct {
		Events []economy.Event `json:"events"`
	}
	if !body(w, r, &b) {
		return
	}
	if len(b.Events) < 1 || len(b.Events) > 32 {
		problem(w, 422, "INVALID_BATCH", "Send 1 to 32 events")
		return
	}
	outcomes := make([]map[string]any, 0, len(b.Events))
	for _, e := range b.Events {
		err := a.store.Reward(r.Context(), player, e)
		var amount int64
		result := "accepted"
		switch {
		case err == nil:
			amount, err = a.store.RewardAmount(r.Context(), player, e.ID)
			if err != nil {
				problem(w, 503, "UNAVAILABLE", "Database unavailable")
				return
			}
		case errors.Is(err, economy.ErrConflict):
			result = "conflict"
		case errors.Is(err, economy.ErrInvalid) || errors.Is(err, economy.ErrDenied):
			result = "rejected"
		default:
			problem(w, 503, "UNAVAILABLE", "Database unavailable")
			return
		}
		outcomes = append(outcomes, map[string]any{"event_id": e.ID, "status": result, "amount_faaz": amount})
	}
	s, err := a.store.State(r.Context(), player)
	if err != nil {
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
		return
	}
	respond(w, 200, map[string]any{"outcomes": outcomes, "player": s})
}
