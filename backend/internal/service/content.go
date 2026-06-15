package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/gorm"
)

// ─── Category ──────────────────────────────────────────────────────────

type CategoryService struct {
	db *gorm.DB
}

func NewCategoryService(db *gorm.DB) *CategoryService {
	return &CategoryService{db: db}
}

type CreateCategoryInput struct {
	Slug        string
	Name        string
	Description string
	Icon        string
	SortOrder   int
	ParentID    *string
}

type UpdateCategoryInput struct {
	Name        *string
	Description *string
	Icon        *string
	SortOrder   *int
	ParentID    *string
	Slug        *string
}

// ListCategories 获取分类列表（含树形结构）
func (s *CategoryService) ListCategories() ([]model.Category, error) {
	var categories []model.Category
	result := s.db.Order("sort_order ASC, created_at ASC").Find(&categories)
	if result.Error != nil {
		return nil, result.Error
	}
	return categories, nil
}

// GetCategoryTree 获取分类树形结构
func (s *CategoryService) GetCategoryTree() ([]model.Category, error) {
	var categories []model.Category
	result := s.db.Order("sort_order ASC, created_at ASC").Find(&categories)
	if result.Error != nil {
		return nil, result.Error
	}

	// 构建树形结构
	categoryMap := make(map[uuid.UUID]model.Category)
	for _, c := range categories {
		categoryMap[c.ID] = c
	}

	var roots []model.Category
	for _, c := range categories {
		if c.ParentID == nil {
			roots = append(roots, c)
		}
	}
	return roots, nil
}

// GetCategoryBySlug 根据 slug 获取分类
func (s *CategoryService) GetCategoryBySlug(slug string) (*model.Category, error) {
	var category model.Category
	result := s.db.Where("slug = ?", slug).First(&category)
	if result.Error != nil {
		return nil, result.Error
	}
	return &category, nil
}

