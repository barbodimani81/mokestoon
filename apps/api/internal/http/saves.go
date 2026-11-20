package httpapi

import (
	"errors"
	"net/http"

	"github.com/barbodimani81/mokestoon/apps/api/internal/saves"
)

type saveAPI struct{ store saves.Store }

func (a saveAPI) get(w http.ResponseWriter, r *http.Request, player string) {
	c, err := a.store.Get(r.Context(), player)
	if errors.Is(err, saves.ErrMissing) {
		problem(w, 404, "SAVE_NOT_FOUND", "No apartment backup yet")
		return
	}
	if err != nil {
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
		return
	}
	respond(w, 200, c)
}
func (a saveAPI) put(w http.ResponseWriter, r *http.Request, player string) {
	var u saves.Update
	if !body(w, r, &u) {
		return
	}
	c, err := a.store.Put(r.Context(), player, u)
	switch {
	case err == nil:
		respond(w, 200, c)
	case errors.Is(err, saves.ErrConflict):
		problem(w, 409, "SAVE_VERSION_CONFLICT", "A newer apartment backup exists")
	case errors.Is(err, saves.ErrInvalid):
		problem(w, 422, "INVALID_SAVE", "Unsupported apartment checkpoint")
	default:
		problem(w, 503, "UNAVAILABLE", "Database unavailable")
	}
}
