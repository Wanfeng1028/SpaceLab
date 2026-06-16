package service

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/utils"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type CommentService struct {
	db *gorm.DB
}

type CreateCommentInput struct {
	ContentID   string
	ContentType string
	Content     string
	ParentID    *string
}

type UpdateCommentInput struct {
	Content *string
	Status  *string
}

func NewCommentService(db *gorm.DB) *CommentService {
	return &CommentService{db: db}
}

// CheckCommentRateLimit 检查用户评论频率（每分钟最多 3 条，每小时最多 20 条）
func (s *CommentService) CheckCommentRateLimit(userID string) error {
	oneMinuteAgo := time.Now().Add(-1 * time.Minute)
	var countMinute int64
	s.db.Model(&model.Comment{}).Where("user_id = ? AND created_at > ?", userID, oneMinuteAgo).Count(&countMinute)
	if countMinute >= 3 {
		return errors.New("comment rate limit exceeded, please wait before posting again")
	}

	oneHourAgo := time.Now().Add(-1 * time.Hour)
	var countHour int64
	s.db.Model(&model.Comment{}).Where("user_id = ? AND created_at > ?", userID, oneHourAgo).Count(&countHour)
	if countHour >= 20 {
		return errors.New("hourly comment limit exceeded")
	}
	return nil
}

// checkCommentsEnabled 检查评论是否开启
func (s *CommentService) checkCommentsEnabled(contentID, contentType string) error {
	// 全站评论开关
	var setting model.SiteSetting
	if err := s.db.Where("`key` = ?", "comments_enabled").First(&setting); err == nil {
		if setting.Value == "false" || setting.Value == "0" {
			return errors.New("comments are currently disabled")
		}
	}

	// 单篇文章评论开关
	if contentType == "post" || contentType == "" {
		var post model.Post
		if err := s.db.Where("id = ?", contentID).First(&post).Error; err == nil {
			if !post.CommentsEnabled {
				return errors.New("comments are disabled for this post")
			}
		}
	}

	return nil
}

// GetComments 获取内容评论（含回复）
func (s *CommentService) GetComments(contentID string, contentType ...string) ([]model.Comment, error) {
	var comments []model.Comment
	query := s.db.Where("content_id = ? AND status = ?", contentID, "approved")
	if len(contentType) > 0 && contentType[0] != "" {
		query = query.Where("content_type = ?", contentType[0])
	}
	result := query.
		Preload("User").
		Preload("Replies.User").
		Order("created_at ASC").
		Find(&comments)

	if result.Error != nil {
		return nil, errors.New("failed to retrieve comments")
	}

	// 过滤出顶级评论（parent_id 为 null）
	var topLevel []model.Comment
	for _, c := range comments {
		if c.ParentID == nil {
			topLevel = append(topLevel, c)
		}
	}

	return topLevel, nil
}

// GetCommentCount 获取评论数
func (s *CommentService) GetCommentCount(contentID string) (int64, error) {
	var count int64
	result := s.db.Model(&model.Comment{}).Where("content_id = ? AND status = ?", contentID, "approved").Count(&count)
	if result.Error != nil {
		return 0, errors.New("failed to get comment count")
	}
	return count, nil
}

// ListComments 分页查询评论（供后台审核使用）。
// status 为空时返回所有状态，否则按 status 过滤；按创建时间倒序。
func (s *CommentService) ListComments(page, pageSize int, status string) ([]model.Comment, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	query := s.db.Model(&model.Comment{}).Preload("User")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("failed to query comments")
	}

	var comments []model.Comment
	result := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&comments)
	if result.Error != nil {
		return nil, 0, errors.New("failed to list comments")
	}

	return comments, total, nil
}

// AdminDeleteComment 管理员强制删除评论（不受"只能删自己"限制）。
func (s *CommentService) AdminDeleteComment(id string) error {
	if err := s.db.Where("id = ?", id).Delete(&model.Comment{}).Error; err != nil {
		return errors.New("failed to delete comment")
	}
	return nil
}

