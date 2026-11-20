CREATE TABLE f7.player_saves (
    user_id uuid PRIMARY KEY REFERENCES f7.users(id),
    version bigint NOT NULL CHECK (version > 0),
    schema_version integer NOT NULL CHECK (schema_version > 0),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    updated_at timestamptz NOT NULL DEFAULT now()
);
