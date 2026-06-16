package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"
	"html"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/middleware"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/utils"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// 常见弱密码列表
var commonWeakPasswords = map[string]bool{
	"123456": true, "password": true, "12345678": true, "qwerty": true,
	"123456789": true, "12345": true, "1234": true, "111111": true,
	"1234567": true, "dragon": true, "123123": true, "baseball": true,
	"iloveyou": true, "trustno1": true, "sunshine": true, "master": true,
	"welcome": true, "shadow": true, "ashley": true, "football": true,
	"654321": true, "passw0rd": true, "abc123": true, "letmein": true,
	"admin": true, "login": true, "princess": true, "starwars": true,
	"1q2w3e4r": true, "1qaz2wsx": true, "zaq12wsx": true, "!qaz2wsx": true,
	"qazwsx": true, "1234567890": true, "112233": true, "123321": true,
	"abcdef": true, "abcdefg": true, "asdfgh": true, "asdfghjkl": true,
	"123qwe": true, "1q2w3e": true, "q1w2e3r4": true, "qwer1234": true,
}

// 用户名黑名单正则（防止 XSS、敏感词、广告）
var usernameBlacklist = regexp.MustCompile(`(?i)(admin|root|system|moderator|官方|管理|客服|http|https|www|\.com|\.cn|\.net|<|>|script|on\w+=)`)

type AuthService struct {
	db        *gorm.DB
	cfg       *config.Config
	resendSvc *utils.ResendService
}

type AuthResponse struct {
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
	User         UserInfo  `json:"user"`
	ExpiresAt    time.Time `json:"expires_at"`
}

