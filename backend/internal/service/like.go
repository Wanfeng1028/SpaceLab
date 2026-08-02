package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/gorm"
)

type LikeService struct {
	db *gorm.DB
}

func NewLikeService(db *gorm.DB) *LikeService {
	return &LikeService{db: db}
}

// getLikeCount 统计目标点赞数（以 likes 表为准）
func (s *LikeService) getLikeCount(targetType string, targetID uuid.UUID) int64 {
	var count int64
	s.db.Model(&model.Like{}).
		Where("target_type = ? AND target_id = ?", targetType, targetID).
		Count(&count)
	return count
}

// ToggleLike 切换文章点赞状态，返回 (是否已点赞, 最新点赞数, error)
func (s *LikeService) ToggleLike(userID, postID string) (bool, int64, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return false, 0, errors.New("invalid user ID")
	}
	pid, err := uuid.Parse(postID)
	if err != nil {
		return false, 0, errors.New("invalid post ID")
	}

	// 校验文章存在
	var post model.Post
	if err := s.db.Where("id = ?", pid).First(&post).Error; err != nil {
		return false, 0, errors.New("post not found")
	}

	var existing model.Like
	err = s.db.Where("target_type = ? AND target_id = ? AND user_id = ?", "post", pid, uid).First(&existing).Error

	var liked bool
	switch {
	case err == nil:
		// 已点赞 → 取消
		if delErr := s.db.Delete(&existing).Error; delErr != nil {
			return false, 0, errors.New("failed to remove like")
		}
		s.db.Model(&model.Post{}).Where("id = ? AND like_count > 0", pid).
			Update("like_count", gorm.Expr("like_count - 1"))
		liked = false
	case errors.Is(err, gorm.ErrRecordNotFound):
		// 未点赞 → 点赞
		like := model.Like{
			ID:         uuid.New(),
			TargetType: "post",
			TargetID:   pid,
			UserID:     uid,
		}
		if createErr := s.db.Create(&like).Error; createErr != nil {
			return false, 0, errors.New("failed to create like")
		}
		s.db.Model(&model.Post{}).Where("id = ?", pid).
			Update("like_count", gorm.Expr("like_count + 1"))
		liked = true
	default:
		return false, 0, errors.New("failed to query like status")
	}

	return liked, s.getLikeCount("post", pid), nil
}

// GetLikeStatus 查询用户是否已点赞及总点赞数（userID 为空时仅返回总数）
func (s *LikeService) GetLikeStatus(userID, postID string) (bool, int64, error) {
	pid, err := uuid.Parse(postID)
	if err != nil {
		return false, 0, errors.New("invalid post ID")
	}

	count := s.getLikeCount("post", pid)

	if userID == "" {
		return false, count, nil
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		return false, count, nil
	}

	var existing model.Like
	err = s.db.Where("target_type = ? AND target_id = ? AND user_id = ?", "post", pid, uid).First(&existing).Error
	return err == nil, count, nil
}
