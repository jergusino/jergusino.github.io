-- Pending signups remember which list they are for; one row per address + list.
ALTER TABLE pending ADD COLUMN list TEXT NOT NULL DEFAULT 'newsletter';
CREATE UNIQUE INDEX IF NOT EXISTS pending_token ON pending (token);
CREATE INDEX IF NOT EXISTS pending_email_list ON pending (email, list);
CREATE INDEX IF NOT EXISTS pending_signed_up ON pending (signed_up_at);
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_list ON subscribers (email, list);
