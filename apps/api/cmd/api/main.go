package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/barbodimani81/mokestoon/apps/api/internal/config"
	"github.com/barbodimani81/mokestoon/apps/api/internal/economy"
	"github.com/barbodimani81/mokestoon/apps/api/internal/health"
	httpapi "github.com/barbodimani81/mokestoon/apps/api/internal/http"
	"github.com/barbodimani81/mokestoon/apps/api/internal/platform"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stderr, nil)))
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx); err != nil {
		slog.Error("API stopped", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context) error {
	addr, err := config.ListenAddress()
	if err != nil {
		return err
	}
	db, err := platform.OpenDatabase(ctx)
	if err != nil {
		return err
	}
	defer db.Close()
	handler, err := httpapi.Playtest(httpapi.Router(health.Probe{DB: db}), economy.Store{DB: db, Catalog: economy.PlaytestCatalog()}, addr)
	if err != nil {
		return err
	}
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	srv := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second,
		WriteTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second,
	}
	result := make(chan error, 1)
	go func() { result <- srv.Serve(ln) }()
	slog.Info("API listening", "address", ln.Addr().String())
	select {
	case err := <-result:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return srv.Shutdown(shutdown)
	}
}
