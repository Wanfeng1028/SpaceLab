-- 004_add_likes.sql
-- 点赞功能：新增 likes 表 + posts.like_count 列
-- 说明：Go 后端启动时会通过 GORM AutoMigrate 自动创建/更新，
--       此文件用于手动初始化数据库或对齐 schema。

-- 1. 文章点赞计数列（冗余存储，便于列表页快速读取）
ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- 2. 点赞记录表（支持多内容类型：post/project/comment）
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(50) NOT NULL DEFAULT 'post',
    target_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (target_type, target_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