// CreateComment 创建评论
func (s *CommentService) CreateComment(input CreateCommentInput, userID string) (*model.Comment, error) {
	contentUUID, err := uuid.Parse(input.ContentID)
	if err != nil {
		return nil, errors.New("invalid content ID")
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	var parentID *uuid.UUID
	if input.ParentID != nil && *input.ParentID != "" {
		pid, err := uuid.Parse(*input.ParentID)
		if err != nil {
			return nil, errors.New("invalid parent ID")
		}
		parentID = &pid
	}

	// 评论内容清洗（XSS 防护）
	input.Content = utils.SanitizeComment(input.Content)
	if len(input.Content) == 0 {
		return nil, errors.New("comment content is empty after sanitization")
	}

	// 评论频率限制
	if err := s.CheckCommentRateLimit(userID); err != nil {
		return nil, err
	}

	// 检查评论是否开启
	if err := s.checkCommentsEnabled(input.ContentID, input.ContentType); err != nil {
		return nil, err
	}

	// 确定评论初始状态：检查是否需要先审后发
	initialStatus := "approved"

	// 全站先审后发开关
	var preModerateSetting model.SiteSetting
	if err := s.db.Where("`key` = ?", "comment_pre_moderate").First(&preModerateSetting); err == nil {
		if preModerateSetting.Value == "true" || preModerateSetting.Value == "1" {
			initialStatus = "pending"
		}
	}

	// 新用户先审后发
	var user model.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err == nil {
		if user.Status == "pending_verify" {
			initialStatus = "pending"
		}
	}

	// 敏感词检查：命中则进入待审核
	if utils.GlobalSensitiveChecker != nil {
		if hit, category := utils.GlobalSensitiveChecker.CheckWithCategory(input.Content); hit {
			initialStatus = "pending"
			utils.Logger.Info("Comment hit sensitive word, set to pending", zap.String("category", category))
		}
	}

	// 如果初始状态已经是 pending，不需要再改
	if initialStatus == "approved" {
		// 默认新评论也进入 pending，等管理员确认后再自动批准
		initialStatus = "pending"
	}

	comment := model.Comment{
		ID:          uuid.New(),
		ContentType: input.ContentType,
		ContentID:   contentUUID,
		UserID:      userUUID,
		ParentID:    parentID,
		Content:     input.Content,
		Status:      initialStatus,
	}

	if err := s.db.Create(&comment).Error; err != nil {
		return nil, errors.New("failed to create comment")
	}

	// 重新加载关联
	s.db.Preload("User").Where("id = ?", comment.ID).First(&comment)

	return &comment, nil
}

// UpdateComment 更新评论
func (s *CommentService) UpdateComment(id string, input UpdateCommentInput, userID string) (*model.Comment, error) {
	var comment model.Comment
	result := s.db.Where("id = ?", id).First(&comment)
	if result.Error != nil {
		return nil, errors.New("comment not found")
	}

	// 只有作者可以编辑内容
	if comment.UserID.String() != userID {
		return nil, errors.New("forbidden")
	}

	if input.Content != nil {
		// 内容清洗
		sanitized := utils.SanitizeComment(*input.Content)
		if len(sanitized) == 0 {
			return nil, errors.New("comment content is empty after sanitization")
		}
		comment.Content = sanitized
	}

	comment.UpdatedAt = time.Now()
	result = s.db.Save(&comment)
	if result.Error != nil {
		return nil, errors.New("failed to update comment")
	}

	return &comment, nil
}

// DeleteComment 删除评论
func (s *CommentService) DeleteComment(id string, userID string) error {
	var comment model.Comment
	result := s.db.Where("id = ?", id).First(&comment)
	if result.Error != nil {
		return errors.New("comment not found")
	}

	// 只有作者或 admin 可以删除
	if comment.UserID.String() != userID {
		// 检查是否管理员
		var user model.User
		if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil || user.Role != "admin" {
			return errors.New("forbidden")
		}
	}

	if err := s.db.Delete(&comment).Error; err != nil {
		return errors.New("failed to delete comment")
	}
	return nil
}

// ApproveComment 审核通过评论
func (s *CommentService) ApproveComment(id string) error {
	if err := s.db.Model(&model.Comment{}).Where("id = ?", id).Update("status", "approved").Error; err != nil {
		return errors.New("failed to approve comment")
	}
	return nil
}

// RejectComment 审核拒绝评论
func (s *CommentService) RejectComment(id string) error {
	if err := s.db.Model(&model.Comment{}).Where("id = ?", id).Update("status", "rejected").Error; err != nil {
		return errors.New("failed to reject comment")
	}
	return nil
}

// CreateCommentReport 创建评论举报
func (s *CommentService) CreateCommentReport(commentID, reporterID, reason, description string) error {
	commentUUID, err := uuid.Parse(commentID)
	if err != nil {
		return errors.New("invalid comment ID")
	}
	reporterUUID, err := uuid.Parse(reporterID)
	if err != nil {
		return errors.New("invalid reporter ID")
	}

	// 清洗举报描述
	description = utils.SanitizeComment(description)

	// 检查是否已举报
	var count int64
	s.db.Model(&model.CommentReport{}).Where("comment_id = ? AND reporter_id = ? AND status = 'pending'", commentUUID, reporterUUID).Count(&count)
	if count > 0 {
		return errors.New("you have already reported this comment")
	}

	report := model.CommentReport{
		ID:          uuid.New(),
		CommentID:   commentUUID,
		ReporterID:  reporterUUID,
		Reason:      reason,
		Description: description,
		Status:      "pending",
	}

	if err := s.db.Create(&report).Error; err != nil {
		return errors.New("failed to create report")
	}
	return nil
}

// ListCommentReports 获取举报列表（管理员）
func (s *CommentService) ListCommentReports(page, pageSize int, status string) ([]model.CommentReport, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	query := s.db.Model(&model.CommentReport{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("failed to query reports")
	}

	var reports []model.CommentReport
	result := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&reports)
	if result.Error != nil {
		return nil, 0, errors.New("failed to list reports")
	}
	return reports, total, nil
}

// ReviewCommentReport 审核举报
func (s *CommentService) ReviewCommentReport(reportID, reviewerID string, dismiss bool) error {
	reportUUID, err := uuid.Parse(reportID)
	if err != nil {
		return errors.New("invalid report ID")
	}
	reviewerUUID, err := uuid.Parse(reviewerID)
	if err != nil {
		return errors.New("invalid reviewer ID")
	}

	status := "reviewed"
	if dismiss {
		status = "dismissed"
	}

	// 获取举报记录
	var report model.CommentReport
	if err := s.db.Where("id = ?", reportUUID).First(&report).Error; err != nil {
		return errors.New("report not found")
	}

	// 更新举报状态
	updates := map[string]interface{}{
		"status":     status,
		"reviewed_by": reviewerUUID,
	}
	if err := s.db.Model(&report).Updates(updates).Error; err != nil {
		return errors.New("failed to update report")
	}

	// 如果举报成立（非 dismiss），自动将评论标记为待审核
	if !dismiss {
		s.db.Model(&model.Comment{}).Where("id = ?", report.CommentID).Update("status", "pending")
	}

	return nil
}

// AddSensitiveWord 添加敏感词
func (s *CommentService) AddSensitiveWord(word, category string) error {
	word = strings.TrimSpace(strings.ToLower(word))
	if word == "" {
		return errors.New("word cannot be empty")
	}

	sensitiveWord := model.SensitiveWord{
		ID:       uuid.New(),
		Word:     word,
		Category: category,
	}

	if err := s.db.Create(&sensitiveWord).Error; err != nil {
		return errors.New("failed to add sensitive word")
	}

	// 重新加载敏感词缓存
	if utils.GlobalSensitiveChecker != nil {
		utils.GlobalSensitiveChecker.Reload()
	}

	return nil
}

// DeleteSensitiveWord 删除敏感词
func (s *CommentService) DeleteSensitiveWord(id string) error {
	if err := s.db.Where("id = ?", id).Delete(&model.SensitiveWord{}).Error; err != nil {
		return errors.New("failed to delete sensitive word")
	}

	// 重新加载敏感词缓存
	if utils.GlobalSensitiveChecker != nil {
		utils.GlobalSensitiveChecker.Reload()
	}

	return nil
}

// ListSensitiveWords 获取敏感词列表
func (s *CommentService) ListSensitiveWords(category string) ([]model.SensitiveWord, error) {
	var words []model.SensitiveWord
	query := s.db.Model(&model.SensitiveWord{})
	if category != "" {
		query = query.Where("category = ?", category)
	}
	result := query.Order("created_at DESC").Find(&words)
	if result.Error != nil {
		return nil, errors.New("failed to list sensitive words")
	}
	return words, nil
}
