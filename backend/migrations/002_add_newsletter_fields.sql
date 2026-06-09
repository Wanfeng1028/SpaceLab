-- SpaceLab 邮件服务迁移：添加 newsletter 相关字段

-- 给 users 表添加 newsletter 字段
ALTER TABLE users
ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN newsletter_opt_in BOOLEAN DEFAULT FALSE,
ADD COLUMN newsletter_opt_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN mailerlite_subscriber_id VARCHAR(255),
ADD COLUMN newsletter_unsubscribed_at TIMESTAMP WITH TIME ZONE;
