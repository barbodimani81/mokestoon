package httpapi

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/barbodimani81/mokestoon/apps/api/internal/economy"
)

func (a progressAPI) wallet(w http.ResponseWriter, r *http.Request, id string) {
	limit := 25
	query := r.URL.Query()
	if query.Has("limit") {
		n, err := strconv.Atoi(query.Get("limit"))
		if err != nil {
			problem(w, 422, "INVALID_PAGE", "Invalid page size")
			return
		}
		limit = n
	}
	page, err := a.store.WalletHistory(r.Context(), id, query.Get("cursor"), limit)
	switch {
	case err == nil:
		respond(w, 200, page)
	case errors.Is(err, economy.ErrInvalid):
		problem(w, 422, "INVALID_PAGE", "Invalid cursor or page size")
	default:
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
	}
}
func (a progressAPI) unlocks(w http.ResponseWriter, r *http.Request, id string) {
	player, err := a.store.State(r.Context(), id)
	if err != nil {
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
		return
	}
	respond(w, 200, map[string]any{"unlocks": player.Unlocks})
}
