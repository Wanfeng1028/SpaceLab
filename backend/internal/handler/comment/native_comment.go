package handler

import (
	"net/http"
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
	postID := c.Param("post_id")

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
	postID := c.Param("post_id")

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
		PostID   string `json:"post_id" binding:"required"`
		Content  string `json:"content" binding:"required,min=1,max=5000"`
		ParentID string `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
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
