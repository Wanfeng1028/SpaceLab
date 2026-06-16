package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ContentSecurityPolicy CSP 安全头中间件
func ContentSecurityPolicy() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 生产环境使用严格 CSP，开发环境宽松
		env := c.GetString("environment")
		if env == "production" || env == "prod" {
			c.Header("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src 'self'; "+
					"style-src 'self' 'unsafe-inline'; "+
					"img-src 'self' data: https:; "+
					"font-src 'self'; "+
					"connect-src 'self'; "+
					"frame-ancestors 'none'; "+
					"base-uri 'self'; "+
					"form-action 'self'",
			)
		} else {
			// 开发环境宽松 CSP（允许 localhost、开发工具和 HMR worker）
			c.Header("Content-Security-Policy",
				"default-src 'self' 'unsafe-inline' 'unsafe-eval'; "+
					"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; "+
					"worker-src 'self' blob:; "+
					"img-src 'self' data: https: http:; "+
					"connect-src 'self' http://localhost:* ws://localhost:*; "+
					"frame-ancestors 'none'",
			)
		}

		// Referrer 策略
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// 权限策略（替代 Feature-Policy）
		c.Header("Permissions-Policy",
			"camera=(), microphone=(), geolocation=(), payment=()",
		)

		c.Next()
	}
}

// RequestSizeLimit 请求体大小限制中间件
func RequestSizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxBytes {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Request body too large",
			})
			c.Abort()
			return
		}

		// 限制实际读取的大小
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// NoSnitch 防止信息泄露中间件
func NoSnitch() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 移除可能暴露服务器信息的头
		c.Header("X-Powered-By", "")
		c.Header("Server", "")

		c.Next()
	}
}

// IPBlacklist IP 黑名单中间件
func IPBlacklist(blacklistFunc func(ip string) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		if blacklistFunc != nil && blacklistFunc(clientIP) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// ValidateContentType 验证请求 Content-Type（防止 CSRF + JSON 注入）
func ValidateContentType(allowed ...string) gin.HandlerFunc {
	allowedMap := make(map[string]bool, len(allowed))
	for _, ct := range allowed {
		allowedMap[ct] = true
	}

	return func(c *gin.Context) {
		// 只对有请求体的方法检查
		method := c.Request.Method
		if method != "POST" && method != "PUT" && method != "PATCH" {
			c.Next()
			return
		}

		contentType := c.GetHeader("Content-Type")
		if contentType == "" {
			c.Next()
			return
		}

		// 提取主类型（去掉 ; charset=utf-8 等）
		mainType := strings.Split(contentType, ";")[0]
		mainType = strings.TrimSpace(mainType)

		if len(allowedMap) > 0 && !allowedMap[mainType] {
			c.JSON(http.StatusUnsupportedMediaType, gin.H{
				"error": "Unsupported content type",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
