CREATE TABLE f7.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind text NOT NULL CHECK (kind IN ('development', 'account')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE f7.sessions (
    token_hash bytea PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES f7.users(id),
    expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user ON f7.sessions(user_id);
CREATE TABLE f7.progress_events (
    user_id uuid NOT NULL REFERENCES f7.users(id),
    id uuid NOT NULL,
    kind text NOT NULL CHECK (kind IN ('request_completed','purchase')),
    reason text NOT NULL,
    request_id uuid,
    character_id text,
    duration_ticks integer NOT NULL DEFAULT 0 CHECK (duration_ticks >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id,id),
    UNIQUE(user_id,request_id)
);
CREATE INDEX progress_events_time ON f7.progress_events(user_id,created_at);
CREATE TABLE f7.wallet_transactions (
    user_id uuid NOT NULL, event_id uuid NOT NULL, amount bigint NOT NULL,
    PRIMARY KEY(user_id,event_id),
    FOREIGN KEY(user_id,event_id) REFERENCES f7.progress_events(user_id,id)
);
CREATE TABLE f7.score_transactions (
    user_id uuid NOT NULL, event_id uuid NOT NULL, points bigint NOT NULL CHECK(points>0),
    PRIMARY KEY(user_id,event_id),
    FOREIGN KEY(user_id,event_id) REFERENCES f7.progress_events(user_id,id)
);
CREATE TABLE f7.player_unlocks (
    user_id uuid NOT NULL, unlock_id text NOT NULL, purchase_id uuid NOT NULL,
    PRIMARY KEY(user_id,unlock_id),
    FOREIGN KEY(user_id,purchase_id) REFERENCES f7.progress_events(user_id,id)
);
