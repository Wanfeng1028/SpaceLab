package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/service"
	"github.com/spacelab/backend/internal/utils"
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get comment count"})
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
		ContentID   string `json:"content_id"`
		ContentType string `json:"content_type"`
		Content     string `json:"content" binding:"required,min=1,max=5000"`
		ParentID    string `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 支持从 URL param 获取 content_id（兼容 /posts/:id/comments）
	if input.ContentID == "" {
		input.ContentID = c.Param("id")
	}
	if input.ContentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content_id is required"})
		return
	}

	if input.ContentType == "" {
		input.ContentType = "post"
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
		ContentID:   input.ContentID,
		ContentType: input.ContentType,
		Content:     input.Content,
		ParentID:    parentID,
	}, userID.(string))
	if err != nil {
		// 安全错误消息：不暴露内部细节
		errMsg := utils.SafeErrorMessage(err, "Failed to create comment")
		status := http.StatusInternalServerError
		if err.Error() == "comment rate limit exceeded, please wait before posting again" ||
			err.Error() == "comments are currently disabled" ||
			err.Error() == "comments are disabled for this post" {
			status = http.StatusForbidden
			errMsg = err.Error()
		}
		if err.Error() == "comment content is empty after sanitization" {
			status = http.StatusBadRequest
			errMsg = err.Error()
		}
		c.JSON(status, gin.H{"error": errMsg})
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
		} else if err.Error() == "comment content is empty after sanitization" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update comment"})
		}
		return
	}

	c.JSON(http.StatusOK, comment)
}

// DeleteComment 删除评论
func (h *NativeCommentHandler) DeleteComment(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := c.GetString("role")

	err := h.commentService.DeleteComment(c.Param("id"), userID)
	if err != nil {
		if err.Error() == "forbidden" {
			if userRole == "admin" {
				// 管理员使用 AdminDeleteComment
				if err := h.commentService.AdminDeleteComment(c.Param("id")); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Comment deleted"})
				return
			}
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own comments"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted"})
}

// ApproveComment 审核通过评论
func (h *NativeCommentHandler) ApproveComment(c *gin.Context) {
	err := h.commentService.ApproveComment(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve comment"})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"approve", "comment", c.Param("id"),
		nil, c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Comment approved"})
}

// RejectComment 审核拒绝评论
func (h *NativeCommentHandler) RejectComment(c *gin.Context) {
	err := h.commentService.RejectComment(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject comment"})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"reject", "comment", c.Param("id"),
		nil, c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Comment rejected"})
}

// AdminListComments 后台评论列表（分页，可按状态过滤）
func (h *NativeCommentHandler) AdminListComments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := strings.TrimSpace(c.Query("status"))

	// 仅允许合法的状态过滤值，避免任意字符串注入
	if status != "" && status != "pending" && status != "approved" && status != "rejected" && status != "spam" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	comments, total, err := h.commentService.ListComments(page, pageSize, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"delete", "comment", c.Param("id"),
		nil, c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}

// ReportComment 举报评论
func (h *NativeCommentHandler) ReportComment(c *gin.Context) {
	userID := c.GetString("user_id")
	commentID := c.Param("id")

	var input struct {
		Reason      string `json:"reason" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 限制举报原因
	validReasons := map[string]bool{"spam": true, "harassment": true, "inappropriate": true, "other": true}
	if !validReasons[input.Reason] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reason"})
		return
	}

	if err := h.commentService.CreateCommentReport(commentID, userID, input.Reason, input.Description); err != nil {
		errMsg := utils.SafeErrorMessage(err, "Failed to report comment")
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Report submitted"})
}

// ListReports 获取举报列表（管理员）
func (h *NativeCommentHandler) ListReports(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.DefaultQuery("status", "pending")

	if status != "" && status != "pending" && status != "reviewed" && status != "dismissed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	reports, total, err := h.commentService.ListCommentReports(page, pageSize, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports":   reports,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// ReviewReport 审核举报（管理员）
func (h *NativeCommentHandler) ReviewReport(c *gin.Context) {
	userID := c.GetString("user_id")
	reportID := c.Param("id")

	var input struct {
		Dismiss bool `json:"dismiss"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	if err := h.commentService.ReviewCommentReport(reportID, userID, input.Dismiss); err != nil {
		errMsg := utils.SafeErrorMessage(err, "Failed to review report")
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		return
	}

	// 审计日志
	utils.LogAudit(
		userID, c.GetString("email"),
		"review_report", "comment_report", reportID,
		map[string]interface{}{"dismiss": input.Dismiss},
		c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Report reviewed"})
}

// AddSensitiveWord 添加敏感词（管理员）
func (h *NativeCommentHandler) AddSensitiveWord(c *gin.Context) {
	var input struct {
		Word     string `json:"word" binding:"required"`
		Category string `json:"category"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	if err := h.commentService.AddSensitiveWord(input.Word, input.Category); err != nil {
		errMsg := utils.SafeErrorMessage(err, "Failed to add sensitive word")
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"add_sensitive_word", "sensitive_word", "",
		map[string]interface{}{"word": input.Word, "category": input.Category},
		c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusCreated, gin.H{"message": "Sensitive word added"})
}

// DeleteSensitiveWord 删除敏感词（管理员）
func (h *NativeCommentHandler) DeleteSensitiveWord(c *gin.Context) {
	id := c.Param("id")

	if err := h.commentService.DeleteSensitiveWord(id); err != nil {
		errMsg := utils.SafeErrorMessage(err, "Failed to delete sensitive word")
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"delete_sensitive_word", "sensitive_word", id,
		nil, c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Sensitive word deleted"})
}

// ListSensitiveWords 获取敏感词列表（管理员）
func (h *NativeCommentHandler) ListSensitiveWords(c *gin.Context) {
	category := c.Query("category")

	words, err := h.commentService.ListSensitiveWords(category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sensitive words"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"words": words})
}
