package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/gorm"
)

type PostService struct {
	db *gorm.DB
}

type CreatePostInput struct {
	Slug       string
	Title      string
	Summary    string
	Content    string
	CoverURL   string
	Language   string
	AuthorID   string
}

type UpdatePostInput struct {
	Title       *string
	Summary     *string
	Content     *string
	CoverURL    *string
	Language    *string
	Status      *string
	PublishedAt *time.Time
}

func NewPostService(db *gorm.DB) *PostService {
	return &PostService{db: db}
}

// ListPosts 获取文章列表
func (s *PostService) ListPosts(status string, language string, page int, pageSize int) ([]model.Post, int64, error) {
	var posts []model.Post
	var total int64

	query := s.db.Model(&model.Post{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if language != "" {
		query = query.Where("language = ?", language)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("published_at DESC").Find(&posts)

	return posts, total, result.Error
}

// GetPostBySlug 根据 slug 获取文章
func (s *PostService) GetPostBySlug(slug string) (*model.Post, error) {
	var post model.Post
	result := s.db.Preload("Author").Where("slug = ?", slug).First(&post)
	
	if result.Error != nil {
		return nil, result.Error
	}
	
	return &post, nil
}

// CreatePost 创建文章
func (s *PostService) CreatePost(input CreatePostInput) (*model.Post, error) {
	// 检查 slug 是否已存在
	var existing model.Post
	s.db.Where("slug = ?", input.Slug).First(&existing)
	if existing.ID != uuid.Nil {
		return nil, errors.New("slug already exists")
	}

	post := model.Post{
		ID:         uuid.New(),
		Slug:       input.Slug,
		Title:      input.Title,
		Summary:    input.Summary,
		Content:    input.Content,
		CoverURL:   input.CoverURL,
		Language:   input.Language,
		AuthorID:   uuid.MustParse(input.AuthorID),
		Status:     "draft",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	result := s.db.Create(&post)
	if result.Error != nil {
		return nil, result.Error
	}

	return &post, nil
}

// UpdatePost 更新文章
func (s *PostService) UpdatePost(id string, input UpdatePostInput) (*model.Post, error) {
	var post model.Post
	result := s.db.Where("id = ?", id).First(&post)
	
	if result.Error != nil {
		return nil, result.Error
	}

	if input.Title != nil {
		post.Title = *input.Title
	}
	if input.Summary != nil {
		post.Summary = *input.Summary
	}
	if input.Content != nil {
		post.Content = *input.Content
	}
	if input.CoverURL != nil {
		post.CoverURL = *input.CoverURL
	}
	if input.Language != nil {
		post.Language = *input.Language
	}
	if input.Status != nil {
		post.Status = *input.Status
	}
	if input.Status != nil && *input.Status == "published" && post.PublishedAt == nil {
		now := time.Now()
		post.PublishedAt = &now
	}

	post.UpdatedAt = time.Now()

	result = s.db.Save(&post)
	if result.Error != nil {
		return nil, result.Error
	}

	return &post, nil
}

// DeletePost 删除文章
func (s *PostService) DeletePost(id string) error {
	result := s.db.Where("id = ?", id).Delete(&model.Post{})
	return result.Error
}

// IncrementViewCount 增加阅读量
func (s *PostService) IncrementViewCount(id string) error {
	return s.db.Model(&model.Post{}).Where("id = ?", id).Update("view_count", gorm.Expr("view_count + 1")).Error
}

// PublishPost 发布文章
func (s *PostService) PublishPost(id string) (*model.Post, error) {
	now := time.Now()
	return s.UpdatePost(id, UpdatePostInput{Status: func() *string { s := "published"; return &s }(), PublishedAt: &now})
}

// SaveDraft 保存草稿
func (s *PostService) SaveDraft(id string) (*model.Post, error) {
	return s.UpdatePost(id, UpdatePostInput{Status: func() *string { s := "draft"; return &s }()})
}
