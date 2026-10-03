-- Paradream database (Cloudflare D1). Apply once:
--   npx wrangler d1 migrations apply paradream --remote
-- (locally: npx wrangler d1 migrations apply DB --local)

-- One row per email that has used its Christmas spin. The PRIMARY KEY is what makes
-- "one spin per email" impossible to get around, even with simultaneous requests.
CREATE TABLE IF NOT EXISTS spin_entries (
  key        TEXT PRIMARY KEY,        -- sha256 of the cleaned-up email address
  email      TEXT NOT NULL,
  prize_id   TEXT NOT NULL,
  code       TEXT,                    -- NULL when there was no prize
  created_at TEXT NOT NULL
);

-- Every enquiry from every form on the site (also emailed to the team).
CREATE TABLE IF NOT EXISTS submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  form       TEXT NOT NULL,           -- e.g. wedding-enquiry, join-us
  name       TEXT,
  email      TEXT,
  phone      TEXT,
  data       TEXT NOT NULL,           -- all the fields, as JSON
  emailed    INTEGER NOT NULL DEFAULT 0,   -- 1 once the team email was sent
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at);
