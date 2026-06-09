package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/service"
)

type PostHandler struct {
	postService *service.PostService
}

func NewPostHandler(postService *service.PostService) *PostHandler {
	return &PostHandler{postService: postService}
}

// ListPosts 获取文章列表
func (h *PostHandler) ListPosts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	status := c.Query("status")
	language := c.Query("language")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	posts, total, err := h.postService.ListPosts(status, language, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := struct {
		Posts     []Post `json:"posts"`
		Total     int64  `json:"total"`
		Page      int    `json:"page"`
		PageSize  int    `json:"page_size"`
		TotalPages int   `json:"total_pages"`
	}{
		Posts:     posts,
		Total:     total,
		Page:      page,
		PageSize:  pageSize,
		TotalPages: int((total + int64(pageSize-1)) / int64(pageSize)),
	}

	c.JSON(http.StatusOK, response)
}

// GetPostBySlug 获取文章详情
func (h *PostHandler) GetPostBySlug(c *gin.Context) {
	slug := c.Param("slug")

	post, err := h.postService.GetPostBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	c.JSON(http.StatusOK, post)
}

// CreatePost 创建文章
func (h *PostHandler) CreatePost(c *gin.Context) {
	var input service.CreatePostInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := h.postService.CreatePost(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, post)
}

// UpdatePost 更新文章
func (h *PostHandler) UpdatePost(c *gin.Context) {
	id := c.Param("id")
	
	var input service.UpdatePostInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := h.postService.UpdatePost(id, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, post)
}

// DeletePost 删除文章
func (h *PostHandler) DeletePost(c *gin.Context) {
	id := c.Param("id")

	err := h.postService.DeletePost(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post deleted successfully"})
}

// PublishPost 发布文章
func (h *PostHandler) PublishPost(c *gin.Context) {
	id := c.Param("id")

	post, err := h.postService.PublishPost(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, post)
}

// IncrementViewCount 增加阅读量
func (h *PostHandler) IncrementViewCount(c *gin.Context) {
	id := c.Param("id")

	err := h.postService.IncrementViewCount(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "View count incremented"})
}
