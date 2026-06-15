package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"
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
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func NewAuthService(db *gorm.DB, cfg *config.Config, resendSvc *utils.ResendService) *AuthService {
	return &AuthService{
		db:        db,
		cfg:       cfg,
		resendSvc: resendSvc,
	}
}

// DB 返回数据库实例（供 handler 使用）
func (s *AuthService) DB() *gorm.DB {
	return s.db
}

// ToUserInfo 从 model.User 构造对外暴露的用户信息（不含敏感字段）
func ToUserInfo(u model.User) UserInfo {
	status := u.Status
	if status == "" {
		status = "active"
	}
	return UserInfo{
		ID:        u.ID.String(),
		Email:     u.Email,
		Username:  u.Username,
		Role:      u.Role,
		Status:    status,
		CreatedAt: u.CreatedAt,
	}
}

// Register 用户注册
func (s *AuthService) Register(email, password, username string) (*AuthResponse, error) {
	// 检查邮箱是否已存在
	var existingUser model.User
	result := s.db.Where("email = ?", email).First(&existingUser)
	if result.Error == nil {
		return nil, errors.New("email already registered")
	}

	// 密码哈希
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// 创建用户
	user := model.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(passwordHash),
		Username:     username,
		Role:         "viewer", // 默认角色
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
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

	// 封禁用户禁止登录
	if user.Status == "banned" {
		return nil, errors.New("account has been banned")
	}

	// 验证密码
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, errors.New("invalid credentials")
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
		user.Username = username
	}
	if avatarURL != "" {
		user.AvatarURL = avatarURL
	}

	return s.db.Save(&user).Error
}

// VerifyEmail 验证邮箱（通过 token）
func (s *AuthService) VerifyEmail(token string) error {
	// token 格式: email:timestamp (用于防重放)
	parts := strings.SplitN(token, ":", 2)
	if len(parts) != 2 {
		return errors.New("invalid token")
	}

	email := parts[0]
	var user model.User
	result := s.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		return errors.New("user not found")
	}

	// 检查是否已验证
	if user.EmailVerifiedAt != nil {
		return errors.New("email already verified")
	}

	now := time.Now()
	user.EmailVerifiedAt = &now
	return s.db.Save(&user).Error
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

// generateRandomToken 使用 crypto/rand 生成随机 token
func generateRandomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", bytes), nil
}
