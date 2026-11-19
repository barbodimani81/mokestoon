package health

import (
	"context"
	"time"
)

type Database interface {
	Ping(context.Context) error
}

type Probe struct {
	DB Database
}

func (p Probe) Ready(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return p.DB.Ping(ctx) == nil
}
