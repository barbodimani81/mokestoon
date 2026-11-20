package leaderboard

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrUnavailable = errors.New("shared rankings unavailable")

type Scope struct{ Kind, GroupID string }

// A visibility policy supplies only the accounts this viewer may see.
type Visibility func(context.Context, pgx.Tx, string, Scope) ([]string, error)
type Board struct {
	DB      *pgxpool.Pool
	Visible Visibility
}

func (b Board) ForViewer(ctx context.Context, viewer string, scope Scope, limit int, cursor string) (Page, error) {
	if b.Visible == nil {
		return Page{}, ErrUnavailable
	}
	tx, err := b.DB.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return Page{}, err
	}
	defer tx.Rollback(ctx)
	allowed, err := b.Visible(ctx, tx, viewer, scope)
	if err != nil {
		return Page{}, err
	}
	page, err := ReadPage(ctx, tx, allowed, limit, cursor)
	if err != nil {
		return Page{}, err
	}
	return page, tx.Commit(ctx)
}
