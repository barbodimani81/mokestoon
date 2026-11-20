// Package saves stores versioned, non-economic apartment checkpoints.
package saves

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

//go:embed checkpoint.schema.json
var schemaFile []byte
var checkpointSchema = compileSchema()
var ErrInvalid = errors.New("invalid apartment save")
var ErrConflict = errors.New("save version conflict")
var ErrMissing = errors.New("no apartment save")

func compileSchema() *jsonschema.Schema {
	const name = "urn:f7:save:apartment:v1"
	doc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schemaFile))
	if err != nil {
		panic(err)
	}
	compiler := jsonschema.NewCompiler()
	compiler.AssertFormat()
	if err = compiler.AddResource(name, doc); err != nil {
		panic(err)
	}
	return compiler.MustCompile(name)
}

type Update struct {
	Expected *int64          `json:"expected_version"`
	Schema   int             `json:"schema_version"`
	Payload  json.RawMessage `json:"payload"`
}
type Checkpoint struct {
	Version int64           `json:"version"`
	Schema  int             `json:"schema_version"`
	Payload json.RawMessage `json:"payload"`
	Updated time.Time       `json:"updated_at"`
}
type Store struct{ DB *pgxpool.Pool }

func (s Store) Get(ctx context.Context, user string) (Checkpoint, error) {
	var c Checkpoint
	err := s.DB.QueryRow(ctx, "SELECT version,schema_version,payload,updated_at FROM f7.player_saves WHERE user_id=$1", user).Scan(&c.Version, &c.Schema, &c.Payload, &c.Updated)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, ErrMissing
	}
	c.Updated = c.Updated.UTC()
	return c, err
}

func (s Store) Put(ctx context.Context, user string, u Update) (Checkpoint, error) {
	var c Checkpoint
	if u.Expected == nil || *u.Expected < 0 || *u.Expected > 9007199254740990 || u.Schema != 1 || len(u.Payload) > 24*1024 {
		return c, ErrInvalid
	}
	doc, err := jsonschema.UnmarshalJSON(bytes.NewReader(u.Payload))
	if err != nil || checkpointSchema.Validate(doc) != nil {
		return c, ErrInvalid
	}
	// Creation and replacement each have one atomic version precondition.
	var row pgx.Row
	if *u.Expected == 0 {
		row = s.DB.QueryRow(ctx, `INSERT INTO f7.player_saves(user_id,version,schema_version,payload) VALUES($1,1,$2,$3)
            ON CONFLICT(user_id) DO NOTHING RETURNING version,updated_at`, user, u.Schema, u.Payload)
	} else {
		row = s.DB.QueryRow(ctx, `UPDATE f7.player_saves SET version=version+1,schema_version=$2,payload=$3,updated_at=now()
            WHERE user_id=$1 AND version=$4 RETURNING version,updated_at`, user, u.Schema, u.Payload, *u.Expected)
	}
	err = row.Scan(&c.Version, &c.Updated)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, ErrConflict
	}
	c.Schema, c.Payload, c.Updated = u.Schema, u.Payload, c.Updated.UTC()
	return c, err
}
