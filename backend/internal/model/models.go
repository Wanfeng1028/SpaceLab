package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID                uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Email             string     `gorm:"uniqueIndex;size:255;not null" json:"email"`
	PasswordHash      string     `gorm:"size:255;not null" json:"-"`
	Username          string     `gorm:"size:100" json:"username"`
	Role              string     `gorm:"size:20;default:'viewer'" json:"role"`           // admin, writer, viewer
	Status            string     `gorm:"size:20;default:'pending_verify'" json:"status"` // active, pending_verify, locked, banned
	AvatarURL         string     `gorm:"size:500" json:"avatar_url"`
	EmailVerifiedAt   *time.Time `json:"email_verified_at,omitempty"`
	LoginFailCount    int        `gorm:"default:0" json:"login_fail_count"`
	LockedUntil       *time.Time `json:"locked_until,omitempty"`
	LastLoginAt       *time.Time `json:"last_login_at,omitempty"`
	LastLoginIP       string     `gorm:"size:45" json:"last_login_ip,omitempty"`
	NewsletterOptIn   bool       `gorm:"default:false" json:"newsletter_opt_in"`
	NewsletterOptInAt *time.Time `json:"newsletter_opt_in_at,omitempty"`
	MailerLiteID      string     `gorm:"size:255" json:"mailerlite_id,omitempty"`
	NewsletterUnsubAt *time.Time `json:"newsletter_unsubscribed_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	Posts             []Post     `gorm:"foreignkey:AuthorID" json:"posts,omitempty"`
	Comments          []Comment  `gorm:"foreignkey:UserID" json:"comments,omitempty"`
}

// LoginLog 登录日志
type LoginLog struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	Email      string    `gorm:"size:255;index" json:"email"`
	IP         string    `gorm:"size:45;index" json:"ip"`
	UserAgent  string    `gorm:"size:500" json:"user_agent"`
	DeviceInfo string    `gorm:"size:200" json:"device_info"`
	Success    bool      `gorm:"default:false" json:"success"`
	FailReason string    `gorm:"size:200" json:"fail_reason,omitempty"`
	LoginAt    time.Time `gorm:"index" json:"login_at"`
}

// RiskEvent 风险事件
type RiskEvent struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	EventType string    `gorm:"size:50;index" json:"event_type"` // new_device, new_ip, brute_force, admin_login_fail, suspicious_activity
	IP        string    `gorm:"size:45" json:"ip"`
	UserAgent string    `gorm:"size:500" json:"user_agent"`
	Details   string    `gorm:"type:text" json:"details"`
	Resolved  bool      `gorm:"default:false" json:"resolved"`
	CreatedAt time.Time `json:"created_at"`
}

// SiteSetting 站点设置（包括是否开放注册等开关）
type SiteSetting struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Key       string    `gorm:"uniqueIndex;size:100;not null" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Post 文章模型
type Post struct {
	ID              uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	Slug            string         `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	Title           string         `gorm:"size:500;not null" json:"title"`
	Summary         string         `gorm:"type:text" json:"summary"`
	Content         string         `gorm:"type:text" json:"content"`
	CoverURL        string         `gorm:"size:500" json:"cover_url"`
	Category        string         `gorm:"size:100" json:"category"`
	Tags            []string       `gorm:"type:text[]" json:"tags"`
	ReadingTime     int            `gorm:"default:0" json:"reading_time"`
	Status          string         `gorm:"size:20;default:'draft'" json:"status"` // draft, scheduled, published, archived
	Language        string         `gorm:"size:10;default:'zh-CN'" json:"language"`
	AuthorID        uuid.UUID      `gorm:"type:uuid" json:"author_id"`
	Author          User           `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	PublishedAt     *time.Time     `json:"published_at"`
	ScheduledAt     *time.Time     `json:"scheduled_at"`
	ViewCount       int            `gorm:"default:0" json:"view_count"`
	CommentsEnabled bool           `gorm:"default:true" json:"comments_enabled"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	Comments        []Comment      `gorm:"foreignKey:ContentID;references:ID" json:"comments,omitempty"`
}

// Comment 评论模型（支持多内容类型）
type Comment struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	ContentType string         `gorm:"size:50;default:'post';index:idx_content" json:"content_type"` // post, project, page
	ContentID   uuid.UUID      `gorm:"type:uuid;index:idx_content" json:"content_id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	ParentID    *uuid.UUID     `gorm:"type:uuid" json:"parent_id"`
	Content     string         `gorm:"type:text;not null" json:"content"`
	Status      string         `gorm:"size:20;default:'pending'" json:"status"` // pending, approved, rejected, spam
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	User        User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Parent      *Comment       `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Replies     []Comment      `gorm:"foreignKey:ParentID" json:"replies,omitempty"`
}

// MediaAsset 媒体资源模型
type MediaAsset struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Filename     string    `gorm:"size:255;not null" json:"filename"`
	OriginalName string    `gorm:"size:255" json:"original_name"`
	StoragePath  string    `gorm:"size:500;not null" json:"storage_path"`
	URL          string    `gorm:"size:500" json:"url"`
	MimeType     string    `gorm:"size:100" json:"mime_type"`
	Size         int64     `json:"size"`
	Width        *int      `json:"width,omitempty"`
	Height       *int      `json:"height,omitempty"`
	Duration     *float64  `json:"duration,omitempty"`
	Type         string    `gorm:"size:20" json:"type"` // image, gif, video, model
	AltText      string    `gorm:"size:255" json:"alt_text"`
	UploadedBy   uuid.UUID `gorm:"type:uuid" json:"uploaded_by"`
	CreatedAt    time.Time `json:"created_at"`
}

// AnalyticsEvent 分析事件模型
type AnalyticsEvent struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	EventType  string     `gorm:"size:50;not null;index" json:"event_type"`
	PagePath   string     `gorm:"size:500" json:"page_path"`
	PageTitle  string     `gorm:"size:500" json:"page_title"`
	TargetID   *uuid.UUID `gorm:"type:uuid" json:"target_id"`
	TargetType string     `gorm:"size:50" json:"target_type"`
	Referrer   string     `gorm:"size:500" json:"referrer"`
	DeviceType string     `gorm:"size:50" json:"device_type"`
	Browser    string     `gorm:"size:100" json:"browser"`
	Language   string     `gorm:"size:10" json:"language"`
	UserAgent  string     `gorm:"size:500" json:"user_agent"`
	IPAddress  string     `gorm:"size:45" json:"ip_address"`
	Country    string     `gorm:"size:10" json:"country"`
	City       string     `gorm:"size:100" json:"city"`
	SessionID  string     `gorm:"size:100;index" json:"session_id"`
	UserID     string     `gorm:"size:36;index" json:"user_id"`
	Duration   int        `json:"duration"`
	Metadata   string     `gorm:"type:text" json:"metadata"`
	CreatedAt  time.Time  `gorm:"index" json:"created_at"`
}

// Project 项目模型
type Project struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	Slug         string         `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	Title        string         `gorm:"size:255;not null" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	Content      string         `gorm:"type:text" json:"content"`
	CoverURL     string         `gorm:"size:500" json:"cover_url"`
	WebsiteURL   string         `gorm:"size:500" json:"website_url"`
	GitHubURL    string         `gorm:"size:500" json:"github_url"`
	Language     string         `gorm:"size:50" json:"language"`
	Tags         []string       `gorm:"type:text[]" json:"tags"`
	Features     []string       `gorm:"type:text[]" json:"features"`
	Technologies []string       `gorm:"type:text[]" json:"technologies"`
	Status       string         `gorm:"size:20;default:'published'" json:"status"` // draft, published, archived
	ViewCount    int            `gorm:"default:0" json:"view_count"`
	AuthorID     uuid.UUID      `gorm:"type:uuid" json:"author_id"`
	Author       User           `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	PublishedAt  *time.Time     `json:"published_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// EmailVerificationToken 邮箱验证令牌
type EmailVerificationToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	TokenHash string    `gorm:"size:64;not null" json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
}

