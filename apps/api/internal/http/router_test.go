package httpapi

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/barbodimani81/mokestoon/apps/api/internal/health"
)

type pingFunc func(context.Context) error

func (f pingFunc) Ping(ctx context.Context) error { return f(ctx) }

func TestProbes(t *testing.T) {
	for _, tc := range []struct {
		name, method, route string
		available           bool
		code                int
		body                string
		checks              int
	}{
		{"live during outage", "GET", "live", false, 200, `{"status":"live"}`, 0},
		{"ready", "GET", "ready", true, 200, `{"status":"ready"}`, 1},
		{"outage", "GET", "ready", false, 503, `{"status":"unavailable"}`, 1},
		{"invalid method", "POST", "ready", true, 405, "", 0},
		{"unknown endpoint", "GET", "other", true, 404, "", 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			checks := 0
			db := pingFunc(func(ctx context.Context) error {
				checks++
				deadline, ok := ctx.Deadline()
				if !ok || time.Until(deadline) > 2*time.Second {
					t.Fatal("unbounded ping")
				}
				if !tc.available {
					return errors.New("internal connection details")
				}
				return nil
			})
			w := httptest.NewRecorder()
			Router(health.Probe{DB: db}).ServeHTTP(w, httptest.NewRequest(tc.method, "/api/v1/health/"+tc.route, nil))
			if w.Code != tc.code || checks != tc.checks {
				t.Fatalf("status %d, pings %d", w.Code, checks)
			}
			if tc.body != "" && (strings.TrimSpace(w.Body.String()) != tc.body || w.Header().Get("Content-Type") != "application/json" || w.Header().Get("Cache-Control") != "no-store") {
				t.Fatalf("unexpected response %v %s", w.Header(), w.Body.String())
			}
		})
	}
}

func TestCancelledReadiness(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	request := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/health/ready", nil)
	w := httptest.NewRecorder()
	Router(health.Probe{DB: pingFunc(func(ctx context.Context) error { return ctx.Err() })}).ServeHTTP(w, request)
	if w.Code != 503 {
		t.Fatalf("status %d", w.Code)
	}
}
