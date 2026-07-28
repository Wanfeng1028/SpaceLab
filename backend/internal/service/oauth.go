package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/middleware"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/utils"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

// OAuthProfile 标准化的 OAuth 用户信息
type OAuthProfile struct {
	ID        string
	Email     string
	Username  string
	AvatarURL string
	Name      string
}

// OAuthService OAuth 认证服务
type OAuthService struct {
	db         *gorm.DB
	cfg        *config.Config
	googleConf *oauth2.Config
	githubConf *oauth2.Config
}

func NewOAuthService(db *gorm.DB, cfg *config.Config) *OAuthService {
	svc := &OAuthService{db: db, cfg: cfg}
	base := strings.TrimSuffix(cfg.OAuthCallbackBaseURL, "/")

	if cfg.GoogleClientID != "" && cfg.GoogleClientSecret != "" {
		svc.googleConf = &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  base + "/api/v1/auth/google/callback",
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://accounts.google.com/o/oauth2/auth",
				TokenURL: "https://oauth2.googleapis.com/token",
			},
		}
	}

	if cfg.GitHubClientID != "" && cfg.GitHubClientSecret != "" {
		svc.githubConf = &oauth2.Config{
			ClientID:     cfg.GitHubClientID,
			ClientSecret: cfg.GitHubClientSecret,
			RedirectURL:  base + "/api/v1/auth/github/callback",
			Scopes:       []string{"read:user", "user:email"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://github.com/login/oauth/authorize",
				TokenURL: "https://github.com/login/oauth/access_token",
			},
		}
	}

	return svc
}

// IsEnabled 检查某个 OAuth 提供商是否已配置
func (s *OAuthService) IsEnabled(provider string) bool {
	switch provider {
	case "google":
		return s.googleConf != nil
	case "github":
		return s.githubConf != nil
	}
	return false
}

// GetAuthURL 生成 OAuth 授权 URL
func (s *OAuthService) GetAuthURL(provider string) (string, error) {
	switch provider {
	case "google":
		if s.googleConf == nil {
			return "", errors.New("Google OAuth 未配置")
		}
		state, _ := genState()
		return s.googleConf.AuthCodeURL(state,
			oauth2.AccessTypeOnline,
			oauth2.SetAuthURLParam("prompt", "select_account"),
		), nil
	case "github":
		if s.githubConf == nil {
			return "", errors.New("GitHub OAuth 未配置")
		}
		state, _ := genState()
		return s.githubConf.AuthCodeURL(state), nil
	}
	return "", errors.New("未知提供商: " + provider)
}

// HandleCallback 处理回调，返回本地 JWT
func (s *OAuthService) HandleCallback(provider, code string) (*AuthResponse, error) {
	var conf *oauth2.Config
	switch provider {
	case "google":
		conf = s.googleConf
	case "github":
		conf = s.githubConf
	default:
		return nil, errors.New("未知提供商: " + provider)
	}
	if conf == nil {
		return nil, errors.New(provider + " OAuth 未配置")
	}

	ctx := context.Background()
	token, err := conf.Exchange(ctx, code)
	if err != nil {
		utils.Logger.Error("OAuth token exchange failed", zap.Error(err))
		return nil, errors.New("授权码交换失败")
	}

	profile, err := s.fetchProfile(ctx, provider, conf, token)
	if err != nil {
		utils.Logger.Error("获取 OAuth 用户信息失败", zap.Error(err))
		return nil, errors.New("获取用户信息失败")
	}

	user, err := s.findOrCreateUser(provider, profile)
	if err != nil {
		return nil, err
	}

	if user.Status == "banned" {
		return nil, errors.New("账号已被封禁")
	}

	var stamp string
	if utils.TokenRevocationMgr != nil {
		stamp = utils.TokenRevocationMgr.GetOrCreateStamp(user.ID.String())
	}
	jwtToken, err := middleware.GenerateAccessToken(s.cfg, user.ID.String(), user.Email, user.Role, stamp)
	if err != nil {
		return nil, errors.New("生成令牌失败")
	}
	refreshToken, err := middleware.GenerateRefreshToken(s.cfg, user.ID.String()+"refresh", user.Email, user.Role, stamp)
	if err != nil {
		return nil, errors.New("生成刷新令牌失败")
	}

	now := time.Now()
	s.db.Model(user).Updates(map[string]interface{}{
		"last_login_at":    now,
		"login_fail_count": 0,
		"status":           "active",
	})

	return &AuthResponse{
		Token:        jwtToken,
		RefreshToken: refreshToken,
		User:         ToUserInfo(*user),
		ExpiresAt:    time.Now().Add(s.cfg.JWTExpiration),
	}, nil
}

