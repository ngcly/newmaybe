-- apps/club/schema.sql
-- Cloudflare D1 Database Schema for newmaybe.club (文友雅集)

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_seal TEXT,
  topic_id TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  pub_date TEXT NOT NULL,
  reading_time INTEGER NOT NULL DEFAULT 3,
  word_count INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  series_title TEXT,
  series_order INTEGER,
  golden_quote TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles (pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles (topic_id);
CREATE INDEX IF NOT EXISTS idx_articles_series ON articles (series_title);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles (featured);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments (article_id, created_at DESC);

-- Anonymous writes are bounded per source and hour. Keys contain a SHA-256 digest,
-- not the source IP address. Apply this schema before deploying the updated Worker.
CREATE TABLE IF NOT EXISTS write_limits (
  key TEXT PRIMARY KEY,
  period_start INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_write_limits_period ON write_limits (period_start);
