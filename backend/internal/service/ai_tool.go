package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/gorm"
)

type AiToolService struct {
	db *gorm.DB
}

func NewAiToolService(db *gorm.DB) *AiToolService {
	return &AiToolService{db: db}
}

type CreateAiToolInput struct {
	Title       string
	Summary     string
	Category    string
	Source      string
	URL         string
	Tags        []string
	PublishedAt string
	FetchedAt   string
}

func (s *AiToolService) List(category, search string, page, pageSize int) ([]model.AiTool, int64, error) {
	var tools []model.AiTool
	var total int64

	query := s.db.Model(&model.AiTool{})
	if category != "" && category != "all" {
		query = query.Where("category = ?", category)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("title ILIKE ? OR summary ILIKE ? OR source ILIKE ?", like, like, like)
	}

	query.Count(&total)
	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("published_at DESC, created_at DESC").Find(&tools)
	return tools, total, result.Error
}

func (s *AiToolService) Create(input CreateAiToolInput) (*model.AiTool, error) {
	now := time.Now()
	tool := model.AiTool{
		ID:          uuid.New(),
		Title:       input.Title,
		Summary:     input.Summary,
		Category:    input.Category,
		Source:      input.Source,
		URL:         input.URL,
		Tags:        input.Tags,
		PublishedAt: input.PublishedAt,
		FetchedAt:   input.FetchedAt,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.db.Create(&tool).Error; err != nil {
		return nil, err
	}
	return &tool, nil
}

func (s *AiToolService) GetCategories() ([]string, error) {
	var categories []string
	s.db.Model(&model.AiTool{}).
		Select("DISTINCT category").
		Where("category != '' AND category IS NOT NULL").
		Order("category ASC").
		Pluck("category", &categories)
	return categories, nil
}