func (s *OAuthService) fetchProfile(ctx context.Context, provider string, conf *oauth2.Config, token *oauth2.Token) (*OAuthProfile, error) {
	client := conf.Client(ctx, token)

	switch provider {
	case "google":
		resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		var data struct {
			Sub     string `json:"sub"`
			Email   string `json:"email"`
			Name    string `json:"name"`
			Picture string `json:"picture"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			return nil, err
		}
		return &OAuthProfile{
			ID: data.Sub, Email: data.Email, Username: data.Name,
			Name: data.Name, AvatarURL: data.Picture,
		}, nil

	case "github":
		req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.github.com/user", nil)
		req.Header.Set("Accept", "application/vnd.github+json")
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var data struct {
			ID        int64  `json:"id"`
			Login     string `json:"login"`
			Name      string `json:"name"`
			Email     string `json:"email"`
			AvatarURL string `json:"avatar_url"`
		}
		if err := json.Unmarshal(body, &data); err != nil {
			return nil, err
		}
		email := data.Email
		if email == "" {
			email = s.fetchGitHubEmail(client)
		}
		return &OAuthProfile{
			ID: fmt.Sprintf("%d", data.ID), Email: email, Username: data.Login,
			Name: data.Name, AvatarURL: data.AvatarURL,
		}, nil
	}

	return nil, errors.New("未知提供商: " + provider)
}

func (s *OAuthService) fetchGitHubEmail(client *http.Client) string {
	resp, err := client.Get("https://api.github.com/user/emails")
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return ""
	}
	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email
		}
	}
	for _, e := range emails {
		if e.Verified {
			return e.Email
		}
	}
	return ""
}

func (s *OAuthService) findOrCreateUser(provider string, p *OAuthProfile) (*model.User, error) {
	var user model.User

	// 1. 通过 OAuth provider + ID 查找
	if err := s.db.Where("oauth_provider = ? AND oauth_id = ?", provider, p.ID).First(&user).Error; err == nil {
		if p.AvatarURL != "" && user.AvatarURL != p.AvatarURL {
			s.db.Model(&user).Update("avatar_url", p.AvatarURL)
			user.AvatarURL = p.AvatarURL
		}
		return &user, nil
	}

	// 2. 通过 email 匹配（绑定已有账号）
	if p.Email != "" {
		if err := s.db.Where("email = ?", p.Email).First(&user).Error; err == nil {
			now := time.Now()
			s.db.Model(&user).Updates(map[string]interface{}{
				"oauth_provider":    provider,
				"oauth_id":          p.ID,
				"avatar_url":        p.AvatarURL,
				"email_verified_at": now,
				"status":            "active",
			})
			user.OAuthProvider = provider
			user.OAuthID = p.ID
			if p.AvatarURL != "" {
				user.AvatarURL = p.AvatarURL
			}
			user.EmailVerifiedAt = &now
			return &user, nil
		}
	}

	// 3. 新建用户
	username := p.Username
	if username == "" {
		username = localBaseUsername(p.Email)
	}
	username = s.uniqueUsername(username)

	now := time.Now()
	user = model.User{
		ID:              uuid.New(),
		Email:           p.Email,
		Username:        username,
		Role:            "viewer",
		Status:          "active",
		AvatarURL:       p.AvatarURL,
		OAuthProvider:   provider,
		OAuthID:         p.ID,
		EmailVerifiedAt: &now,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, errors.New("创建用户失败")
	}
	return &user, nil
}

func (s *OAuthService) uniqueUsername(base string) string {
	candidate := base
	for i := 0; i < 10; i++ {
		var count int64
		s.db.Model(&model.User{}).Where("username = ?", candidate).Count(&count)
		if count == 0 {
			return candidate
		}
		suffix := make([]byte, 3)
		rand.Read(suffix)
		candidate = fmt.Sprintf("%s_%s", base, base64.RawURLEncoding.EncodeToString(suffix))
	}
	return candidate
}

func localBaseUsername(email string) string {
	if idx := strings.Index(email, "@"); idx > 0 {
		return email[:idx]
	}
	return fmt.Sprintf("user_%d", time.Now().Unix())
}

func genState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
