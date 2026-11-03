-- Author-owned writing workflow. Existing anonymous rows are not made public or claimed.
CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  pen_name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE login_challenges (
  email TEXT PRIMARY KEY,
  id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE author_sessions (
  token_hash TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_expiry ON author_sessions(expires_at);
CREATE TABLE manuscripts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES authors(id),
  draft_json TEXT NOT NULL CHECK(json_valid(draft_json)),
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','changes_requested','published','withdrawn')),
  is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)),
  published_revision INTEGER,
  review_note TEXT NOT NULL DEFAULT '',
  mutation_id TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  submitted_at INTEGER
);
CREATE INDEX idx_manuscripts_author ON manuscripts(author_id, updated_at DESC);
CREATE INDEX idx_manuscripts_review ON manuscripts(status, submitted_at);
CREATE TABLE manuscript_revisions (
  manuscript_id TEXT NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  draft_json TEXT NOT NULL CHECK(json_valid(draft_json)),
  state TEXT NOT NULL CHECK(state IN ('pending','approved','rejected','cancelled')),
  note TEXT NOT NULL DEFAULT '',
  reviewer_id TEXT REFERENCES authors(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(manuscript_id, version)
);
-- Keep the public projection separate from private drafts and review snapshots.
CREATE VIEW published_articles AS
  SELECT articles.* FROM articles JOIN manuscripts ON manuscripts.id = articles.id
  WHERE manuscripts.is_public = 1;
