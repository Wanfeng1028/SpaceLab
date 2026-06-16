package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/middleware"
	"github.com/spacelab/backend/internal/service"
	"github.com/spacelab/backend/internal/utils"
)

type AuthHandler struct {
	authService *service.AuthService
	cfg         *config.Config
	recaptchaSecret string
}

func NewAuthHandler(authService *service.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		authService:     authService,
		cfg:             cfg,
		recaptchaSecret: cfg.RecaptchaSecret,
	}
}

// getClientIP 获取客户端真实 IP
func getClientIP(c *gin.Context) string {
	// 优先从 X-Forwarded-For 或 X-Real-IP 获取
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	return c.ClientIP()
}

// parseDeviceInfo 从 User-Agent 提取简单设备信息
func parseDeviceInfo(ua string) string {
	uaLower := strings.ToLower(ua)
	switch {
	case strings.Contains(uaLower, "iphone"):
		return "iPhone"
	case strings.Contains(uaLower, "ipad"):
		return "iPad"
	case strings.Contains(uaLower, "android"):
		return "Android"
	case strings.Contains(uaLower, "windows"):
		return "Windows PC"
	case strings.Contains(uaLower, "macintosh"), strings.Contains(uaLower, "mac os"):
		return "Mac"
	case strings.Contains(uaLower, "linux"):
		return "Linux PC"
	default:
		return "Unknown"
	}
}

// Register 用户注册
func (h *AuthHandler) Register(c *gin.Context) {
	var input struct {
		Email       string `json:"email" binding:"required,email"`
		Password    string `json:"password" binding:"required,min=8"`
		Username    string `json:"username" binding:"required,min=2,max=50"`
		CaptchaToken string `json:"captcha_token"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// reCAPTCHA 校验
	if ok, _ := utils.VerifyRecaptchaToken(input.CaptchaToken, h.recaptchaSecret); !ok {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Unable to verify you are human, please try again"})
		return
	}

	// 设置邮箱用于限流追踪
	c.Set("login_email", input.Email)

	// 服务端密码强度验证（不只是前端校验）
	if err := service.ValidatePasswordStrength(input.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := h.authService.Register(input.Email, input.Password, input.Username)
	if err != nil {
		status := http.StatusConflict
		errMsg := err.Error()
		// 区分不同类型的注册错误
		switch errMsg {
		case "registration is currently closed":
			status = http.StatusForbidden
		case "invalid email format", "email already registered", "username contains invalid content":
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": errMsg})
		return
	}

	// 记录注册成功日志（用空 UUID 表示注册场景）
	ip := getClientIP(c)
	ua := c.GetHeader("User-Agent")
	h.authService.RecordLoginLog(uuid.Nil, input.Email, ip, ua, parseDeviceInfo(ua), true, "")

	c.JSON(http.StatusCreated, response)
}

// Login 用户登录
func (h *AuthHandler) Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 设置邮箱用于限流追踪
	c.Set("login_email", input.Email)

	ip := getClientIP(c)
	ua := c.GetHeader("User-Agent")
	deviceInfo := parseDeviceInfo(ua)

	response, err := h.authService.Login(input.Email, input.Password)
	if err != nil {
		// 统一错误提示：不区分"邮箱不存在"和"密码错误"
		failReason := err.Error()

		// 尝试查找用户 ID（用于日志记录，但不暴露给前端）
		var userID uuid.UUID
		var user struct {
			ID uuid.UUID `gorm:"type:uuid;primary_key"`
		}
		if result := h.authService.DB().Table("users").Select("id").Where("email = ?", input.Email).First(&user); result.Error == nil {
			userID = user.ID

			// 管理员登录失败记录风险事件
			var role string
			h.authService.DB().Table("users").Select("role").Where("id = ?", userID).Scan(&role)
			if role == "admin" {
				h.authService.RecordRiskEvent(userID, "admin_login_fail", ip, ua, "Admin account login failure")
			}

			// 检查连续失败次数，达到阈值触发 brute_force 风险事件
			var failCount int
			h.authService.DB().Table("users").Select("login_fail_count").Where("id = ?", userID).Scan(&failCount)
			if failCount >= 4 { // 即将第5次失败，触发暴力破解告警
				h.authService.RecordRiskEvent(userID, "brute_force", ip, ua, fmt.Sprintf("Multiple login failures (%d attempts)", failCount+1))
			}
		}

		// 记录登录失败日志
		h.authService.RecordLoginLog(userID, input.Email, ip, ua, deviceInfo, false, failReason)

		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// 登录成功
	userID, _ := uuid.Parse(response.User.ID)

	// 记录登录成功日志
	h.authService.RecordLoginLog(userID, input.Email, ip, ua, deviceInfo, true, "")

	// 更新 LastLoginIP
	h.authService.DB().Model(&struct{}{}).Table("users").Where("id = ?", userID).Update("last_login_ip", ip)

	// 检测新设备/新IP
	isNewIP, isNewDevice := h.authService.DetectNewDevice(userID, ip, ua)
	if isNewIP {
		h.authService.RecordRiskEvent(userID, "new_ip", ip, ua, "Login from new IP address")
	}
	if isNewDevice {
		h.authService.RecordRiskEvent(userID, "new_device", ip, ua, "Login from new device")
	}

	c.JSON(http.StatusOK, response)
}

// GetMe 获取当前用户信息
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, _ := c.Get("user_id")

	user, err := h.authService.GetUserByID(userID.(string))
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
		"created_at":        user.CreatedAt,
	})
}

// UpdatePassword 修改密码
func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	userID := c.GetString("user_id")

	var input struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 新密码强度校验
	if err := service.ValidatePasswordStrength(input.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.authService.UpdatePassword(userID, input.OldPassword, input.NewPassword)
	if err != nil {
		status := http.StatusBadRequest
		errMsg := err.Error()
		if errMsg == "incorrect current password" {
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{"error": errMsg})
		return
	}

	// 修改密码后撤销所有已有 Token（安全：使旧 session 失效）
	if utils.TokenRevocationMgr != nil {
		if err := utils.TokenRevocationMgr.RevokeUserTokens(userID); err != nil {
			utils.Logger.Warn("Failed to revoke tokens after password change")
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

// UpdateProfile 更新个人资料
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	var input struct {
		Username  string `json:"username"`
		AvatarURL string `json:"avatar_url"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 清洗用户输入
	input.Username = utils.SanitizePlainString(input.Username)
	if !utils.ValidateSafeURL(input.AvatarURL) {
		input.AvatarURL = ""
	}

	err := h.authService.UpdateProfile(userID, input.Username, input.AvatarURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.SafeErrorMessage(err, "Failed to update profile")})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

// RefreshToken 用 refresh_token 换新 access_token
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var input struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "refresh_token is required"})
		return
	}

	// 从 refresh_token 中提取用户信息（refresh_token 格式: 原始userID+"refresh"）
	claims, err := middleware.ParseJWT(h.cfg, input.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	// 检查是否是 refresh token（UserID 末尾带 "refresh"）
	if !strings.HasSuffix(claims.UserID, "refresh") {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not a refresh token"})
		return
	}

	realUserID := strings.TrimSuffix(claims.UserID, "refresh")

	user, err := h.authService.GetUserByID(realUserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	// 检查用户状态
	if user.Status == "banned" {
		c.JSON(http.StatusForbidden, gin.H{"error": "account has been banned"})
		return
	}

	// 生成新的 token 对
	token, err := middleware.GenerateJWT(h.cfg, user.ID.String(), user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	newRefreshToken, err := middleware.GenerateJWT(h.cfg, user.ID.String()+"refresh", user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	c.JSON(http.StatusOK, service.AuthResponse{
		Token:        token,
		RefreshToken: newRefreshToken,
		User:         service.ToUserInfo(*user),
		ExpiresAt:    claims.ExpiresAt.Time,
	})
}

// VerifyEmail 验证邮箱（支持 GET query token 和 POST body token）
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		// 尝试从 POST body 读取
		var input struct {
			Token string `json:"token"`
		}
		if c.ShouldBindJSON(&input) == nil {
			token = input.Token
		}
	}

	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token is required"})
		return
	}

	if err := h.authService.VerifyEmail(token); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully"})
}

