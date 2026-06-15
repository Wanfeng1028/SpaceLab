package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/service"
)

// ─── Category ──────────────────────────────────────────────────────────

type CategoryHandler struct {
	categoryService *service.CategoryService
}

func NewCategoryHandler(categoryService *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: categoryService}
}

// ListCategories 获取分类列表（公开）
func (h *CategoryHandler) ListCategories(c *gin.Context) {
	categories, err := h.categoryService.ListCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// GetCategoryTree 获取分类树形结构（公开）
func (h *CategoryHandler) GetCategoryTree(c *gin.Context) {
	tree, err := h.categoryService.GetCategoryTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": tree})
}

// GetCategoryBySlug 根据 slug 获取分类（公开）
func (h *CategoryHandler) GetCategoryBySlug(c *gin.Context) {
	slug := c.Param("slug")
	category, err := h.categoryService.GetCategoryBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	c.JSON(http.StatusOK, category)
}

// CreateCategory 创建分类（管理员）
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var input struct {
		Slug        string `json:"slug" binding:"required"`
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Icon        string `json:"icon"`
		SortOrder   int    `json:"sort_order"`
		ParentID    string `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	var parentID *string
	if input.ParentID != "" {
		parentID = &input.ParentID
	}

	category, err := h.categoryService.CreateCategory(service.CreateCategoryInput{
		Slug:        input.Slug,
		Name:        input.Name,
		Description: input.Description,
		Icon:        input.Icon,
		SortOrder:   input.SortOrder,
		ParentID:    parentID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, category)
}

// UpdateCategory 更新分类（管理员）
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	id := c.Param("id")

	var input struct {
		Slug        *string `json:"slug"`
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Icon        *string `json:"icon"`
		SortOrder   *int    `json:"sort_order"`
		ParentID    *string `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	category, err := h.categoryService.UpdateCategory(id, service.UpdateCategoryInput{
		Slug:        input.Slug,
		Name:        input.Name,
		Description: input.Description,
		Icon:        input.Icon,
		SortOrder:   input.SortOrder,
		ParentID:    input.ParentID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, category)
}

// DeleteCategory 删除分类（管理员）
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	id := c.Param("id")

	if err := h.categoryService.DeleteCategory(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

// ─── Tag ───────────────────────────────────────────────────────────────

type TagHandler struct {
	tagService *service.TagService
}

func NewTagHandler(tagService *service.TagService) *TagHandler {
	return &TagHandler{tagService: tagService}
}

// ListTags 获取标签列表（公开）
func (h *TagHandler) ListTags(c *gin.Context) {
	tags, err := h.tagService.ListTags()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tags": tags})
}

// GetTagBySlug 根据 slug 获取标签（公开）
func (h *TagHandler) GetTagBySlug(c *gin.Context) {
	slug := c.Param("slug")
	tag, err := h.tagService.GetTagBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}
	c.JSON(http.StatusOK, tag)
}

// CreateTag 创建标签（管理员）
func (h *TagHandler) CreateTag(c *gin.Context) {
	var input struct {
		Slug  string `json:"slug" binding:"required"`
		Name  string `json:"name" binding:"required"`
		Color string `json:"color"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	tag, err := h.tagService.CreateTag(service.CreateTagInput{
		Slug:  input.Slug,
		Name:  input.Name,
		Color: input.Color,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, tag)
}

// UpdateTag 更新标签（管理员）
func (h *TagHandler) UpdateTag(c *gin.Context) {
	id := c.Param("id")

	var input struct {
		Slug  *string `json:"slug"`
		Name  *string `json:"name"`
		Color *string `json:"color"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	tag, err := h.tagService.UpdateTag(id, service.UpdateTagInput{
		Slug:  input.Slug,
		Name:  input.Name,
		Color: input.Color,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tag)
}

// DeleteTag 删除标签（管理员）
func (h *TagHandler) DeleteTag(c *gin.Context) {
	id := c.Param("id")

	if err := h.tagService.DeleteTag(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted successfully"})
}

// ─── FriendLink ────────────────────────────────────────────────────────

type FriendLinkHandler struct {
	friendLinkService *service.FriendLinkService
}

func NewFriendLinkHandler(friendLinkService *service.FriendLinkService) *FriendLinkHandler {
	return &FriendLinkHandler{friendLinkService: friendLinkService}
}

// ListFriendLinks 获取友链列表（公开，默认只显示 active）
func (h *FriendLinkHandler) ListFriendLinks(c *gin.Context) {
	status := c.DefaultQuery("status", "active")
	links, err := h.friendLinkService.ListFriendLinks(status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"friend_links": links})
}

// GetFriendLink 获取友链详情
func (h *FriendLinkHandler) GetFriendLink(c *gin.Context) {
	id := c.Param("id")
	link, err := h.friendLinkService.GetFriendLink(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Friend link not found"})
		return
	}
	c.JSON(http.StatusOK, link)
}

// CreateFriendLink 创建友链（管理员）
func (h *FriendLinkHandler) CreateFriendLink(c *gin.Context) {
	var input struct {
		Name        string `json:"name" binding:"required"`
		URL         string `json:"url" binding:"required"`
		LogoURL     string `json:"logo_url"`
		Description string `json:"description"`
		SortOrder   int    `json:"sort_order"`
		Status      string `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	link, err := h.friendLinkService.CreateFriendLink(service.CreateFriendLinkInput{
		Name:        input.Name,
		URL:         input.URL,
		LogoURL:     input.LogoURL,
		Description: input.Description,
		SortOrder:   input.SortOrder,
		Status:      input.Status,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, link)
}

// UpdateFriendLink 更新友链（管理员）
func (h *FriendLinkHandler) UpdateFriendLink(c *gin.Context) {
	id := c.Param("id")

	var input struct {
		Name        *string `json:"name"`
		URL         *string `json:"url"`
		LogoURL     *string `json:"logo_url"`
		Description *string `json:"description"`
		SortOrder   *int    `json:"sort_order"`
		Status      *string `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	link, err := h.friendLinkService.UpdateFriendLink(id, service.UpdateFriendLinkInput{
		Name:        input.Name,
		URL:         input.URL,
		LogoURL:     input.LogoURL,
		Description: input.Description,
		SortOrder:   input.SortOrder,
		Status:      input.Status,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, link)
}

// DeleteFriendLink 删除友链（管理员）
func (h *FriendLinkHandler) DeleteFriendLink(c *gin.Context) {
	id := c.Param("id")

	if err := h.friendLinkService.DeleteFriendLink(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend link deleted successfully"})
}
