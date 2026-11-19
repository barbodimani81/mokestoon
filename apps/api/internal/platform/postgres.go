package platform

import (
	"context"
	"errors"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func OpenDatabase(ctx context.Context) (*pgxpool.Pool, error) {
	for _, key := range []string{"PGHOST", "PGDATABASE", "PGUSER"} {
		if os.Getenv(key) == "" {
			return nil, errors.New(key + " is required")
		}
	}
	// pgx reads libpq environment settings. Opening the pool is lazy so that
	// liveness is available while PostgreSQL starts or recovers.
	pool, err := pgxpool.New(ctx, "")
	if err != nil {
		return nil, errors.New("invalid PostgreSQL configuration")
	}
	return pool, nil
}
