package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/service"
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

// GetUser 获取用户详情
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
		"avatar_url":        user.AvatarURL,
		"email_verified_at": user.EmailVerifiedAt,
		"created_at":        user.CreatedAt,
		"updated_at":        user.UpdatedAt,
	})
}

// UpdateUserRole 修改用户角色
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	userID := c.Param("id")

	var input struct {
		Role string `json:"role" binding:"required,oneof=admin writer viewer"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	result := h.authService.DB().Model(&model.User{}).Where("id = ?", userID).Update("role", input.Role)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User role updated successfully"})
}

// UpdateUserStatus 封禁/解封用户
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	userID := c.Param("id")

	var input struct {
		Status string `json:"status" binding:"required,oneof=active banned"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	if input.Status == "banned" {
		result := h.authService.DB().Model(&model.User{}).Where("id = ?", userID).Update("deleted_at", time.Now())
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ban user"})
			return
		}
	} else {
		result := h.authService.DB().Model(&model.User{}).Where("id = ?", userID).Update("deleted_at", nil)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unban user"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "User status updated successfully"})
}

// DeleteUser 删除用户
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	result := h.authService.DB().Where("id = ?", userID).Delete(&model.User{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// ResetUserPassword 重置用户密码
func (h *AdminHandler) ResetUserPassword(c *gin.Context) {
	userID := c.Param("id")

	var input struct {
		Password string `json:"password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid password"})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	result := h.authService.DB().Model(&model.User{}).Where("id = ?", userID).Update("password_hash", string(passwordHash))
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// GetStats 获取用户统计
func (h *AdminHandler) GetStats(c *gin.Context) {
	var totalUsers, activeUsers, bannedUsers, recentUsers int64

	h.authService.DB().Model(&model.User{}).Count(&totalUsers)
	h.authService.DB().Model(&model.User{}).Where("deleted_at IS NULL").Count(&activeUsers)
	h.authService.DB().Model(&model.User{}).Where("deleted_at IS NOT NULL").Count(&bannedUsers)
	h.authService.DB().Model(&model.User{}).Where("created_at > ?", time.Now().Add(-7*24*time.Hour)).Count(&recentUsers)

	c.JSON(http.StatusOK, gin.H{
		"total_users":  totalUsers,
		"active_users": activeUsers,
		"banned_users": bannedUsers,
		"recent_users": recentUsers,
	})
}
