package model

import (
	"time"

	"github.com/google/uuid"
)

// User 用户模型
type User struct {
	ID                uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Email             string     `gorm:"uniqueIndex;size:255;not null" json:"email"`
	PasswordHash      string     `gorm:"size:255;not null" json:"-"`
	Username          string     `gorm:"size:100" json:"username"`
	Role              string     `gorm:"size:20;default:'viewer'" json:"role"` // admin, writer, viewer
	Status            string     `gorm:"size:20;default:'active'" json:"status"` // active, banned
	AvatarURL         string     `gorm:"size:500" json:"avatar_url"`
	EmailVerifiedAt   *time.Time `json:"email_verified_at,omitempty"`
	NewsletterOptIn   bool       `gorm:"default:false" json:"newsletter_opt_in"`
	NewsletterOptInAt *time.Time `json:"newsletter_opt_in_at,omitempty"`
	MailerLiteID      string     `gorm:"size:255" json:"mailerlite_id,omitempty"`
	NewsletterUnsubAt *time.Time `json:"newsletter_unsubscribed_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	Posts             []Post     `gorm:"foreignkey:AuthorID" json:"posts,omitempty"`
	Comments          []Comment  `gorm:"foreignkey:UserID" json:"comments,omitempty"`
}

// Post 文章模型
type Post struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Slug        string     `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	Title       string     `gorm:"size:500;not null" json:"title"`
	Summary     string     `gorm:"type:text" json:"summary"`
	Content     string     `gorm:"type:text" json:"content"`
	CoverURL    string     `gorm:"size:500" json:"cover_url"`
	Status      string     `gorm:"size:20;default:'draft'" json:"status"` // draft, published, archived
	Language    string     `gorm:"size:10;default:'zh-CN'" json:"language"`
	AuthorID    uuid.UUID  `gorm:"type:uuid" json:"author_id"`
	Author      User       `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	PublishedAt *time.Time `json:"published_at"`
	ViewCount   int        `gorm:"default:0" json:"view_count"`
	Comments    []Comment  `gorm:"foreignkey:PostID" json:"comments,omitempty"`
}

// Comment 评论模型
type Comment struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	PostID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"post_id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	ParentID  *uuid.UUID `gorm:"type:uuid" json:"parent_id"`
	Content   string     `gorm:"type:text;not null" json:"content"`
	Status    string     `gorm:"size:20;default:'pending'" json:"status"` // pending, approved, rejected
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	User      User       `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Parent    *Comment   `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Replies   []Comment  `gorm:"foreignKey:ParentID" json:"replies,omitempty"`
}

// MediaAsset 媒体资源模型
type MediaAsset struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Filename     string    `gorm:"size:255;not null" json:"filename"`
	OriginalName string    `gorm:"size:255" json:"original_name"`
	StoragePath  string    `gorm:"size:500;not null" json:"storage_path"`
	MimeType     string    `gorm:"size:100" json:"mime_type"`
	Size         int64     `json:"size"`
	Width        *int      `json:"width,omitempty"`
	Height       *int      `json:"height,omitempty"`
	Duration     *float64  `json:"duration,omitempty"`
	Type         string    `gorm:"size:20" json:"type"` // image, gif, video, model
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
	CreatedAt  time.Time  `gorm:"index" json:"created_at"`
}

// Project 项目模型
type Project struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Slug         string    `gorm:"uniqueIndex;size:255;not null" json:"slug"`
	Title        string    `gorm:"size:500;not null" json:"title"`
	Description  string    `gorm:"type:text" json:"description"`
	Content      string    `gorm:"type:text" json:"content"`
	CoverURL     string    `gorm:"size:500" json:"cover_url"`
	WebsiteURL   string    `gorm:"size:500" json:"website_url"`
	GitHubURL    string    `gorm:"size:500" json:"github_url"`
	Status       string    `gorm:"size:20;default:'published'" json:"status"`
	Language     string    `gorm:"size:10;default:'zh-CN'" json:"language"`
	Tags         []string  `gorm:"type:text[]" json:"tags"`
	Features     []string  `gorm:"type:text[]" json:"features"`
	Technologies []string  `gorm:"type:text[]" json:"technologies"`
	AuthorID     uuid.UUID `gorm:"type:uuid" json:"author_id"`
	Author       User      `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	ViewCount    int       `gorm:"default:0" json:"view_count"`
}

// PasswordResetToken 密码重置 Token（随机生成，存储到数据库）
type PasswordResetToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	TokenHash string    `gorm:"size:255;not null;index" json:"-"`
	ExpiresAt time.Time `gorm:"not null;index" json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
}
