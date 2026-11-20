package economy

import (
	"context"
	"time"
)

type Transaction struct {
	Event   string    `json:"event_id"`
	Kind    string    `json:"event_type"`
	Reason  string    `json:"reason"`
	Amount  int64     `json:"amount_faaz"`
	Created time.Time `json:"created_at"`
}
type History struct {
	Transactions []Transaction `json:"transactions"`
	Next         string        `json:"next_cursor,omitempty"`
}

// WalletHistory uses the last returned event as the cursor. Its sort position is
// looked up under the authenticated player, including when timestamps tie.
func (s Store) WalletHistory(ctx context.Context, player, cursor string, limit int) (History, error) {
	result := History{Transactions: []Transaction{}}
	if (cursor != "" && !uuid.MatchString(cursor)) || limit < 1 || limit > 100 {
		return result, ErrInvalid
	}
	rows, err := s.DB.Query(ctx, `SELECT e.id::text,e.kind,e.reason,w.amount,e.created_at
        FROM f7.progress_events e JOIN f7.wallet_transactions w ON (w.user_id,w.event_id)=(e.user_id,e.id)
        WHERE e.user_id=$1 AND ($2::text='' OR (e.created_at,e.id)<(
          SELECT created_at,id FROM f7.progress_events WHERE user_id=$1 AND id=NULLIF($2,'')::uuid))
        ORDER BY e.created_at DESC,e.id DESC LIMIT $3`, player, cursor, limit+1)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	for rows.Next() {
		if len(result.Transactions) == limit {
			result.Next = result.Transactions[limit-1].Event
			break
		}
		var t Transaction
		if err = rows.Scan(&t.Event, &t.Kind, &t.Reason, &t.Amount, &t.Created); err != nil {
			return result, err
		}
		t.Created = t.Created.UTC()
		result.Transactions = append(result.Transactions, t)
	}
	return result, rows.Err()
}

type PurchaseResult struct {
	State
	PurchaseID  string    `json:"purchase_id"`
	UnlockID    string    `json:"unlock_id"`
	PurchasedAt time.Time `json:"purchased_at"`
}

func (s Store) PurchaseResult(ctx context.Context, player, id string) (PurchaseResult, error) {
	var receipt PurchaseResult
	receipt.Player = player
	err := s.DB.QueryRow(ctx, "SELECT "+stateFields+`,id::text,reason,created_at FROM f7.progress_events
        WHERE user_id=$1 AND id=$2 AND kind='purchase'`, player, id).Scan(&receipt.Faaz, &receipt.Score, &receipt.Unlocks, &receipt.PurchaseID, &receipt.UnlockID, &receipt.PurchasedAt)
	receipt.PurchasedAt = receipt.PurchasedAt.UTC()
	return receipt, err
}

// RewardAmount returns the immutable posted amount, including on an identical retry.
func (s Store) RewardAmount(ctx context.Context, player, event string) (int64, error) {
	var amount int64
	err := s.DB.QueryRow(ctx, "SELECT amount FROM f7.wallet_transactions WHERE user_id=$1 AND event_id=$2", player, event).Scan(&amount)
	return amount, err
}
