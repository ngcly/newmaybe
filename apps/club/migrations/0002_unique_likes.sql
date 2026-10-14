-- One reaction per Cloudflare source digest and target. Existing totals are preserved.
CREATE TABLE article_likes (
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  PRIMARY KEY (article_id, source)
);
CREATE TABLE comment_likes (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  PRIMARY KEY (comment_id, source)
);
CREATE TRIGGER article_like_added AFTER INSERT ON article_likes BEGIN
  UPDATE articles SET likes = likes + 1 WHERE id = NEW.article_id;
END;
CREATE TRIGGER comment_like_added AFTER INSERT ON comment_likes BEGIN
  UPDATE comments SET likes = likes + 1 WHERE id = NEW.comment_id;
END;