// RequestPasswordReset 请求密码重置
func (h *AuthHandler) RequestPasswordReset(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 无论邮箱是否存在，都返回成功（防止邮箱枚举）
	err := h.authService.RequestPasswordReset(input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a reset link has been sent"})
}

// ResetPassword 重置密码
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var input struct {
		Token       string `json:"token" binding:"required"`
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

	if err := h.authService.ResetPassword(input.Token, input.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// IsRegistrationOpen 检查是否开放注册
func (h *AuthHandler) IsRegistrationOpen(c *gin.Context) {
	open := h.authService.IsRegistrationOpen()
	c.JSON(http.StatusOK, gin.H{"registration_open": open})
}

// Logout 登出：撤销当前 Token
func (h *AuthHandler) Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	// 撤销 Token
	if tokenString != "" && tokenString != authHeader {
		if utils.TokenRevocationMgr != nil {
			go func() {
				_ = utils.TokenRevocationMgr.RevokeToken(tokenString, 24*time.Hour)
			}()
		}
	}

	// 记录登出日志
	userID, _ := c.Get("user_id")
	if uid, ok := userID.(string); ok && uid != "" {
		ip := getClientIP(c)
		ua := c.GetHeader("User-Agent")
		h.authService.RecordLoginLog(uuid.MustParse(uid), "", ip, ua, parseDeviceInfo(ua), true, "logout")
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// ResendVerificationEmail 重新发送邮箱验证邮件（需登录）
func (h *AuthHandler) ResendVerificationEmail(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.authService.ResendVerificationEmail(userID.(string)); err != nil {
		status := http.StatusBadRequest
		if err.Error() == "email already verified" {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification email sent"})
}
