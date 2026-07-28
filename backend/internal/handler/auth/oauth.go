package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/service"
)

type OAuthHandler struct {
	oauthSvc *service.OAuthService
	cfg      *config.Config
}

func NewOAuthHandler(oauthSvc *service.OAuthService, cfg *config.Config) *OAuthHandler {
	return &OAuthHandler{oauthSvc: oauthSvc, cfg: cfg}
}

// Initiate 发起 OAuth 登录，重定向到提供商授权页
func (h *OAuthHandler) Initiate(c *gin.Context) {
	provider := c.Param("provider")

	if !h.oauthSvc.IsEnabled(provider) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": provider + " 登录未配置，请联系管理员",
		})
		return
	}

	authURL, err := h.oauthSvc.GetAuthURL(provider)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成授权链接失败"})
		return
	}

	// 重定向到 OAuth 提供商
	c.Redirect(http.StatusFound, authURL)
}

// Callback 处理 OAuth 提供商的回调
func (h *OAuthHandler) Callback(c *gin.Context) {
	provider := c.Param("provider")
	code := c.Query("code")
	errorParam := c.Query("error")

	if errorParam != "" {
		// 用户拒绝授权或其他错误
		redirectURL := h.cfg.OAuthCallbackBaseURL + "/auth/callback?error=" + errorParam
		c.Redirect(http.StatusFound, redirectURL)
		return
	}

	if code == "" {
		redirectURL := h.cfg.OAuthCallbackBaseURL + "/auth/callback?error=missing_code"
		c.Redirect(http.StatusFound, redirectURL)
		return
	}

	// 处理回调：交换 token、获取用户信息、生成 JWT
	result, err := h.oauthSvc.HandleCallback(provider, code)
	if err != nil {
		redirectURL := h.cfg.OAuthCallbackBaseURL + "/auth/callback?error=" + err.Error()
		c.Redirect(http.StatusFound, redirectURL)
		return
	}

	// 构造前端回调 URL，通过 URL hash 传递 token
	// 前端 /auth/callback 路由会解析并存储 token
	redirectURL := h.cfg.OAuthCallbackBaseURL + "/auth/callback" +
		"#token=" + result.Token +
		"&refresh_token=" + result.RefreshToken +
		"&expires_at=" + result.ExpiresAt.Format("2006-01-02T15:04:05Z")

	c.Redirect(http.StatusFound, redirectURL)
}
