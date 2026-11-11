CREATE TABLE IF NOT EXISTS admins (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  is_adult boolean NOT NULL,
  consent_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  signup_closes_at timestamptz NOT NULL,
  capacity int NOT NULL CHECK (capacity > 0),
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (signup_closes_at <= starts_at),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS signups (
  activity_id int REFERENCES activities ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmation_sent boolean NOT NULL DEFAULT false,
  PRIMARY KEY (activity_id, user_id)
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by text;
