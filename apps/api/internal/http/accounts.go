package httpapi

import (
	"errors"
	"net"
	"net/http"
	"time"

	"github.com/barbodimani81/mokestoon/apps/api/internal/auth"
	"github.com/barbodimani81/mokestoon/apps/api/internal/leaderboard"
	"github.com/barbodimani81/mokestoon/apps/api/internal/players"
	"github.com/jackc/pgx/v5"
)

const accessCookie = "f7_access"
const refreshCookie = "f7_refresh"

type accountAPI struct {
	board    leaderboard.Board
	accounts auth.EmailAccounts
	sessions auth.Sessions
}
type registerRoute func(string, http.HandlerFunc)

func (a accountAPI) routes(register registerRoute) {
	register("GET /api/v1/me", a.me)
	register("GET /api/v1/leaderboard", a.standings)
	register("PATCH /api/v1/players/me", a.rename)
	register("POST /api/v1/auth/register", a.begin(auth.Verify))
	register("POST /api/v1/auth/verify-email", a.complete(auth.Verify))
	register("POST /api/v1/auth/password/forgot", a.begin(auth.Reset))
	register("POST /api/v1/auth/password/reset", a.complete(auth.Reset))
	register("POST /api/v1/auth/login", a.login)
	register("POST /api/v1/auth/refresh", a.refresh)
	register("POST /api/v1/auth/logout", a.logout)
}
func cookie(r *http.Request, name string) string {
	c, err := r.Cookie(name)
	if err != nil {
		return ""
	}
	return c.Value
}
func sessionCookie(w http.ResponseWriter, name, path, value string, ttl int) {
	// These routes are mounted by the loopback-only HTTP playtest router.
	http.SetCookie(w, &http.Cookie{Name: name, Value: value, Path: path, MaxAge: ttl, HttpOnly: true, SameSite: http.SameSiteStrictMode})
}
func credentials(w http.ResponseWriter, c auth.Credentials) {
	remaining := int(time.Until(c.Expires).Seconds())
	sessionCookie(w, accessCookie, "/api/v1/", c.Access, min(int(auth.AccessLifetime.Seconds()), max(remaining, 1)))
	sessionCookie(w, refreshCookie, "/api/v1/auth/", c.Refresh, max(remaining, 1))
	sessionCookie(w, devCookie, "/api/v1/", "", -1)
	w.WriteHeader(204)
}
func accountProblem(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, auth.ErrInput):
		problem(w, 422, "INVALID_ACCOUNT_INPUT", "Enter a valid email and a password of at least 12 characters where required")
	case errors.Is(err, auth.ErrCredentials), errors.Is(err, pgx.ErrNoRows):
		problem(w, 401, "INVALID_CREDENTIALS", "Sign-in details or link are invalid or expired")
	case errors.Is(err, auth.ErrLimited):
		w.Header().Set("Retry-After", "900")
		problem(w, 429, "RATE_LIMITED", "Too many attempts. Try again in 15 minutes.")
	default:
		problem(w, 503, "UNAVAILABLE", "Account service unavailable")
	}
}
func (a accountAPI) limit(w http.ResponseWriter, r *http.Request, action, email string) bool {
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	if err := a.accounts.Limit(r.Context(), action, host, email); err != nil {
		accountProblem(w, err)
		return false
	}
	return true
}
func (a accountAPI) begin(p auth.Purpose) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var form struct {
			Email string `json:"email"`
		}
		if !body(w, r, &form) || !a.limit(w, r, "request-"+string(p), form.Email) {
			return
		}
		if err := a.accounts.Begin(r.Context(), p, form.Email, cookie(r, devCookie)); err != nil {
			accountProblem(w, err)
			return
		}
		w.WriteHeader(202)
	}
}
func (a accountAPI) complete(p auth.Purpose) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var form struct {
			Token    string `json:"token"`
			Password string `json:"password"`
		}
		if !body(w, r, &form) || !a.limit(w, r, "complete-"+string(p), "") {
			return
		}
		c, err := a.accounts.Complete(r.Context(), p, form.Token, form.Password, cookie(r, devCookie))
		if err != nil {
			accountProblem(w, err)
			return
		}
		credentials(w, c)
	}
}
func (a accountAPI) login(w http.ResponseWriter, r *http.Request) {
	var form struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !body(w, r, &form) || !a.limit(w, r, "login", form.Email) {
		return
	}
	c, err := a.accounts.Login(r.Context(), form.Email, form.Password)
	if err != nil {
		accountProblem(w, err)
		return
	}
	credentials(w, c)
}
func (a accountAPI) refresh(w http.ResponseWriter, r *http.Request) {
	if !body(w, r, &struct{}{}) {
		return
	}
	raw := cookie(r, refreshCookie)
	if raw == "" {
		accountProblem(w, auth.ErrCredentials)
		return
	}
	c, err := a.sessions.Rotate(r.Context(), raw)
	if err != nil {
		accountProblem(w, err)
		return
	}
	credentials(w, c)
}
func (a accountAPI) logout(w http.ResponseWriter, r *http.Request) {
	if !body(w, r, &struct{}{}) {
		return
	}
	if err := a.sessions.Revoke(r.Context(), cookie(r, accessCookie), cookie(r, refreshCookie)); err != nil {
		accountProblem(w, err)
		return
	}
	sessionCookie(w, accessCookie, "/api/v1/", "", -1)
	sessionCookie(w, refreshCookie, "/api/v1/auth/", "", -1)
	w.WriteHeader(204)
}
func (a accountAPI) me(w http.ResponseWriter, r *http.Request) {
	access := cookie(r, accessCookie)
	if access == "" {
		accountProblem(w, auth.ErrCredentials)
		return
	}
	id, err := a.sessions.Player(r.Context(), access)
	if err != nil {
		accountProblem(w, err)
		return
	}
	p, err := a.accounts.Profile(r.Context(), id)
	if err != nil {
		accountProblem(w, err)
		return
	}
	respond(w, 200, p)
}

func (a accountAPI) rename(w http.ResponseWriter, r *http.Request) {
	id, err := a.sessions.Player(r.Context(), cookie(r, accessCookie))
	if err != nil {
		accountProblem(w, err)
		return
	}
	if id != r.Header.Get("X-F7-Player") {
		problem(w, 409, "PLAYER_CHANGED", "Refresh the current player")
		return
	}
	var form struct {
		DisplayName *string `json:"display_name"`
	}
	if !body(w, r, &form) {
		return
	}
	if form.DisplayName == nil {
		problem(w, 422, "INVALID_NAME", "Provide the display name to update")
		return
	}
	err = (players.Profiles{DB: a.accounts.DB}).SetName(r.Context(), id, *form.DisplayName)
	switch {
	case err == nil:
		w.WriteHeader(204)
	case errors.Is(err, players.ErrName):
		problem(w, 422, "INVALID_NAME", "Use up to 32 visible characters")
	case errors.Is(err, players.ErrTaken):
		problem(w, 409, "NAME_TAKEN", "That display name is already in use")
	default:
		accountProblem(w, err)
	}
}