// PasswordResetToken 密码重置令牌
type PasswordResetToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	TokenHash string    `gorm:"size:64;not null" json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
}

// Category 分类模型（用于文章分类管理）
type Category struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Slug        string     `gorm:"uniqueIndex;size:100;not null" json:"slug"`
	Name        string     `gorm:"size:100;not null" json:"name"`
	Description string     `gorm:"type:text" json:"description"`
	Icon        string     `gorm:"size:100" json:"icon"`
	SortOrder   int        `gorm:"default:0" json:"sort_order"`
	ParentID    *uuid.UUID `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Parent      *Category  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children    []Category `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// Tag 标签模型（用于文章标签管理）
type Tag struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Slug      string    `gorm:"uniqueIndex;size:100;not null" json:"slug"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Color     string    `gorm:"size:20" json:"color"` // 颜色标识，如 #1890ff
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// FriendLink 友情链接模型
type FriendLink struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	URL         string    `gorm:"size:500;not null" json:"url"`
	LogoURL     string    `gorm:"size:500" json:"logo_url"`
	Description string    `gorm:"type:text" json:"description"`
	SortOrder   int       `gorm:"default:0" json:"sort_order"`
	Status      string    `gorm:"size:20;default:'pending'" json:"status"` // pending, active, inactive
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// AdminAuditLog 管理员审计日志
type AdminAuditLog struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	AdminID    uuid.UUID `gorm:"type:uuid;index" json:"admin_id"`
	AdminName  string    `gorm:"size:100" json:"admin_name"`
	Action     string    `gorm:"size:50;index;not null" json:"action"`      // create, update, delete, approve, reject, ban, unban, lock, unlock, reset_password, update_setting
	TargetType string    `gorm:"size:50;index;not null" json:"target_type"` // user, post, comment, friend_link, category, tag, setting
	TargetID   string    `gorm:"size:100;index" json:"target_id"`
	Details    string    `gorm:"type:text" json:"details"`
	IP         string    `gorm:"size:45" json:"ip"`
	UserAgent  string    `gorm:"size:500" json:"user_agent"`
	CreatedAt  time.Time `gorm:"index" json:"created_at"`
}

