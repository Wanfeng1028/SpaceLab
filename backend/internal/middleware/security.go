package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/config"
)

// CORS 中间件
func CORS(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		
		// 检查是否允许
		allowed := false
		for _, allowedOrigin := range cfg.AllowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-CSRF-Token")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// RateLimit 限流中间件
func RateLimit() gin.HandlerFunc {
	requestCount := make(map[string]int)
	lastReset := time.Now()
	resetInterval := 1 * time.Minute
	maxRequests := 100

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		now := time.Now()

		// 每分钟重置计数
		if now.Sub(lastReset) > resetInterval {
			requestCount = make(map[string]int)
			lastReset = now
		}

		requestCount[clientIP]++

		if requestCount[clientIP] > maxRequests {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests, please try again later",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Security 安全中间件
func Security() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		
		c.Next()
	}
}
