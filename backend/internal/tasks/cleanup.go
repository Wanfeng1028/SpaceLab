package tasks

import (
	"os"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/utils"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// CleanupUnverifiedUsers 删除注册后超过 days 天仍未验证邮箱的账号（status=pending_verify
// 且 email_verified_at 为空），同时清理其关联记录（邮箱验证令牌、密码重置令牌、
// 登录日志、风控事件、评论、评论举报），最后删除用户本身。返回删除的用户数量。
//
// 目的：防止批量注册脚本在数据库中留下大量无法登录的废号，污染用户表与统计。
func CleanupUnverifiedUsers(db *gorm.DB, days int) (int64, error) {
	if days <= 0 {
		days = 7
	}
	cutoff := time.Now().AddDate(0, 0, -days)

	var ids []uuid.UUID
	if err := db.Model(&model.User{}).
		Where("status = ? AND email_verified_at IS NULL AND created_at < ?", "pending_verify", cutoff).
		Pluck("id", &ids).Error; err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, nil
	}

	var deleted int64
	err := db.Transaction(func(tx *gorm.DB) error {
		// 先清理关联表，再删除用户本身，避免外键约束导致失败
		if err := tx.Where("user_id IN ?", ids).Delete(&model.EmailVerificationToken{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id IN ?", ids).Delete(&model.PasswordResetToken{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id IN ?", ids).Delete(&model.LoginLog{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id IN ?", ids).Delete(&model.RiskEvent{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id IN ?", ids).Delete(&model.Comment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id IN ?", ids).Delete(&model.CommentReport{}).Error; err != nil {
			return err
		}
		res := tx.Where("id IN ?", ids).Delete(&model.User{})
		if res.Error != nil {
			return res.Error
		}
		deleted = res.RowsAffected
		return nil
	})
	if err != nil {
		return 0, err
	}
	return deleted, nil
}

// StartUnverifiedUserCleanup 启动后台定时清理任务（每天执行一次，进程启动时立即执行一次）。
// 保留天数可通过环境变量 UNVERIFIED_USER_RETENTION_DAYS 覆盖，默认 7 天。
func StartUnverifiedUserCleanup(db *gorm.DB) {
	days := 7
	if v := os.Getenv("UNVERIFIED_USER_RETENTION_DAYS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			days = n
		}
	}

	utils.Logger.Info("Starting unverified user cleanup task", zap.Int("retention_days", days))

	run := func() {
		count, err := CleanupUnverifiedUsers(db, days)
		if err != nil {
			utils.Logger.Warn("Unverified user cleanup failed", zap.Error(err))
			return
		}
		if count > 0 {
			utils.Logger.Info("Cleaned up unverified users", zap.Int64("count", count))
		}
	}

	// 启动时先执行一次
	run()

	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			run()
		}
	}()
}
