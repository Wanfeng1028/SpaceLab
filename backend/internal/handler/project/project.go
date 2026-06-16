package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/service"
	"github.com/spacelab/backend/internal/utils"
)

type ProjectHandler struct {
	projectService *service.ProjectService
}

func NewProjectHandler(projectService *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{projectService: projectService}
}

// ListProjects 获取项目列表
func (h *ProjectHandler) ListProjects(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	status := utils.SanitizePlainString(c.Query("status"))
	language := utils.SanitizePlainString(c.Query("language"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	projects, total, err := h.projectService.ListProjects(status, language, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projects":    projects,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": int((total + int64(pageSize-1)) / int64(pageSize)),
	})
}

// GetProjectBySlug 获取项目详情
func (h *ProjectHandler) GetProjectBySlug(c *gin.Context) {
	slug := c.Param("slug")

	project, err := h.projectService.GetProjectBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, project)
}

// CreateProject 创建项目
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var input service.CreateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	authorID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	input.AuthorID = authorID.(string)

	// 清洗输入字段
	input.Title = utils.SanitizePlainString(input.Title)
	input.Description = utils.SanitizePlainString(input.Description)
	input.Content = utils.SanitizeRichText(input.Content)
	input.CoverURL = utils.SanitizeLinkURL(input.CoverURL)
	input.WebsiteURL = utils.SanitizeLinkURL(input.WebsiteURL)
	input.GitHubURL = utils.SanitizeLinkURL(input.GitHubURL)

	project, err := h.projectService.CreateProject(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"create", "project", project.ID.String(),
		map[string]interface{}{"title": project.Title},
		c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusCreated, project)
}

// UpdateProject 更新项目
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	id := c.Param("id")

	var input service.UpdateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 清洗输入字段
	if input.Title != nil {
		sanitized := utils.SanitizePlainString(*input.Title)
		input.Title = &sanitized
	}
	if input.Description != nil {
		sanitized := utils.SanitizePlainString(*input.Description)
		input.Description = &sanitized
	}
	if input.Content != nil {
		sanitized := utils.SanitizeRichText(*input.Content)
		input.Content = &sanitized
	}
	if input.CoverURL != nil {
		sanitized := utils.SanitizeLinkURL(*input.CoverURL)
		input.CoverURL = &sanitized
	}
	if input.WebsiteURL != nil {
		sanitized := utils.SanitizeLinkURL(*input.WebsiteURL)
		input.WebsiteURL = &sanitized
	}
	if input.GitHubURL != nil {
		sanitized := utils.SanitizeLinkURL(*input.GitHubURL)
		input.GitHubURL = &sanitized
	}

	project, err := h.projectService.UpdateProject(id, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project"})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"update", "project", id,
		map[string]interface{}{"title": project.Title},
		c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, project)
}

// DeleteProject 删除项目
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	id := c.Param("id")

	err := h.projectService.DeleteProject(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"delete", "project", id,
		nil, c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

// IncrementViewCount 增加浏览量
func (h *ProjectHandler) IncrementViewCount(c *gin.Context) {
	id := c.Param("id")

	err := h.projectService.IncrementViewCount(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to increment view count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "View count incremented"})
}
