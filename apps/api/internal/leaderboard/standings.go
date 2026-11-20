// Package leaderboard ranks a server-authorized set of accounts by F7 Score.
package leaderboard

import (
	"context"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

var ErrPage = errors.New("invalid leaderboard page")
var ErrChanged = errors.New("standings changed; restart pagination")

type Entry struct {
	Rank        int64   `json:"rank"`
	DisplayName *string `json:"display_name"`
	Score       int64   `json:"f7_score"`
}
type Page struct {
	Entries []Entry `json:"entries"`
	Next    string  `json:"next_cursor,omitempty"`
}
type Reader interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

// ReadPage accepts IDs selected by the server's visibility policy. An empty
// roster yields an empty board. Pass a transaction when the roster is resolved
// in the database so authorization and ranking can share a consistent snapshot.
func ReadPage(ctx context.Context, db Reader, allowed []string, limit int, cursor string) (Page, error) {
	result := Page{Entries: []Entry{}}
	if limit < 1 || limit > 100 {
		return result, ErrPage
	}
	var offset int64
	var revision string
	if cursor != "" {
		var suffix string
		var ok bool
		revision, suffix, ok = strings.Cut(cursor, ".")
		if !ok || len(revision) != 64 || len(suffix) > 10 {
			return result, ErrPage
		}
		if _, err := hex.DecodeString(revision); err != nil {
			return result, ErrPage
		}
		var err error
		offset, err = strconv.ParseInt(suffix, 10, 32)
		if err != nil || offset < 1 || strconv.FormatInt(offset, 10) != suffix {
			return result, ErrPage
		}
	}
	rows, err := db.Query(ctx, standings, allowed, limit+1, offset, revision)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	for rows.Next() {
		var stamp string
		var rank, score *int64
		var name *string
		if err = rows.Scan(&stamp, &rank, &name, &score); err != nil {
			return Page{}, err
		}
		if revision != "" && revision != stamp {
			return Page{}, ErrChanged
		}
		if rank == nil {
			continue
		} // Empty page. The query still supplies its revision.
		if len(result.Entries) == limit {
			result.Next = stamp + "." + strconv.FormatInt(offset+int64(limit), 10)
			break
		}
		result.Entries = append(result.Entries, Entry{Rank: *rank, DisplayName: name, Score: *score})
	}
	return result, rows.Err()
}

// Rank ties share a place. The private account key stabilizes their order.
// The revision detects roster, name or score changes between requests.
const standings = `
WITH totals AS (
    SELECT u.id,p.display_name,coalesce(sum(s.points),0)::bigint AS score
    FROM f7.users u
    LEFT JOIN f7.score_transactions s ON s.user_id=u.id
    LEFT JOIN f7.player_profiles p ON p.user_id=u.id
    WHERE u.kind='account' AND u.id=ANY($1::text[]::uuid[])
    GROUP BY u.id,p.display_name
), revision AS (
    SELECT encode(sha256(convert_to(coalesce(
        jsonb_agg(jsonb_build_array(id,display_name,score) ORDER BY id)::text,'[]'
    ),'UTF8')),'hex') AS stamp FROM totals
), page AS (
    SELECT id,display_name,score,rank() OVER (ORDER BY score DESC) AS place
    FROM totals ORDER BY score DESC,id LIMIT $2 OFFSET $3
)
SELECT revision.stamp,page.place,page.display_name,page.score
FROM revision LEFT JOIN page ON ($4='' OR revision.stamp=$4)
ORDER BY page.score DESC,page.id`
