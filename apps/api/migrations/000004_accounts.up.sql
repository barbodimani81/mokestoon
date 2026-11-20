CREATE TABLE f7.email_accounts (
    user_id uuid PRIMARY KEY REFERENCES f7.users(id),
    email text NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash text NOT NULL,
    verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE f7.account_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES f7.users(id),
    access_hash bytea NOT NULL UNIQUE,
    refresh_hash bytea NOT NULL UNIQUE,
    revocation_hash bytea NOT NULL UNIQUE,
    access_expires_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    CHECK (access_expires_at <= expires_at)
);
CREATE INDEX account_sessions_user ON f7.account_sessions(user_id);
CREATE TABLE f7.email_challenges (
    token_hash bytea PRIMARY KEY,
    email text NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('verify', 'reset')),
    guest_id uuid REFERENCES f7.users(id),
    expires_at timestamptz NOT NULL
);
CREATE INDEX email_challenges_inbox ON f7.email_challenges(email,purpose);
CREATE TABLE f7.auth_limits (
    bucket bytea PRIMARY KEY,
    attempts integer NOT NULL,
    expires_at timestamptz NOT NULL
);
CREATE TABLE f7.player_profiles (
    user_id uuid PRIMARY KEY REFERENCES f7.users(id),
    display_name text CHECK (char_length(display_name) BETWEEN 1 AND 32),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX playtest_display_name ON f7.player_profiles(lower(display_name)) WHERE display_name IS NOT NULL;
