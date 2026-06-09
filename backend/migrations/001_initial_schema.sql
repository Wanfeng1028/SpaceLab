-- SpaceLab 数据库初始迁移脚本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    role VARCHAR(20) DEFAULT 'viewer',
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- 文章表
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    cover_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    language VARCHAR(10) DEFAULT 'zh-CN',
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_published ON posts(published_at);

-- 媒体资源表
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    size BIGINT,
    width INTEGER,
    height INTEGER,
    duration FLOAT,
    type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_media_type ON media_assets(type);
CREATE INDEX idx_media_created ON media_assets(created_at);

-- 访问事件表
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    page_path VARCHAR(500),
    page_title VARCHAR(500),
    target_id UUID,
    target_type VARCHAR(50),
    referrer VARCHAR(500),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    language VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    cover_url VARCHAR(500),
    website_url VARCHAR(500),
    github_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'published',
    language VARCHAR(10) DEFAULT 'zh-CN',
    tags TEXT[],
    features TEXT[],
    technologies TEXT[],
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_count INTEGER DEFAULT 0
);

CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_author ON projects(author_id);

-- 初始化默认管理员用户（密码：admin123，需修改）
INSERT INTO users (id, email, password_hash, username, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@spacelab.com',
    'e99a18c428cb38d5f260853678922e03abc18d0c6b5f8c5b1d7e3f4a5b6c7d8e',
    'Administrator',
    'admin'
)
ON CONFLICT (email) DO NOTHING;
