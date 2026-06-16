package handler

import (
	"net/http"

	"github.com/dchest/captcha"
	"github.com/gin-gonic/gin"
)

// CaptchaHandler 图形验证码处理器
type CaptchaHandler struct{}

func NewCaptchaHandler() *CaptchaHandler {
	return &CaptchaHandler{}
}

// GetCaptchaID 获取一个新的验证码 ID（前端用此 ID 加载图片）
// GET /captcha/new → { captcha_id: "xxx" }
func (h *CaptchaHandler) GetCaptchaID(c *gin.Context) {
	id := captcha.New()
	c.JSON(http.StatusOK, gin.H{
		"captcha_id": id,
	})
}

// GetCaptchaImage 输出验证码图片
// GET /captcha/:id.png
func (h *CaptchaHandler) GetCaptchaImage(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "captcha id is required"})
		return
	}
	// 设置响应头，防止缓存
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")
	captcha.WriteImage(c.Writer, id, 240, 80)
}

// VerifyCaptcha 验证验证码
// POST /captcha/verify { captcha_id, answer } → { success: true/false }
func (h *CaptchaHandler) VerifyCaptcha(c *gin.Context) {
	var input struct {
		CaptchaID string `json:"captcha_id" binding:"required"`
		Answer    string `json:"answer" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// VerifyString 验证后会清除该 captcha（一次性使用）
	if captcha.VerifyString(input.CaptchaID, input.Answer) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	} else {
		c.JSON(http.StatusOK, gin.H{"success": false})
	}
}
