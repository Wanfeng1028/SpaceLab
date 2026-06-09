package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/spacelab/backend/internal/utils"
)

// MetricsMiddleware Prometheus 指标中间件
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// 处理请求
		c.Next()

		// 记录指标
		duration := time.Since(start).Seconds()
		statusCode := fmt.Sprintf("%d", c.Writer.Status())

		utils.RecordHttpRequest(c.Request.Method, c.FullPath(), statusCode, duration)
	}
}

// LoggingMiddleware 日志中间件
func LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// 处理请求
		c.Next()

		// 记录日志
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		utils.LogRequest(
			c.Request.Method,
			c.Request.URL.Path,
			statusCode,
			duration,
		)
	}
}

// RecoveryMiddleware 恢复中间件
func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// 记录错误
				utils.LogError("Panic recovered", fmt.Errorf("%v", err))

				// 返回 500 错误
				c.JSON(500, gin.H{
					"error": "Internal server error",
				})
				c.Abort()
			}
		}()

		c.Next()
	}
}

// PrometheusHandler Prometheus 指标处理器
func PrometheusHandler() gin.HandlerFunc {
	handler := promhttp.Handler()
	return func(c *gin.Context) {
		handler.ServeHTTP(c.Writer, c.Request)
	}
}
