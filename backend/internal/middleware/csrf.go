package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CSRF 防护中间件
// 对于 GET/HEAD/OPTIONS 请求，设置 CSRF Token
// 对于其他请求，验证 CSRF Token
func CSRF() gin.HandlerFunc {
	// CSRF Token 存储：token -> expiry
	tokens := make(map[string]time.Time)
	tokenExpiry := 1 * time.Hour

	// 定期清理过期 token
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			for token, expiry := range tokens {
				if now.After(expiry) {
					delete(tokens, token)
				}
			}
		}
	}()

	return func(c *gin.Context) {
		method := c.Request.Method

		// 安全方法（GET/HEAD/OPTIONS/TRACE）不需要验证，但需要设置 Token
		if method == "GET" || method == "HEAD" || method == "OPTIONS" || method == "TRACE" {
			// 生成或获取 CSRF Token
			csrfToken := c.GetHeader("X-CSRF-Token")
			if csrfToken == "" {
				csrfToken = uuid.New().String()
				// 存储 token
				tokens[csrfToken] = time.Now().Add(tokenExpiry)
				// 设置响应头
				c.Header("X-CSRF-Token", csrfToken)
				c.Header("Cache-Control", "no-store")
			}
			c.Next()
			return
		}

		// 不安全方法需要验证 CSRF Token
		csrfToken := c.GetHeader("X-CSRF-Token")
		if csrfToken == "" {
			// 检查 Cookie 中的 token（备用方案）
			csrfToken, _ = c.Cookie("csrf_token")
		}

		if csrfToken == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "CSRF token missing",
			})
			c.Abort()
			return
		}

		// 验证 token 是否存在且未过期
		expiry, exists := tokens[csrfToken]
		if !exists || time.Now().After(expiry) {
			if exists {
				delete(tokens, csrfToken)
			}
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Invalid or expired CSRF token",
			})
			c.Abort()
			return
		}

		// 验证成功，删除 token（一次性使用）
		delete(tokens, csrfToken)

		// 额外验证：检查 Origin 或 Referer
		origin := c.GetHeader("Origin")
		referer := c.GetHeader("Referer")

		if origin == "" && referer == "" {
			// 允许本地开发环境
			if c.Request.Host == "localhost:8080" || c.Request.Host == "127.0.0.1:8080" {
				c.Next()
				return
			}
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Missing Origin or Referer header",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GenerateCSRFToken 生成新的 CSRF Token（供 API 使用）
func GenerateCSRFToken() string {
	return uuid.New().String()
}

// ValidateCSRFToken 验证 CSRF Token（供服务层使用）
func ValidateCSRFToken(token string) bool {
	// 简单验证格式
	if token == "" || len(token) < 36 {
		return false
	}
	// 尝试解析为 UUID
	_, err := uuid.Parse(token)
	return err == nil
}

// SanitizeInput 输入清理函数
// 仅清理明显的 XSS 向量（HTML 标签和脚本），保留 Markdown 语法字符
func SanitizeInput(input string) string {
	// 移除 HTML 标签（<...> 完整标签）
	input = stripHTMLTags(input)
	// 移除 javascript: 协议
	input = strings.ReplaceAll(input, "javascript:", "")
	input = strings.ReplaceAll(input, "vbscript:", "")
	// 移除 on* 事件处理器属性
	input = stripEventHandlers(input)
	return strings.TrimSpace(input)
}

// stripHTMLTags 移除 HTML 标签但保留 Markdown 语法字符
func stripHTMLTags(s string) string {
	// 使用正则匹配完整的 HTML 标签
	var result strings.Builder
	inTag := false
	i := 0
	for i < len(s) {
		if s[i] == '<' {
			// 检查是否是 HTML 标签开始
			if i+1 < len(s) && (s[i+1] == '/' || s[i+1] == '!' || isLetter(s[i+1])) {
				inTag = true
				i++
				continue
			}
			// 不是 HTML 标签，保留 < 字符
			result.WriteByte(s[i])
			i++
			continue
		}
		if s[i] == '>' && inTag {
			inTag = false
			i++
			continue
		}
		if !inTag {
			result.WriteByte(s[i])
		}
		i++
	}
	return result.String()
}

// isLetter 检查是否为字母
func isLetter(b byte) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z')
}

// stripEventHandlers 移除 on* 事件处理器
func stripEventHandlers(s string) string {
	// 移除常见的 on* 事件处理器
	eventHandlers := []string{
		"onclick", "ondblclick", "onmousedown", "onmouseup", "onmouseover",
		"onmousemove", "onmouseout", "onmouseenter", "onmouseleave",
		"onkeydown", "onkeypress", "onkeyup",
		"onfocus", "onblur", "onchange", "oninput", "onsubmit", "onreset",
		"onload", "onunload", "onerror", "onresize", "onscroll",
		"oncontextmenu", "onwheel", "ondrag", "ondragend", "ondragenter",
		"ondragleave", "ondragover", "ondragstart", "ondrop",
		"ontouchstart", "ontouchmove", "ontouchend",
	}
	lower := strings.ToLower(s)
	result := s
	for _, handler := range eventHandlers {
		// 不区分大小写替换
		for {
			idx := strings.Index(lower, handler)
			if idx < 0 {
				break
			}
			// 找到匹配位置，向前查找 = 号确认是属性
			before := strings.LastIndex(result[:idx], "=")
			if before >= 0 {
				// 找到属性开始位置，删除到引号结束
				end := idx
				for end < len(result) && result[end] != '"' && result[end] != '\'' && result[end] != ' ' && result[end] != '>' {
					end++
				}
				if end < len(result) && (result[end] == '"' || result[end] == '\'') {
					end++ // 包含结束引号
				}
				result = result[:before] + result[end:]
				lower = strings.ToLower(result)
			} else {
				break
			}
		}
	}
	return result
}
