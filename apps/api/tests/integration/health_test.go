//go:build integration

package integration

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/barbodimani81/mokestoon/apps/api/internal/health"
	httpapi "github.com/barbodimani81/mokestoon/apps/api/internal/http"
	"github.com/barbodimani81/mokestoon/apps/api/internal/platform"
)

func TestPostgresReadiness(t *testing.T) {
	db, err := platform.OpenDatabase(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	handler := httpapi.Router(health.Probe{DB: db})
	check := func(path string, code int) {
		t.Helper()
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, httptest.NewRequest("GET", "/api/v1/health/"+path, nil))
		if w.Code != code {
			t.Fatalf("%s: expected %d, got %d", path, code, w.Code)
		}
	}
	check("ready", 200)
	db.Close()
	check("ready", 503)
	check("live", 200)
}
