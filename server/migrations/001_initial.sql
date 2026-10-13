CREATE TABLE IF NOT EXISTS owners (id uuid PRIMARY KEY, singleton boolean NOT NULL DEFAULT true UNIQUE CHECK(singleton), username text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS projects (id text PRIMARY KEY, slug text UNIQUE NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL);
INSERT INTO settings VALUES (1,'{"github":"https://github.com/SarimSheikh1"}') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS inquiries (id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), resolved boolean NOT NULL DEFAULT false, mail_status text NOT NULL DEFAULT 'not-configured');
CREATE TABLE IF NOT EXISTS jobs (id uuid PRIMARY KEY, kind text NOT NULL, status text NOT NULL, details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS session (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL);
CREATE INDEX IF NOT EXISTS session_expire_idx ON session(expire);

CREATE TABLE IF NOT EXISTS viewers (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS visitor_presence (id uuid PRIMARY KEY, account_id uuid, first_seen timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(), current_target text NOT NULL DEFAULT 'Home');
CREATE TABLE IF NOT EXISTS visitor_events (id uuid PRIMARY KEY, visitor_id uuid NOT NULL REFERENCES visitor_presence(id), account_id uuid, kind text NOT NULL, target text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS visitor_events_created_idx ON visitor_events(created_at DESC);
ALTER TABLE visitor_presence ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE visitor_presence ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}';
