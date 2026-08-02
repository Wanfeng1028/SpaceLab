-- 003_likes.sql - 点赞功能（likes 表 + posts.like_count 列）

-- 1. 文章点赞计数列（冗余存储，便于列表页快速读取）
ALTER TABLE posts ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;

-- 2. 点赞记录表（支持多内容类型：post/project/comment）
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL DEFAULT 'post',
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- 同一用户对同一目标仅可点赞一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique ON likes(target_type, target_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
