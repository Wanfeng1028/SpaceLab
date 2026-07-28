-- SpaceLab OAuth 登录迁移：添加 OAuth 字段到 users 表

-- 添加 OAuth 字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) DEFAULT '',
ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255) DEFAULT '';

-- 创建复合索引，加速通过 OAuth 提供商查找用户
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users (oauth_provider, oauth_id);

-- 将 password_hash 改为可空（OAuth 用户无需密码）
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 将 status 默认值改为 active（OAuth 用户自动激活，无需邮箱验证）
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
