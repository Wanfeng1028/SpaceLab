package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/gorm"
)

type ProjectService struct {
	db *gorm.DB
}

type CreateProjectInput struct {
	Slug           string
	Title          string
	Description    string
	Content        string
	CoverURL       string
	WebsiteURL     string
	GitHubURL      string
	Language       string
	Tags           []string
	Features       []string
	Technologies   []string
	AuthorID       string
}

type UpdateProjectInput struct {
	Title        *string
	Description  *string
	Content      *string
	CoverURL     *string
	WebsiteURL   *string
	GitHubURL    *string
	Language     *string
	Status       *string
	Tags         []string
	Features     []string
	Technologies []string
}

func NewProjectService(db *gorm.DB) *ProjectService {
	return &ProjectService{db: db}
}

// ListProjects 获取项目列表
func (s *ProjectService) ListProjects(status, language string, page, pageSize int) ([]model.Project, int64, error) {
	var projects []model.Project
	var total int64

	query := s.db.Model(&model.Project{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if language != "" {
		query = query.Where("language = ?", language)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	result := query.Preload("Author").Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&projects)

	return projects, total, result.Error
}

// GetProjectBySlug 根据 slug 获取项目
func (s *ProjectService) GetProjectBySlug(slug string) (*model.Project, error) {
	var project model.Project
	result := s.db.Preload("Author").Where("slug = ?", slug).First(&project)

	if result.Error != nil {
		return nil, result.Error
	}

	return &project, nil
}

// CreateProject 创建项目
func (s *ProjectService) CreateProject(input CreateProjectInput) (*model.Project, error) {
	var existing model.Project
	s.db.Where("slug = ?", input.Slug).First(&existing)
	if existing.ID != uuid.Nil {
		return nil, errors.New("slug already exists")
	}

	authorID, err := uuid.Parse(input.AuthorID)
	if err != nil {
		return nil, errors.New("invalid author ID")
	}

	project := model.Project{
		ID:           uuid.New(),
		Slug:         input.Slug,
		Title:        input.Title,
		Description:  input.Description,
		Content:      input.Content,
		CoverURL:     input.CoverURL,
		WebsiteURL:   input.WebsiteURL,
		GitHubURL:    input.GitHubURL,
		Language:     input.Language,
		Tags:         input.Tags,
		Features:     input.Features,
		Technologies: input.Technologies,
		AuthorID:     authorID,
		Status:       "published",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	result := s.db.Create(&project)
	if result.Error != nil {
		return nil, result.Error
	}

	return &project, nil
}

// UpdateProject 更新项目
func (s *ProjectService) UpdateProject(id string, input UpdateProjectInput) (*model.Project, error) {
	var project model.Project
	result := s.db.Where("id = ?", id).First(&project)
	if result.Error != nil {
		return nil, result.Error
	}

	if input.Title != nil {
		project.Title = *input.Title
	}
	if input.Description != nil {
		project.Description = *input.Description
	}
	if input.Content != nil {
		project.Content = *input.Content
	}
	if input.CoverURL != nil {
		project.CoverURL = *input.CoverURL
	}
	if input.WebsiteURL != nil {
		project.WebsiteURL = *input.WebsiteURL
	}
	if input.GitHubURL != nil {
		project.GitHubURL = *input.GitHubURL
	}
	if input.Language != nil {
		project.Language = *input.Language
	}
	if input.Status != nil {
		project.Status = *input.Status
	}
	if input.Tags != nil {
		project.Tags = input.Tags
	}
	if input.Features != nil {
		project.Features = input.Features
	}
	if input.Technologies != nil {
		project.Technologies = input.Technologies
	}

	project.UpdatedAt = time.Now()

	result = s.db.Save(&project)
	if result.Error != nil {
		return nil, result.Error
	}

	return &project, nil
}

// DeleteProject 删除项目
func (s *ProjectService) DeleteProject(id string) error {
	result := s.db.Where("id = ?", id).Delete(&model.Project{})
	return result.Error
}

// IncrementViewCount 增加浏览量
func (s *ProjectService) IncrementViewCount(id string) error {
	return s.db.Model(&model.Project{}).Where("id = ?", id).Update("view_count", gorm.Expr("view_count + 1")).Error
}
