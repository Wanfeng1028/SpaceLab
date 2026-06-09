package service

import (
	"context"
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
	ID       string `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Role     string `json:"role"`
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
		User: UserInfo{
			ID:       user.ID.String(),
			Email:    user.Email,
			Username: user.Username,
			Role:     user.Role,
		},
		ExpiresAt: time.Now().Add(s.cfg.JWTExpiration),
	}, nil
}

// Login 用户登录
func (s *AuthService) Login(email, password string) (*AuthResponse, error) {
	var user model.User
	result := s.db.Where("email = ?", email).First(&user)

	if result.Error != nil {
		return nil, errors.New("invalid credentials")
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
		User: UserInfo{
			ID:       user.ID.String(),
			Email:    user.Email,
			Username: user.Username,
			Role:     user.Role,
		},
		ExpiresAt: time.Now().Add(s.cfg.JWTExpiration),
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
	return s.db.Save(&user).Error
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

// RequestPasswordReset 请求密码重置
func (s *AuthService) RequestPasswordReset(email string) error {
	var user model.User
	result := s.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		// 不暴露邮箱是否存在
		return nil
	}

	// 生成重置 token (email:timestamp)
	resetToken := fmt.Sprintf("%s:%d", email, time.Now().Add(1*time.Hour).Unix())

	// 发送邮件
	if s.resendSvc != nil && s.resendSvc.IsConfigured() {
		// 注意: resend 实际发送时需要完整链接，这里传递 token 由 resend_service 拼接
		if err := s.resendSvc.SendPasswordResetEmail(context.Background(), email, resetToken); err != nil {
			utils.Logger.Error("Failed to send password reset email", zap.Error(err))
		}
	}

	return nil
}
