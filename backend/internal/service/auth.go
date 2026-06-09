package service

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/middleware"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/gorm"
)

type AuthService struct {
	db *gorm.DB
	cfg *config.Config
}

type AuthResponse struct {
	Token      string    `json:"token"`
	RefreshToken string  `json:"refresh_token"`
	User       UserInfo  `json:"user"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type UserInfo struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{
		db:  db,
		cfg: cfg,
	}
}

// Register 用户注册
func (s *AuthService) Register(email, password, username string) (*AuthResponse, error) {
	// 检查邮箱是否已存在
	var existingUser interface{}
	s.db.Model(&model.User{}).Where("email = ?", email).First(&existingUser)
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}

	// 密码哈希
	passwordHash := hashPassword(password)

	// 创建用户
	user := model.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: passwordHash,
		Username:     username,
		Role:         "viewer", // 默认角色
	}

	result := s.db.Create(&user)
	if result.Error != nil {
		return nil, result.Error
	}

	// 生成 Token
	token, _ := middleware.GenerateJWT(s.cfg, user.ID.String(), user.Email, user.Role)
	
	// 刷新 Token（实际项目中应使用更安全的机制）
	refreshToken, _ := middleware.GenerateJWT(s.cfg, user.ID.String()+"refresh", user.Email, user.Role)

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
	result := s.db.Preload("Posts").Where("email = ?", email).First(&user)
	
	if result.Error != nil {
		return nil, errors.New("invalid credentials")
	}

	// 验证密码
	if !checkPassword(user.PasswordHash, password) {
		return nil, errors.New("invalid credentials")
	}

	// 生成 Token
	token, _ := middleware.GenerateJWT(s.cfg, user.ID.String(), user.Email, user.Role)

	return &AuthResponse{
		Token: token,
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

	if !checkPassword(user.PasswordHash, oldPassword) {
		return errors.New("incorrect current password")
	}

	user.PasswordHash = hashPassword(newPassword)
	return s.db.Save(&user).Error
}

// UpdateProfile 更新个人资料
func (s *AuthService) UpdateProfile(userID, username, avatarURL string) error {
	var user model.User
	result := s.db.Where("id = ?", userID).First(&user)
	
	if result.Error != nil {
		return result.Error
	}

	user.Username = username
	user.AvatarURL = avatarURL
	return s.db.Save(&user).Error
}

// hashPassword 哈希密码
func hashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return hex.EncodeToString(hash[:])
}

// checkPassword 验证密码
func checkPassword(hash, password string) bool {
	return hash == hashPassword(password)
}
