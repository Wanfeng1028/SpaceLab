package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/gorm"
)

type CommentService struct {
	db *gorm.DB
}

type CreateCommentInput struct {
	PostID   string
	Content  string
	ParentID *string
}

type UpdateCommentInput struct {
	Content *string
	Status  *string
}

func NewCommentService(db *gorm.DB) *CommentService {
	return &CommentService{db: db}
}

// GetComments 获取文章评论（含回复）
func (s *CommentService) GetComments(postID string) ([]model.Comment, error) {
	var comments []model.Comment
	result := s.db.Where("post_id = ? AND status = ?", postID, "approved").
		Preload("User").
		Preload("Replies.User").
		Order("created_at ASC").
		Find(&comments)

	if result.Error != nil {
		return nil, result.Error
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
func (s *CommentService) GetCommentCount(postID string) (int64, error) {
	var count int64
	result := s.db.Model(&model.Comment{}).Where("post_id = ? AND status = ?", postID, "approved").Count(&count)
	return count, result.Error
}

// CreateComment 创建评论
func (s *CommentService) CreateComment(input CreateCommentInput, userID string) (*model.Comment, error) {
	postUUID, err := uuid.Parse(input.PostID)
	if err != nil {
		return nil, errors.New("invalid post ID")
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	var parentID *uuid.UUID
	if input.ParentID != nil && *input.ParentID != "" {
		pUUID, err := uuid.Parse(*input.ParentID)
		if err == nil {
			parentID = &pUUID
		}
	}

	comment := model.Comment{
		ID:        uuid.New(),
		PostID:    postUUID,
		UserID:    userUUID,
		ParentID:  parentID,
		Content:   input.Content,
		Status:    "pending", // 需要审核
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result := s.db.Create(&comment)
	if result.Error != nil {
		return nil, result.Error
	}

	return &comment, nil
}

// UpdateComment 更新评论
func (s *CommentService) UpdateComment(id string, input UpdateCommentInput, userID string) (*model.Comment, error) {
	var comment model.Comment
	result := s.db.Where("id = ?", id).First(&comment)
	if result.Error != nil {
		return nil, result.Error
	}

	// 只有作者或 admin 可以编辑
	if comment.UserID.String() != userID {
		return nil, errors.New("forbidden")
	}

	if input.Content != nil {
		comment.Content = *input.Content
	}
	if input.Status != nil {
		comment.Status = *input.Status
	}

	comment.UpdatedAt = time.Now()
	result = s.db.Save(&comment)
	if result.Error != nil {
		return nil, result.Error
	}

	return &comment, nil
}

// DeleteComment 删除评论
func (s *CommentService) DeleteComment(id string, userID string) error {
	var comment model.Comment
	result := s.db.Where("id = ?", id).First(&comment)
	if result.Error != nil {
		return result.Error
	}

	// 只有作者或 admin 可以删除
	if comment.UserID.String() != userID {
		return errors.New("forbidden")
	}

	return s.db.Delete(&comment).Error
}

// ApproveComment 审核通过评论
func (s *CommentService) ApproveComment(id string) error {
	return s.db.Model(&model.Comment{}).Where("id = ?", id).Update("status", "approved").Error
}

// RejectComment 审核拒绝评论
func (s *CommentService) RejectComment(id string) error {
	return s.db.Model(&model.Comment{}).Where("id = ?", id).Update("status", "rejected").Error
}
