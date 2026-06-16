package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/gorm"
)

type AiNewsService struct {
	db *gorm.DB
}

func NewAiNewsService(db *gorm.DB) *AiNewsService {
	return &AiNewsService{db: db}
}

type CreateAiNewsInput struct {
	Slug       string
	Title      string
	Summary    string
	Content    string
	SourceName string
	SourceURL  string
	Category   string
	Tags       []string
	ImageURL   string
	Status     string
}

type UpdateAiNewsInput struct {
	Title      *string
	Summary    *string
	Content    *string
	SourceName *string
	SourceURL  *string
	Category   *string
	Tags       []string
	ImageURL   *string
	Status     *string
	Slug       *string
}

func (s *AiNewsService) List(status, category string, page, pageSize int) ([]model.AiNews, int64, error) {
	var news []model.AiNews
	var total int64

	query := s.db.Model(&model.AiNews{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}

	query.Count(&total)
	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("published_at DESC, created_at DESC").Find(&news)
	return news, total, result.Error
}

func (s *AiNewsService) GetBySlug(slug string) (*model.AiNews, error) {
	var news model.AiNews
	result := s.db.Where("slug = ?", slug).First(&news)
	if result.Error != nil {
		return nil, result.Error
	}
	return &news, nil
}

func (s *AiNewsService) Create(input CreateAiNewsInput) (*model.AiNews, error) {
	now := time.Now()
	var publishedAt *time.Time
	if input.Status == "published" {
		publishedAt = &now
	}

	news := model.AiNews{
		ID:         uuid.New(),
		Slug:       input.Slug,
		Title:      input.Title,
		Summary:    input.Summary,
		Content:    input.Content,
		SourceName: input.SourceName,
		SourceURL:  input.SourceURL,
		Category:   input.Category,
		Tags:       input.Tags,
		ImageURL:   input.ImageURL,
		Status:     "draft",
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if input.Status == "published" {
		news.Status = "published"
		news.PublishedAt = publishedAt
	} else if input.Status != "" {
		news.Status = input.Status
	}

	result := s.db.Create(&news)
	if result.Error != nil {
		return nil, result.Error
	}
	return &news, nil
}

func (s *AiNewsService) Update(id string, input UpdateAiNewsInput) (*model.AiNews, error) {
	var news model.AiNews
	if err := s.db.Where("id = ?", id).First(&news).Error; err != nil {
		return nil, err
	}

	if input.Title != nil {
		news.Title = *input.Title
	}
	if input.Summary != nil {
		news.Summary = *input.Summary
	}
	if input.Content != nil {
		news.Content = *input.Content
	}
	if input.SourceName != nil {
		news.SourceName = *input.SourceName
	}
	if input.SourceURL != nil {
		news.SourceURL = *input.SourceURL
	}
	if input.Category != nil {
		news.Category = *input.Category
	}
	if input.Tags != nil {
		news.Tags = input.Tags
	}
	if input.ImageURL != nil {
		news.ImageURL = *input.ImageURL
	}
	if input.Status != nil && *input.Status == "published" && news.Status != "published" {
		now := time.Now()
		news.PublishedAt = &now
	}
	if input.Status != nil {
		news.Status = *input.Status
	}
	if input.Slug != nil {
		news.Slug = *input.Slug
	}

	news.UpdatedAt = time.Now()
	if err := s.db.Save(&news).Error; err != nil {
		return nil, err
	}
	return &news, nil
}

func (s *AiNewsService) Delete(id string) error {
	return s.db.Where("id = ?", id).Delete(&model.AiNews{}).Error
}

func (s *AiNewsService) GetCategories() ([]string, error) {
	var categories []string
	result := s.db.Model(&model.AiNews{}).
		Select("DISTINCT category").
		Where("category != '' AND category IS NOT NULL").
		Order("category ASC").
		Pluck("category", &categories)
	return categories, result.Error
}