// CreateCategory 创建分类
func (s *CategoryService) CreateCategory(input CreateCategoryInput) (*model.Category, error) {
	var parentID *uuid.UUID
	if input.ParentID != nil && *input.ParentID != "" {
		pUUID, err := uuid.Parse(*input.ParentID)
		if err != nil {
			return nil, err
		}
		parentID = &pUUID
	}

	category := model.Category{
		ID:          uuid.New(),
		Slug:        input.Slug,
		Name:        input.Name,
		Description: input.Description,
		Icon:        input.Icon,
		SortOrder:   input.SortOrder,
		ParentID:    parentID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	result := s.db.Create(&category)
	if result.Error != nil {
		return nil, result.Error
	}
	return &category, nil
}

// UpdateCategory 更新分类
func (s *CategoryService) UpdateCategory(id string, input UpdateCategoryInput) (*model.Category, error) {
	var category model.Category
	if err := s.db.Where("id = ?", id).First(&category).Error; err != nil {
		return nil, err
	}

	if input.Name != nil {
		category.Name = *input.Name
	}
	if input.Description != nil {
		category.Description = *input.Description
	}
	if input.Icon != nil {
		category.Icon = *input.Icon
	}
	if input.SortOrder != nil {
		category.SortOrder = *input.SortOrder
	}
	if input.Slug != nil {
		category.Slug = *input.Slug
	}
	if input.ParentID != nil {
		if *input.ParentID == "" {
			category.ParentID = nil
		} else {
			pUUID, err := uuid.Parse(*input.ParentID)
			if err == nil {
				category.ParentID = &pUUID
			}
		}
	}

	category.UpdatedAt = time.Now()
	if err := s.db.Save(&category).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

// DeleteCategory 删除分类
func (s *CategoryService) DeleteCategory(id string) error {
	return s.db.Where("id = ?", id).Delete(&model.Category{}).Error
}

// ─── Tag ───────────────────────────────────────────────────────────────

type TagService struct {
	db *gorm.DB
}

func NewTagService(db *gorm.DB) *TagService {
	return &TagService{db: db}
}

type CreateTagInput struct {
	Slug  string
	Name  string
	Color string
}

type UpdateTagInput struct {
	Name  *string
	Color *string
	Slug  *string
}

// ListTags 获取标签列表
func (s *TagService) ListTags() ([]model.Tag, error) {
	var tags []model.Tag
	result := s.db.Order("name ASC").Find(&tags)
	return tags, result.Error
}

// GetTagBySlug 根据 slug 获取标签
func (s *TagService) GetTagBySlug(slug string) (*model.Tag, error) {
	var tag model.Tag
	result := s.db.Where("slug = ?", slug).First(&tag)
	if result.Error != nil {
		return nil, result.Error
	}
	return &tag, nil
}

// CreateTag 创建标签
func (s *TagService) CreateTag(input CreateTagInput) (*model.Tag, error) {
	tag := model.Tag{
		ID:        uuid.New(),
		Slug:      input.Slug,
		Name:      input.Name,
		Color:     input.Color,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result := s.db.Create(&tag)
	if result.Error != nil {
		return nil, result.Error
	}
	return &tag, nil
}

// UpdateTag 更新标签
func (s *TagService) UpdateTag(id string, input UpdateTagInput) (*model.Tag, error) {
	var tag model.Tag
	if err := s.db.Where("id = ?", id).First(&tag).Error; err != nil {
		return nil, err
	}

	if input.Name != nil {
		tag.Name = *input.Name
	}
	if input.Color != nil {
		tag.Color = *input.Color
	}
	if input.Slug != nil {
		tag.Slug = *input.Slug
	}

	tag.UpdatedAt = time.Now()
	if err := s.db.Save(&tag).Error; err != nil {
		return nil, err
	}
	return &tag, nil
}

// DeleteTag 删除标签
func (s *TagService) DeleteTag(id string) error {
	return s.db.Where("id = ?", id).Delete(&model.Tag{}).Error
}

// ─── FriendLink ────────────────────────────────────────────────────────

type FriendLinkService struct {
	db *gorm.DB
}

func NewFriendLinkService(db *gorm.DB) *FriendLinkService {
	return &FriendLinkService{db: db}
}

type CreateFriendLinkInput struct {
	Name        string
	URL         string
	LogoURL     string
	Description string
	SortOrder   int
	Status      string
}

type UpdateFriendLinkInput struct {
	Name        *string
	URL         *string
	LogoURL     *string
	Description *string
	SortOrder   *int
	Status      *string
}

// ListFriendLinks 获取友链列表
func (s *FriendLinkService) ListFriendLinks(status string) ([]model.FriendLink, error) {
	var links []model.FriendLink
	query := s.db.Order("sort_order ASC, created_at ASC")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	result := query.Find(&links)
	return links, result.Error
}

// GetFriendLink 获取友链详情
func (s *FriendLinkService) GetFriendLink(id string) (*model.FriendLink, error) {
	var link model.FriendLink
	result := s.db.Where("id = ?", id).First(&link)
	if result.Error != nil {
		return nil, result.Error
	}
	return &link, nil
}

// CreateFriendLink 创建友链
func (s *FriendLinkService) CreateFriendLink(input CreateFriendLinkInput) (*model.FriendLink, error) {
	status := input.Status
	if status == "" {
		status = "active"
	}

	link := model.FriendLink{
		ID:          uuid.New(),
		Name:        input.Name,
		URL:         input.URL,
		LogoURL:     input.LogoURL,
		Description: input.Description,
		SortOrder:   input.SortOrder,
		Status:      status,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	result := s.db.Create(&link)
	if result.Error != nil {
		return nil, result.Error
	}
	return &link, nil
}

// UpdateFriendLink 更新友链
func (s *FriendLinkService) UpdateFriendLink(id string, input UpdateFriendLinkInput) (*model.FriendLink, error) {
	var link model.FriendLink
	if err := s.db.Where("id = ?", id).First(&link).Error; err != nil {
		return nil, err
	}

	if input.Name != nil {
		link.Name = *input.Name
	}
	if input.URL != nil {
		link.URL = *input.URL
	}
	if input.LogoURL != nil {
		link.LogoURL = *input.LogoURL
	}
	if input.Description != nil {
		link.Description = *input.Description
	}
	if input.SortOrder != nil {
		link.SortOrder = *input.SortOrder
	}
	if input.Status != nil {
		link.Status = *input.Status
	}

	link.UpdatedAt = time.Now()
	if err := s.db.Save(&link).Error; err != nil {
		return nil, err
	}
	return &link, nil
}

// DeleteFriendLink 删除友链
func (s *FriendLinkService) DeleteFriendLink(id string) error {
	return s.db.Where("id = ?", id).Delete(&model.FriendLink{}).Error
}
