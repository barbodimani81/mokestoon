// Package players owns private, editable player profile fields.
package players

import (
	"context"
	"errors"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/text/unicode/norm"
)

var ErrName = errors.New("invalid display name")
var ErrTaken = errors.New("display name already used")

type Profiles struct{ DB *pgxpool.Pool }

func (p Profiles) SetName(ctx context.Context, player, raw string) error {
	name := norm.NFC.String(strings.TrimSpace(raw))
	if utf8.RuneCountInString(name) > 32 || strings.IndexFunc(name, func(r rune) bool { return unicode.IsControl(r) || unicode.Is(unicode.Cf, r) }) >= 0 {
		return ErrName
	}
	_, err := p.DB.Exec(ctx, `INSERT INTO f7.player_profiles(user_id,display_name) VALUES ($1,nullif($2,''))
        ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,updated_at=now()`, player, name)
	var e *pgconn.PgError
	if errors.As(err, &e) && e.Code == "23505" {
		return ErrTaken
	}
	return err
}
