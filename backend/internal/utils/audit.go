package utils

import (
	"encoding/json"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AuditLogger 审计日志记录器
type AuditLogger struct {
	db *gorm.DB
}

var GlobalAuditLogger *AuditLogger

// InitAuditLogger 初始化审计日志
func InitAuditLogger(db *gorm.DB) {
	GlobalAuditLogger = &AuditLogger{db: db}
}

// LogAudit 记录审计日志
func LogAudit(adminID, adminName, action, targetType, targetID string, details map[string]interface{}, ip, userAgent string) {
	if GlobalAuditLogger == nil {
		return
	}

	detailsJSON := ""
	if details != nil {
		if b, err := json.Marshal(details); err == nil {
			detailsJSON = string(b)
		}
	}

	adminUUID, err := uuid.Parse(adminID)
	if err != nil {
		Logger.Warn("Invalid admin ID for audit log", zap.String("admin_id", adminID))
		adminUUID = uuid.Nil
	}

	log := model.AdminAuditLog{
		ID:         uuid.New(),
		AdminID:    adminUUID,
		AdminName:  adminName,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Details:    detailsJSON,
		IP:         ip,
		UserAgent:  userAgent,
	}

	if err := GlobalAuditLogger.db.Create(&log).Error; err != nil {
		Logger.Warn("Failed to write audit log", zap.Error(err))
	}
}
