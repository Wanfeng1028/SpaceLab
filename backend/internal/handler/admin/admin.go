package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/service"
	"github.com/spacelab/backend/internal/utils"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type AdminHandler struct {
	authService *service.AuthService
}

func NewAdminHandler(authService *service.AuthService) *AdminHandler {
	return &AdminHandler{authService: authService}
}

// ListUsers 获取用户列表
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	var users []model.User
	var total int64

	h.authService.DB().Model(&model.User{}).Count(&total)
	h.authService.DB().Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&users)

	userInfos := make([]service.UserInfo, len(users))
	for i, u := range users {
		userInfos[i] = service.ToUserInfo(u)
	}

	c.JSON(http.StatusOK, gin.H{
		"users":       userInfos,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": int((total + int64(pageSize-1)) / int64(pageSize)),
	})
}

// GetUser 获取用户详情（含风控信息）
func (h *AdminHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                user.ID.String(),
		"email":             user.Email,
		"username":          user.Username,
		"role":              user.Role,
		"status":            user.Status,
		"avatar_url":        user.AvatarURL,
		"email_verified_at": user.EmailVerifiedAt,
		"last_login_at":     user.LastLoginAt,
		"last_login_ip":     user.LastLoginIP,
		"login_fail_count":  user.LoginFailCount,
		"locked_until":      user.LockedUntil,
		"created_at":        user.CreatedAt,
		"updated_at":        user.UpdatedAt,
	})
}

// UpdateUserRole 修改用户角色
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	userID := c.Param("id")
	currentUserID := c.GetString("user_id")

	// 管理员不能修改自己的角色
	if userID == currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify your own role"})
		return
	}

	var input struct {
		Role string `json:"role" binding:"required,oneof=admin writer viewer"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Must be admin, writer, or viewer"})
		return
	}

	if err := h.authService.DB().Model(&model.User{}).Where("id = ?", userID).Update("role", input.Role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}

	// 审计日志
	utils.LogAudit(
		currentUserID, c.GetString("email"),
		"update_role", "user", userID,
		map[string]interface{}{"new_role": input.Role},
		c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "User role updated successfully"})
}

// UpdateUserStatus 修改用户状态（封禁/解封）
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	userID := c.Param("id")
	currentUserID := c.GetString("user_id")

	// 管理员不能封禁自己
	if userID == currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify your own status"})
		return
	}

	var input struct {
		Status string `json:"status" binding:"required,oneof=active banned"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status. Must be active or banned"})
		return
	}

	switch input.Status {
	case "banned":
		if err := h.authService.BanUser(userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ban user"})
			return
		}
	case "active":
		if err := h.authService.UnbanUser(userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unban user"})
			return
		}
	}

	// 审计日志
	utils.LogAudit(
		currentUserID, c.GetString("email"),
		"update_status", "user", userID,
		map[string]interface{}{"new_status": input.Status},
		c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "User status updated successfully"})
}

// DeleteUser 删除用户
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	currentUserID := c.GetString("user_id")

	// 管理员不能删除自己
	if userID == currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete your own account"})
		return
	}

	if err := h.authService.DB().Delete(&model.User{}, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	// 审计日志
	utils.LogAudit(
		currentUserID, c.GetString("email"),
		"delete", "user", userID,
		nil, c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// ResetUserPassword 管理员重置用户密码
func (h *AdminHandler) ResetUserPassword(c *gin.Context) {
	userID := c.Param("id")

	var input struct {
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 密码强度校验
	if err := service.ValidatePasswordStrength(input.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	result := h.authService.DB().Model(&model.User{}).Where("id = ?", userID).Update("password_hash", string(passwordHash))
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset password"})
		return
	}

	// 撤销该用户所有已有 Token（安全：重置密码后使旧 session 失效）
	if utils.TokenRevocationMgr != nil {
		if err := utils.TokenRevocationMgr.RevokeUserTokens(userID); err != nil {
			utils.Logger.Warn("Failed to revoke user tokens on admin password reset", zap.Error(err))
		}
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"reset_password", "user", userID,
		nil, c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// GetStats 获取用户统计（含风控统计）
func (h *AdminHandler) GetStats(c *gin.Context) {
	var totalUsers, activeUsers, bannedUsers, lockedUsers, pendingVerifyUsers, recentUsers int64

	h.authService.DB().Model(&model.User{}).Count(&totalUsers)
	h.authService.DB().Model(&model.User{}).Where("status = ?", "active").Count(&activeUsers)
	h.authService.DB().Model(&model.User{}).Where("status = ?", "banned").Count(&bannedUsers)
	h.authService.DB().Model(&model.User{}).Where("status = ?", "locked").Count(&lockedUsers)
	h.authService.DB().Model(&model.User{}).Where("status = ?", "pending_verify").Count(&pendingVerifyUsers)
	h.authService.DB().Model(&model.User{}).Where("created_at > ?", time.Now().Add(-7*24*time.Hour)).Count(&recentUsers)

	c.JSON(http.StatusOK, gin.H{
		"total_users":          totalUsers,
		"active_users":        activeUsers,
		"banned_users":        bannedUsers,
		"locked_users":        lockedUsers,
		"pending_verify_users": pendingVerifyUsers,
		"recent_users":        recentUsers,
	})
}

// --- 风控管理接口 ---

// ListLoginLogs 获取登录日志
func (h *AdminHandler) ListLoginLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	userID := c.DefaultQuery("user_id", "")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	logs, total, err := h.authService.ListLoginLogs(page, pageSize, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch login logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":        logs,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": int((total + int64(pageSize-1)) / int64(pageSize)),
	})
}

// ListRiskEvents 获取风险事件
func (h *AdminHandler) ListRiskEvents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	userID := c.DefaultQuery("user_id", "")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var resolved *bool
	if r := c.DefaultQuery("resolved", ""); r == "true" {
		val := true
		resolved = &val
	} else if r == "false" {
		val := false
		resolved = &val
	}

	events, total, err := h.authService.ListRiskEvents(page, pageSize, userID, resolved)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch risk events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"events":      events,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": int((total + int64(pageSize-1)) / int64(pageSize)),
	})
}