// SensitiveWord 敏感词
type SensitiveWord struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Word      string    `gorm:"uniqueIndex;size:100;not null" json:"word"`
	Category  string    `gorm:"size:50" json:"category"` // profanity, spam, politics, ads
	CreatedAt time.Time `json:"created_at"`
}

// CommentReport 评论举报
type CommentReport struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	CommentID   uuid.UUID  `gorm:"type:uuid;index;not null" json:"comment_id"`
	ReporterID  uuid.UUID  `gorm:"type:uuid;index;not null" json:"reporter_id"`
	Reason      string     `gorm:"size:200;not null" json:"reason"` // spam, harassment, inappropriate, other
	Description string     `gorm:"type:text" json:"description"`
	Status      string     `gorm:"size:20;default:'pending';index" json:"status"` // pending, reviewed, dismissed
	ReviewedBy  *uuid.UUID `gorm:"type:uuid" json:"reviewed_by,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// AiNews AI 前线新闻条目
type AiNews struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Slug        string     `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	Title       string     `gorm:"size:500;not null" json:"title"`
	Summary     string     `gorm:"type:text" json:"summary"`
	Content     string     `gorm:"type:text" json:"content"`
	SourceName  string     `gorm:"size:200" json:"source_name"`
	SourceURL   string     `gorm:"size:500" json:"source_url"`
	Category    string     `gorm:"size:50;index" json:"category"` // model, product, funding, opensource, agent, tool, industry
	Tags        []string   `gorm:"type:text[]" json:"tags"`
	ImageURL    string     `gorm:"size:500" json:"image_url"`
	Status      string     `gorm:"size:20;default:'draft'" json:"status"` // draft, published, archived
	PublishedAt *time.Time `json:"published_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// AiTool 实验室 AI 工具
type AiTool struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Title       string    `gorm:"size:500;not null" json:"title"`
	Summary     string    `gorm:"type:text" json:"summary"`
	Category    string    `gorm:"size:100;index" json:"category"`
	Source      string    `gorm:"size:200" json:"source"`
	URL         string    `gorm:"size:500" json:"url"`
	Tags        []string  `gorm:"type:text[]" json:"tags"`
	PublishedAt string    `gorm:"size:20" json:"published_at"`
	FetchedAt   string    `gorm:"size:30" json:"fetched_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
