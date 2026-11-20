// Package economy owns the canonical Faaz ledger, ranking score and unlocks.
package economy

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrInvalid = errors.New("invalid operation")
var ErrDenied = errors.New("operation unavailable")
var ErrConflict = errors.New("idempotency conflict")
var uuid = regexp.MustCompile("^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$")

type Item struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Cost          int      `json:"cost_faaz"`
	Prerequisites []string `json:"prerequisites"`
}
type Catalog struct {
	Faaz          int                 `json:"reward_faaz"`
	Points        int                 `json:"reward_points"`
	DailyLimit    int                 `json:"daily_limit"`
	Minimum       map[string]int      `json:"minimum_ticks"`
	Requests      map[string][]string `json:"character_requests"`
	CooldownTicks int                 `json:"cooldown_ticks"`
	Items         []Item              `json:"unlocks"`
}

//go:embed playtest.json
var testCatalog []byte

func PlaytestCatalog() Catalog {
	var c Catalog
	if err := json.Unmarshal(testCatalog, &c); err != nil {
		panic(err)
	}
	if err := c.validate(); err != nil {
		panic(err)
	}
	return c
}

type Store struct {
	DB      *pgxpool.Pool
	Catalog Catalog
}
type State struct {
	Player  string   `json:"player_id"`
	Faaz    int64    `json:"faaz"`
	Score   int64    `json:"f7_score"`
	Unlocks []string `json:"unlocks"`
}
type Event struct {
	ID       string `json:"event_id"`
	Request  string `json:"request_id"`
	Friend   string `json:"character_id"`
	Activity string `json:"activity_id"`
	Duration int    `json:"duration_ticks"`
}
type Purchase struct {
	ID     string `json:"idempotency_key"`
	Unlock string `json:"unlock_id"`
}
type querier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

const stateFields = `COALESCE((SELECT sum(amount) FROM f7.wallet_transactions WHERE user_id=$1),0),
 COALESCE((SELECT sum(points) FROM f7.score_transactions WHERE user_id=$1),0),
 ARRAY(SELECT unlock_id FROM f7.player_unlocks WHERE user_id=$1 ORDER BY unlock_id)`

func state(ctx context.Context, q querier, player string) (State, error) {
	s := State{Player: player}
	err := q.QueryRow(ctx, "SELECT "+stateFields, player).Scan(&s.Faaz, &s.Score, &s.Unlocks)
	return s, err
}
func (s Store) State(ctx context.Context, player string) (State, error) {
	return state(ctx, s.DB, player)
}

type entry struct {
	kind, reason, request, friend string
	ticks                         int
}

func (s Store) transact(ctx context.Context, player, id string, e entry, apply func(pgx.Tx, time.Time) error) error {
	if !uuid.MatchString(id) {
		return ErrInvalid
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var created time.Time
	if err = tx.QueryRow(ctx, "SELECT created_at FROM f7.users WHERE id=$1 FOR UPDATE", player).Scan(&created); err != nil {
		return err
	}
	var old entry
	err = tx.QueryRow(ctx, `SELECT kind,reason,coalesce(request_id::text,''),coalesce(character_id,''),duration_ticks FROM f7.progress_events WHERE user_id=$1 AND id=$2`, player, id).Scan(&old.kind, &old.reason, &old.request, &old.friend, &old.ticks)
	if err == nil {
		if old != e {
			return ErrConflict
		}
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if e.request != "" {
		var used bool
		if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM f7.progress_events WHERE user_id=$1 AND request_id=$2)", player, e.request).Scan(&used); err != nil {
			return err
		}
		if used {
			return ErrConflict
		}
	}
	_, err = tx.Exec(ctx, `INSERT INTO f7.progress_events(user_id,id,kind,reason,request_id,character_id,duration_ticks) VALUES ($1,$2,$3,$4,nullif($5,'')::uuid,nullif($6,''),$7)`, player, id, e.kind, e.reason, e.request, e.friend, e.ticks)
	if err != nil {
		return err
	}
	if err = apply(tx, created); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (s Store) Reward(ctx context.Context, player string, event Event) error {
	minimum, ok := s.Catalog.Minimum[event.Activity]
	if !ok || !uuid.MatchString(event.Request) || event.Duration < minimum || event.Duration > 36000 {
		return ErrInvalid
	}
	if !slices.Contains(s.Catalog.Requests[event.Friend], event.Activity) {
		return ErrInvalid
	}
	return s.transact(ctx, player, event.ID, entry{"request_completed", event.Activity, strings.ToLower(event.Request), event.Friend, event.Duration}, func(tx pgx.Tx, created time.Time) error {
		var count, total, used int64
		err := tx.QueryRow(ctx, `SELECT count(*) FILTER(WHERE created_at >= date_trunc('day',now(),'UTC')),count(*),sum(duration_ticks) FROM f7.progress_events WHERE user_id=$1 AND kind='request_completed'`, player).Scan(&count, &total, &used)
		if err != nil {
			return err
		}
		if count > int64(s.Catalog.DailyLimit) || used+(total-1)*int64(s.Catalog.CooldownTicks) > time.Since(created).Milliseconds()/100 {
			return ErrDenied
		}
		if event.Activity == "tv" || event.Activity == "ps4" {
			required := "object.tv"
			if event.Activity == "ps4" {
				required = "activity.ps4"
			}
			var owned bool
			if err = tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM f7.player_unlocks WHERE user_id=$1 AND unlock_id=$2)", player, required).Scan(&owned); err != nil {
				return err
			}
			if !owned {
				return ErrDenied
			}
		}
		if _, err = tx.Exec(ctx, "INSERT INTO f7.wallet_transactions VALUES ($1,$2,$3)", player, event.ID, s.Catalog.Faaz); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, "INSERT INTO f7.score_transactions VALUES ($1,$2,$3)", player, event.ID, s.Catalog.Points)
		return err
	})
}
func (s Store) Buy(ctx context.Context, player string, p Purchase) error {
	var item *Item
	for i := range s.Catalog.Items {
		if s.Catalog.Items[i].ID == p.Unlock {
			item = &s.Catalog.Items[i]
			break
		}
	}
	if item == nil {
		return ErrInvalid
	}
	return s.transact(ctx, player, p.ID, entry{kind: "purchase", reason: p.Unlock}, func(tx pgx.Tx, _ time.Time) error {
		current, err := state(ctx, tx, player)
		if err != nil {
			return err
		}
		if current.Faaz < int64(item.Cost) {
			return ErrDenied
		}
		owns := map[string]bool{}
		for _, id := range current.Unlocks {
			owns[id] = true
		}
		if owns[item.ID] {
			return ErrDenied
		}
		for _, id := range item.Prerequisites {
			if !owns[id] {
				return ErrDenied
			}
		}
		if _, err = tx.Exec(ctx, "INSERT INTO f7.wallet_transactions VALUES ($1,$2,$3)", player, p.ID, -item.Cost); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, "INSERT INTO f7.player_unlocks VALUES ($1,$2,$3)", player, item.ID, p.ID)
		return err
	})
}