// LockUser 锁定用户
func (h *AdminHandler) LockUser(c *gin.Context) {
	userID := c.Param("id")

	var input struct {
		DurationMinutes int `json:"duration_minutes" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "duration_minutes is required"})
		return
	}

	if err := h.authService.LockUser(userID, time.Duration(input.DurationMinutes)*time.Minute); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to lock user"})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"lock", "user", userID,
		map[string]interface{}{"duration_minutes": input.DurationMinutes},
		c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "User locked successfully"})
}

// UnlockUser 解锁用户
func (h *AdminHandler) UnlockUser(c *gin.Context) {
	userID := c.Param("id")

	if err := h.authService.UnlockUser(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlock user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User unlocked successfully"})
}

// BanUser 封禁用户
func (h *AdminHandler) BanUser(c *gin.Context) {
	userID := c.Param("id")
	currentUserID := c.GetString("user_id")

	// 管理员不能封禁自己
	if userID == currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot ban yourself"})
		return
	}

	if err := h.authService.BanUser(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ban user"})
		return
	}

	// 审计日志
	utils.LogAudit(
		currentUserID, c.GetString("email"),
		"ban", "user", userID,
		nil, c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "User banned successfully"})
}

// UnbanUser 解封用户
func (h *AdminHandler) UnbanUser(c *gin.Context) {
	userID := c.Param("id")

	if err := h.authService.UnbanUser(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unban user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User unbanned successfully"})
}

// ResolveRiskEvent 标记风险事件为已解决
func (h *AdminHandler) ResolveRiskEvent(c *gin.Context) {
	eventID := c.Param("id")

	if err := h.authService.ResolveRiskEvent(eventID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve risk event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Risk event resolved successfully"})
}

// GetSiteSettings 获取站点设置
func (h *AdminHandler) GetSiteSettings(c *gin.Context) {
	settings := map[string]string{}

	regOpen, err := h.authService.GetSiteSetting("registration_open")
	if err != nil {
		regOpen = "true"
	}
	settings["registration_open"] = regOpen

	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// UpdateSiteSetting 更新站点设置
func (h *AdminHandler) UpdateSiteSetting(c *gin.Context) {
	var input struct {
		Key   string `json:"key" binding:"required"`
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	allowedKeys := map[string]bool{
		"registration_open":     true,
		"comments_enabled":      true,
		"comment_pre_moderate":  true,
	}
	if !allowedKeys[input.Key] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid setting key"})
		return
	}

	// 值验证
	switch input.Key {
	case "registration_open", "comments_enabled", "comment_pre_moderate":
		if input.Value != "true" && input.Value != "false" && input.Value != "0" && input.Value != "1" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Value must be true or false"})
			return
		}
	}

	if err := h.authService.SetSiteSetting(input.Key, input.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting"})
		return
	}

	// 审计日志
	utils.LogAudit(
		c.GetString("user_id"), c.GetString("email"),
		"update_setting", "site_setting", input.Key,
		map[string]interface{}{"value": input.Value},
		c.ClientIP(), c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Setting updated successfully"})
}

// GetUserRiskProfile 获取用户风控画像
func (h *AdminHandler) GetUserRiskProfile(c *gin.Context) {
	userID := c.Param("id")

	// 获取最近的登录日志
	var recentLogs []model.LoginLog
	h.authService.DB().Where("user_id = ?", userID).Order("login_at DESC").Limit(10).Find(&recentLogs)

	// 获取未解决的风险事件
	var unresolvedEvents []model.RiskEvent
	h.authService.DB().Where("user_id = ? AND resolved = false", userID).Order("created_at DESC").Limit(20).Find(&unresolvedEvents)

	// 统计登录失败次数（最近7天）
	var failCount7d int64
	h.authService.DB().Model(&model.LoginLog{}).Where(
		"user_id = ? AND success = false AND login_at > ?", userID, time.Now().AddDate(0, 0, -7),
	).Count(&failCount7d)

	c.JSON(http.StatusOK, gin.H{
		"recent_logs":       recentLogs,
		"unresolved_events": unresolvedEvents,
		"fail_count_7d":     failCount7d,
	})
}

// Ensure uuid import is used
var _ = uuid.Nil
