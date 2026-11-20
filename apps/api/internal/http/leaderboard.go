package httpapi

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/barbodimani81/mokestoon/apps/api/internal/leaderboard"
)

func (a accountAPI) standings(w http.ResponseWriter, r *http.Request) {
	viewer, err := a.sessions.Player(r.Context(), cookie(r, accessCookie))
	if err != nil {
		accountProblem(w, err)
		return
	}
	if expected := r.Header.Get("X-F7-Player"); expected != "" && viewer != expected {
		problem(w, 409, "PLAYER_CHANGED", "Refresh the current player")
		return
	}
	query := r.URL.Query()
	scope := leaderboard.Scope{Kind: query.Get("scope"), GroupID: query.Get("group_id")}
	limit := 25
	if query.Has("limit") {
		limit, err = strconv.Atoi(query.Get("limit"))
	}
	if err != nil || limit < 1 || limit > 100 || (query.Has("period") && query.Get("period") != "all_time") ||
		(scope.Kind != "" && scope.Kind != "global" && scope.Kind != "group") || (scope.GroupID != "" && scope.Kind != "group") {
		problem(w, 422, "INVALID_PAGE", "Invalid leaderboard scope, period or page size")
		return
	}
	page, err := a.board.ForViewer(r.Context(), viewer, scope, limit, query.Get("cursor"))
	switch {
	case err == nil:
		respond(w, 200, page)
	case errors.Is(err, leaderboard.ErrUnavailable):
		problem(w, 403, "RANKINGS_UNAVAILABLE", "Friend rankings are not enabled.")
	case errors.Is(err, leaderboard.ErrChanged):
		problem(w, 409, "RANKINGS_CHANGED", "Standings changed. Refresh to see the latest ranks.")
	case errors.Is(err, leaderboard.ErrPage):
		problem(w, 422, "INVALID_PAGE", "Invalid leaderboard page")
	default:
		problem(w, 503, "UNAVAILABLE", "Rankings temporarily unavailable")
	}
}
