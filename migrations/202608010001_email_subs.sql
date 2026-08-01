-- Atlas migration: newsletter email subscriptions from the homepage footer.
CREATE TABLE IF NOT EXISTS email_subs (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
