package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/barbodimani81/mokestoon/apps/api/internal/health"
)

func Router(probe health.Probe) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health/live", func(w http.ResponseWriter, _ *http.Request) {
		writeStatus(w, http.StatusOK, "live")
	})
	mux.HandleFunc("GET /api/v1/health/ready", func(w http.ResponseWriter, r *http.Request) {
		if probe.Ready(r.Context()) {
			writeStatus(w, http.StatusOK, "ready")
			return
		}
		writeStatus(w, http.StatusServiceUnavailable, "unavailable")
	})
	return mux
}

func writeStatus(w http.ResponseWriter, code int, status string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(struct {
		Status string `json:"status"`
	}{status})
}
