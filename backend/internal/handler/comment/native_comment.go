package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/service"
)

// NativeCommentHandler 自研评论处理器
type NativeCommentHandler struct {
	commentService *service.CommentService
}

func NewNativeCommentHandler(commentService *service.CommentService) *NativeCommentHandler {
	return &NativeCommentHandler{commentService: commentService}
}

// GetComments 获取文章评论
func (h *NativeCommentHandler) GetComments(c *gin.Context) {
	postID := c.Param("id")

	comments, err := h.commentService.GetComments(postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 只返回已审核通过的评论
	var approved []model.Comment
	for _, comment := range comments {
		if comment.Status == "approved" {
			approved = append(approved, comment)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"comments": approved,
		"total":    len(approved),
	})
}

// GetCommentCount 获取评论数
func (h *NativeCommentHandler) GetCommentCount(c *gin.Context) {
	postID := c.Param("id")

	count, err := h.commentService.GetCommentCount(postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// CreateComment 创建评论
func (h *NativeCommentHandler) CreateComment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var input struct {
		PostID   string `json:"post_id"`
		Content  string `json:"content" binding:"required,min=1,max=5000"`
		ParentID string `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 支持从 URL param 或 body 获取 post_id
	if input.PostID == "" {
		input.PostID = c.Param("id")
	}
	if input.PostID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "post_id is required"})
		return
	}

	input.Content = strings.TrimSpace(input.Content)
	if len(input.Content) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Comment content cannot be empty"})
		return
	}

	var parentID *string
	if input.ParentID != "" {
		parentID = &input.ParentID
	}

	comment, err := h.commentService.CreateComment(service.CreateCommentInput{
		PostID:   input.PostID,
		Content:  input.Content,
		ParentID: parentID,
	}, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, comment)
}

// UpdateComment 更新评论
func (h *NativeCommentHandler) UpdateComment(c *gin.Context) {
	userID := c.GetString("user_id")

	var input struct {
		Content string `json:"content" binding:"required,min=1,max=5000"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	comment, err := h.commentService.UpdateComment(c.Param("id"), service.UpdateCommentInput{
		Content: &input.Content,
	}, userID)
	if err != nil {
		if err.Error() == "forbidden" {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only edit your own comments"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, comment)
}

// DeleteComment 删除评论
func (h *NativeCommentHandler) DeleteComment(c *gin.Context) {
	userID := c.GetString("user_id")

	err := h.commentService.DeleteComment(c.Param("id"), userID)
	if err != nil {
		if err.Error() == "forbidden" {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own comments"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}

// ApproveComment 审核通过评论
func (h *NativeCommentHandler) ApproveComment(c *gin.Context) {
	err := h.commentService.ApproveComment(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment approved"})
}

// RejectComment 审核拒绝评论
func (h *NativeCommentHandler) RejectComment(c *gin.Context) {
	err := h.commentService.RejectComment(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment rejected"})
}

// AdminListComments 后台评论列表（分页，可按状态过滤）
func (h *NativeCommentHandler) AdminListComments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := strings.TrimSpace(c.Query("status"))

	// 仅允许合法的状态过滤值，避免任意字符串注入
	if status != "" && status != "pending" && status != "approved" && status != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	comments, total, err := h.commentService.ListComments(page, pageSize, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 规范化分页参数，确保返回值与请求一致
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	c.JSON(http.StatusOK, gin.H{
		"comments":    comments,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": int((total + int64(pageSize-1)) / int64(pageSize)),
	})
}

// AdminDeleteComment 管理员强制删除评论
func (h *NativeCommentHandler) AdminDeleteComment(c *gin.Context) {
	err := h.commentService.AdminDeleteComment(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}