type UserInfo struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	Username        string     `json:"username"`
	Role            string     `json:"role"`
	Status          string     `json:"status"`
	AvatarURL       string     `json:"avatar_url"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

func NewAuthService(db *gorm.DB, cfg *config.Config, resendSvc *utils.ResendService) *AuthService {
	return &AuthService{
		db:        db,
		cfg:       cfg,
		resendSvc: resendSvc,
	}
}

func (s *AuthService) DB() *gorm.DB {
	return s.db
}

func ToUserInfo(u model.User) UserInfo {
	status := u.Status
	if status == "" {
		status = "active"
	}
	return UserInfo{
		ID:              u.ID.String(),
		Email:           u.Email,
		Username:        u.Username,
		Role:            u.Role,
		Status:          status,
		AvatarURL:       u.AvatarURL,
		EmailVerifiedAt: u.EmailVerifiedAt,
		CreatedAt:       u.CreatedAt,
	}
}

// IsRegistrationOpen 检查是否开放注册
func (s *AuthService) IsRegistrationOpen() bool {
	var setting model.SiteSetting
	result := s.db.Where("`key` = ?", "registration_open").First(&setting)
	if result.Error != nil {
		// 默认开放注册
		return true
	}
	return setting.Value == "true" || setting.Value == "1"
}

// 临时邮箱域名黑名单
var disposableEmailDomains = map[string]bool{
	"10minutemail.com": true, "mailinator.com": true, "guerrillamail.com": true,
	"guerrillamail.net": true, "guerrillamail.org": true, "guerrillamail.biz": true,
	"sharklasers.com": true, "grr.la": true, "yopmail.com": true,
	"yopmail.fr": true, "yopmail.net": true, "throwaway.email": true,
	"trashmail.com": true, "trashmail.net": true,
	"mailnator.com": true, "getnada.com": true, "temp-mail.org": true,
	"temp-mail.ru": true, "tempmail.email": true, "tempmail.net": true,
	"tempmail.org": true, "tempmail.eu": true, "maildrop.cc": true,
	"mailmetrash.com": true, "mailexpire.com": true, "mintemail.com": true,
	"spamgourmet.com": true, "spamspot.com": true, "spam.la": true,
	"emailondeck.com": true, "emailfake.com": true, "emailsilo.com": true,
	"dispostable.com": true, "throw-away.com": true,
	"mailcatch.com": true, "mailsac.com": true, "mailinator2.com": true,
	"mailtaxi.com": true, "mytemp.email": true, "mytrashmail.com": true,
	"quickinbox.com": true, "receivemails.com": true, "receivemail.org": true,
	"receive-sms-online.info": true, "reginamail.com": true, "safetymail.info": true,
	"shortmail.net": true, "slopsbox.com": true, "sofort-mail.de": true,
	"spambox.info": true, "spambox.us": true, "spamcannon.com": true,
	"spamdecoy.net": true, "spamex.com": true, "spamfighter.de": true,
	"spamfree24.org": true, "spamhole.com": true,
}

// ValidateRegistration 校验注册参数
func (s *AuthService) ValidateRegistration(email, password, username string) error {
	// 邮箱格式校验
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return errors.New("invalid email format")
	}

	// 临时邮箱拦截
	parts := strings.Split(email, "@")
	if len(parts) == 2 {
		domain := strings.ToLower(strings.TrimSpace(parts[1]))
		if disposableEmailDomains[domain] {
			return errors.New("disposable email addresses are not allowed")
		}
	}

	// 邮箱唯一性校验
	var existingUser model.User
	result := s.db.Where("email = ?", email).First(&existingUser)
	if result.Error == nil {
		return errors.New("email already registered")
	}

	// 用户名内容过滤
	sanitized := html.EscapeString(username)
	if sanitized != username || usernameBlacklist.MatchString(username) {
		return errors.New("username contains invalid content")
	}

	// 用户名长度
	if len(username) < 2 || len(username) > 50 {
		return errors.New("username must be between 2 and 50 characters")
	}

	// 密码强度校验
	if err := ValidatePasswordStrength(password); err != nil {
		return err
	}

	return nil
}

// ValidatePasswordStrength 密码强度校验
func ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	if len(password) > 128 {
		return errors.New("password must be at most 128 characters")
	}

	// 常见弱密码拦截
	if commonWeakPasswords[strings.ToLower(password)] {
		return errors.New("this password is too common, please choose a stronger one")
	}

	hasUpper := false
	hasLower := false
	hasDigit := false

	for _, ch := range password {
		switch {
		case ch >= 'A' && ch <= 'Z':
			hasUpper = true
		case ch >= 'a' && ch <= 'z':
			hasLower = true
		case ch >= '0' && ch <= '9':
			hasDigit = true
		}
	}

	if !hasUpper || !hasLower || !hasDigit {
		return errors.New("password must contain uppercase, lowercase, and numbers")
	}

	return nil
}

// Register 用户注册
func (s *AuthService) Register(email, password, username string) (*AuthResponse, error) {
	// 检查是否开放注册
	if !s.IsRegistrationOpen() {
		return nil, errors.New("registration is currently closed")
	}

	// 注册参数校验
	if err := s.ValidateRegistration(email, password, username); err != nil {
		return nil, err
	}

	// 密码哈希（bcrypt）
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// 创建用户（状态为 pending_verify，需邮箱验证）
	user := model.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(passwordHash),
		Username:     username,
		Role:         "viewer",
		Status:       "pending_verify",
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	// 发送邮箱验证邮件（使用安全的随机 token + 数据库存储 hash）
	if s.resendSvc != nil && s.resendSvc.IsConfigured() {
		rawToken, err := generateRandomToken(32)
		if err == nil {
			// 存储 token 的 SHA-256 哈希到数据库
			tokenHash := sha256.Sum256([]byte(rawToken))
			expiresAt := time.Now().Add(24 * time.Hour) // 验证链接 24 小时有效

			// 撤销之前的未使用 token
			s.db.Model(&model.EmailVerificationToken{}).Where("user_id = ? AND used = false", user.ID).Update("used", true)

			verifyToken := model.EmailVerificationToken{
				ID:        uuid.New(),
				UserID:    user.ID,
				TokenHash: fmt.Sprintf("%x", tokenHash[:]),
				ExpiresAt: expiresAt,
				Used:      false,
			}
			if err := s.db.Create(&verifyToken).Error; err != nil {
				utils.Logger.Warn("Failed to store email verification token", zap.Error(err))
			} else if err := s.resendSvc.SendVerificationEmail(context.Background(), email, rawToken); err != nil {
				utils.Logger.Warn("Failed to send verification email", zap.Error(err))
			}
		}
	}

	// 生成 Token
	token, err := middleware.GenerateJWT(s.cfg, user.ID.String(), user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	// 刷新 Token
	refreshToken, err := middleware.GenerateJWT(s.cfg, user.ID.String()+"refresh", user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         ToUserInfo(user),
		ExpiresAt:    time.Now().Add(s.cfg.JWTExpiration),
	}, nil
}

// Login 用户登录
func (s *AuthService) Login(email, password string) (*AuthResponse, error) {
	var user model.User
	result := s.db.Where("email = ?", email).First(&user)

	if result.Error != nil {
		return nil, errors.New("invalid credentials")
	}

	// 检查用户状态
	switch user.Status {
	case "banned":
		return nil, errors.New("invalid credentials")
	case "locked":
		if user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
			return nil, errors.New("invalid credentials")
		}
		// 锁定已过期，自动解锁
		s.db.Model(&user).Updates(map[string]interface{}{
			"status":           "active",
			"login_fail_count": 0,
			"locked_until":     nil,
		})
		user.Status = "active"
		user.LoginFailCount = 0
	case "pending_verify":
		// 允许登录但返回状态让前端提示
	}

	// 验证密码
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		// 密码错误，增加失败计数
		newFailCount := user.LoginFailCount + 1
		updates := map[string]interface{}{
			"login_fail_count": newFailCount,
		}

		// 达到锁定阈值（5次），锁定15分钟
		if newFailCount >= 5 {
			lockedUntil := time.Now().Add(15 * time.Minute)
			updates["status"] = "locked"
			updates["locked_until"] = lockedUntil
		}

		s.db.Model(&user).Updates(updates)
		return nil, errors.New("invalid credentials")
	}

	// 登录成功，重置失败计数
	now := time.Now()
	s.db.Model(&user).Updates(map[string]interface{}{
		"login_fail_count": 0,
		"status":           "active",
		"locked_until":     nil,
		"last_login_at":    now,
	})

	// 生成 Token
	token, err := middleware.GenerateJWT(s.cfg, user.ID.String(), user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	// 刷新 Token
	refreshToken, err := middleware.GenerateJWT(s.cfg, user.ID.String()+"refresh", user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         ToUserInfo(user),
		ExpiresAt:    time.Now().Add(s.cfg.JWTExpiration),
	}, nil
}

// RecordLoginLog 记录登录日志
func (s *AuthService) RecordLoginLog(userID uuid.UUID, email, ip, userAgent, deviceInfo string, success bool, failReason string) {
	log := model.LoginLog{
		ID:         uuid.New(),
		UserID:     userID,
		Email:      email,
		IP:         ip,
		UserAgent:  userAgent,
		DeviceInfo: deviceInfo,
		Success:    success,
		FailReason: failReason,
		LoginAt:    time.Now(),
	}
	if err := s.db.Create(&log).Error; err != nil {
		utils.Logger.Warn("Failed to record login log", zap.Error(err))
	}
}

// RecordRiskEvent 记录风险事件
func (s *AuthService) RecordRiskEvent(userID uuid.UUID, eventType, ip, userAgent, details string) {
	event := model.RiskEvent{
		ID:        uuid.New(),
		UserID:    userID,
		EventType: eventType,
		IP:        ip,
		UserAgent: userAgent,
		Details:   details,
		CreatedAt: time.Now(),
	}
	if err := s.db.Create(&event).Error; err != nil {
		utils.Logger.Warn("Failed to record risk event", zap.Error(err))
	}
}

// DetectNewDevice 检测是否是新设备或新IP
func (s *AuthService) DetectNewDevice(userID uuid.UUID, ip, userAgent string) (isNewIP bool, isNewDevice bool) {
	var count int64
	// 检查新IP
	s.db.Model(&model.LoginLog{}).Where("user_id = ? AND ip = ? AND success = ?", userID, ip, true).Count(&count)
	isNewIP = count == 0

	// 检查新设备（通过 User-Agent 简化判断）
	s.db.Model(&model.LoginLog{}).Where("user_id = ? AND user_agent = ? AND success = ?", userID, userAgent, true).Count(&count)
	isNewDevice = count == 0

	return
}

// GetUserByID 获取用户信息
func (s *AuthService) GetUserByID(userID string) (*model.User, error) {
	var user model.User
	result := s.db.Where("id = ?", userID).First(&user)

	if result.Error != nil {
		return nil, result.Error
	}

	return &user, nil
}

// UpdatePassword 修改密码
func (s *AuthService) UpdatePassword(userID, oldPassword, newPassword string) error {
	var user model.User
	result := s.db.Where("id = ?", userID).First(&user)

	if result.Error != nil {
		return result.Error
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("incorrect current password")
	}

	// 新密码强度校验
	if err := ValidatePasswordStrength(newPassword); err != nil {
		return err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to hash password")
	}

	user.PasswordHash = string(passwordHash)
	if err := s.db.Save(&user).Error; err != nil {
		return err
	}

	// 撤销该用户所有已有 token（安全：修改密码后使旧 session 失效）
	if utils.TokenRevocationMgr != nil {
		if err := utils.TokenRevocationMgr.RevokeUserTokens(user.ID.String()); err != nil {
			utils.Logger.Warn("Failed to revoke user tokens on password change", zap.Error(err))
		}
	}

	return nil
}

// UpdateProfile 更新个人资料
func (s *AuthService) UpdateProfile(userID, username, avatarURL string) error {
	var user model.User
	result := s.db.Where("id = ?", userID).First(&user)

	if result.Error != nil {
		return result.Error
	}

	if username != "" {
		// 用户名内容过滤
		sanitized := html.EscapeString(username)
		if sanitized != username || usernameBlacklist.MatchString(username) {
			return errors.New("username contains invalid content")
		}
		user.Username = username
	}
	if avatarURL != "" {
		user.AvatarURL = avatarURL
	}

	return s.db.Save(&user).Error
}

// VerifyEmail 验证邮箱（通过 token）
func (s *AuthService) VerifyEmail(token string) error {
	// 使用 SHA-256 哈希查找 token（与 PasswordResetToken 一致的安全机制）
	tokenHash := sha256.Sum256([]byte(token))
	hashStr := fmt.Sprintf("%x", tokenHash[:])

	var verifyToken model.EmailVerificationToken
	result := s.db.Where("token_hash = ? AND used = false", hashStr).First(&verifyToken)
	if result.Error != nil {
		return errors.New("invalid or expired verification token")
	}

	// 检查过期
	if time.Now().After(verifyToken.ExpiresAt) {
		return errors.New("verification token has expired, please request a new one")
	}

	// 查找用户
	var user model.User
	if err := s.db.Where("id = ?", verifyToken.UserID).First(&user).Error; err != nil {
		return errors.New("user not found")
	}

	// 检查是否已验证
	if user.EmailVerifiedAt != nil {
		return errors.New("email already verified")
	}

	// 标记 token 已使用
	s.db.Model(&verifyToken).Update("used", true)

	// 更新用户状态
	now := time.Now()
	user.EmailVerifiedAt = &now
	user.Status = "active"
	return s.db.Save(&user).Error
}

// ResendVerificationEmail 重新发送邮箱验证邮件
func (s *AuthService) ResendVerificationEmail(userID string) error {
	var user model.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return errors.New("user not found")
	}

	// 已验证则不重发
	if user.EmailVerifiedAt != nil {
		return errors.New("email already verified")
	}

	// 频率限制：检查最近是否有未过期的 token（1 分钟内不重发）
	var recentToken model.EmailVerificationToken
	recentResult := s.db.Where("user_id = ? AND used = false AND created_at > ?", user.ID, time.Now().Add(-1*time.Minute)).First(&recentToken)
	if recentResult.Error == nil {
		return errors.New("verification email sent recently, please wait before requesting again")
	}

	if s.resendSvc == nil || !s.resendSvc.IsConfigured() {
		return errors.New("email service not configured")
	}

	// 生成新的随机 token
	rawToken, err := generateRandomToken(32)
	if err != nil {
		return errors.New("failed to generate token")
	}

	tokenHash := sha256.Sum256([]byte(rawToken))
	expiresAt := time.Now().Add(24 * time.Hour)

	// 撤销之前的未使用 token
	s.db.Model(&model.EmailVerificationToken{}).Where("user_id = ? AND used = false", user.ID).Update("used", true)

	verifyToken := model.EmailVerificationToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: fmt.Sprintf("%x", tokenHash[:]),
		ExpiresAt: expiresAt,
		Used:      false,
	}
	if err := s.db.Create(&verifyToken).Error; err != nil {
		return errors.New("failed to store token")
	}

	if err := s.resendSvc.SendVerificationEmail(context.Background(), user.Email, rawToken); err != nil {
		utils.Logger.Warn("Failed to send verification email", zap.Error(err))
		return errors.New("failed to send email")
	}

	return nil
}

// RequestPasswordReset 请求密码重置（使用随机 Token + 数据库存储）
func (s *AuthService) RequestPasswordReset(email string) error {
	var user model.User
	result := s.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		// 不暴露邮箱是否存在
		return nil
	}

	// 生成随机 Token
	rawToken, err := generateRandomToken(32)
	if err != nil {
		return errors.New("failed to generate token")
	}

	// 存储 Token 的 SHA-256 哈希到数据库
	tokenHash := sha256.Sum256([]byte(rawToken))
	expiresAt := time.Now().Add(1 * time.Hour)

	// 撤销之前的未使用 token
	s.db.Model(&model.PasswordResetToken{}).Where("user_id = ? AND used = false", user.ID).Update("used", true)

	newToken := model.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: fmt.Sprintf("%x", tokenHash[:]),
		ExpiresAt: expiresAt,
		Used:      false,
	}
	if err := s.db.Create(&newToken).Error; err != nil {
		return errors.New("failed to store token")
	}

	// 发送邮件（resend_service 使用 rawToken 拼接链接）
	if s.resendSvc != nil && s.resendSvc.IsConfigured() {
		if err := s.resendSvc.SendPasswordResetEmail(context.Background(), email, rawToken); err != nil {
			utils.Logger.Error("Failed to send password reset email", zap.Error(err))
		}
	}

	return nil
}

// ResetPassword 使用 token 重置密码
func (s *AuthService) ResetPassword(token, newPassword string) error {
	// 新密码强度校验
	if err := ValidatePasswordStrength(newPassword); err != nil {
		return err
	}

	tokenHash := sha256.Sum256([]byte(token))
	hashStr := fmt.Sprintf("%x", tokenHash[:])

	var resetToken model.PasswordResetToken
	result := s.db.Where("token_hash = ? AND used = false", hashStr).First(&resetToken)
	if result.Error != nil {
		return errors.New("invalid or expired token")
	}

	if time.Now().After(resetToken.ExpiresAt) {
		return errors.New("token expired")
	}

	// 查找用户
	var user model.User
	if err := s.db.First(&user, resetToken.UserID).Error; err != nil {
		return errors.New("user not found")
	}

	// 更新密码
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to hash password")
	}
	user.PasswordHash = string(passwordHash)
	if err := s.db.Save(&user).Error; err != nil {
		return err
	}

	// 标记 token 为已使用
	resetToken.Used = true
	s.db.Save(&resetToken)

	// 撤销该用户所有已有 token（安全：重置密码后使旧 session 失效）
	if utils.TokenRevocationMgr != nil {
		if err := utils.TokenRevocationMgr.RevokeUserTokens(user.ID.String()); err != nil {
			utils.Logger.Warn("Failed to revoke user tokens on password reset", zap.Error(err))
		}
	}

	return nil
}

// --- 管理后台服务方法 ---

// ListLoginLogs 获取登录日志
func (s *AuthService) ListLoginLogs(page, pageSize int, userID string) ([]model.LoginLog, int64, error) {
	var logs []model.LoginLog
	var total int64

	query := s.db.Model(&model.LoginLog{})
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	query.Count(&total)
	result := query.Offset((page - 1) * pageSize).Limit(pageSize).Order("login_at DESC").Find(&logs)
	return logs, total, result.Error
}

// ListRiskEvents 获取风险事件
func (s *AuthService) ListRiskEvents(page, pageSize int, userID string, resolved *bool) ([]model.RiskEvent, int64, error) {
	var events []model.RiskEvent
	var total int64

	query := s.db.Model(&model.RiskEvent{})
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if resolved != nil {
		query = query.Where("resolved = ?", *resolved)
	}

	query.Count(&total)
	result := query.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&events)
	return events, total, result.Error
}

// LockUser 锁定用户
func (s *AuthService) LockUser(userID string, duration time.Duration) error {
	lockedUntil := time.Now().Add(duration)
	return s.db.Model(&model.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"status":       "locked",
		"locked_until": lockedUntil,
	}).Error
}

// UnlockUser 解锁用户
func (s *AuthService) UnlockUser(userID string) error {
	return s.db.Model(&model.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"status":           "active",
		"login_fail_count": 0,
		"locked_until":     nil,
	}).Error
}

// BanUser 封禁用户
func (s *AuthService) BanUser(userID string) error {
	return s.db.Model(&model.User{}).Where("id = ?", userID).Update("status", "banned").Error
}

// UnbanUser 解封用户
func (s *AuthService) UnbanUser(userID string) error {
	return s.db.Model(&model.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"status":           "active",
		"login_fail_count": 0,
		"locked_until":     nil,
	}).Error
}

// UpdateUserStatus 更新用户状态（兼容旧接口）
func (s *AuthService) UpdateUserStatus(userID, status string) error {
	return s.db.Model(&model.User{}).Where("id = ?", userID).Update("status", status).Error
}

// GetSiteSetting 获取站点设置
func (s *AuthService) GetSiteSetting(key string) (string, error) {
	var setting model.SiteSetting
	result := s.db.Where("`key` = ?", key).First(&setting)
	if result.Error != nil {
		return "", result.Error
	}
	return setting.Value, nil
}

// SetSiteSetting 设置站点设置
func (s *AuthService) SetSiteSetting(key, value string) error {
	var setting model.SiteSetting
	result := s.db.Where("`key` = ?", key).First(&setting)
	if result.Error != nil {
		// 创建新设置
		setting = model.SiteSetting{
			ID:    uuid.New(),
			Key:   key,
			Value: value,
		}
		return s.db.Create(&setting).Error
	}
	setting.Value = value
	return s.db.Save(&setting).Error
}

// ResolveRiskEvent 标记风险事件为已解决
func (s *AuthService) ResolveRiskEvent(eventID string) error {
	return s.db.Model(&model.RiskEvent{}).Where("id = ?", eventID).Update("resolved", true).Error
}

// generateRandomToken 使用 crypto/rand 生成随机 token
func generateRandomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", bytes), nil
}
