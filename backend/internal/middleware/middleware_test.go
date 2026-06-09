package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/middleware"
)

// TestCORS 测试 CORS 中间件
func TestCORS(t *testing.T) {
	cfg := &config.Config{
		AllowedOrigins: []string{"http://localhost:4200"},
	}

	r := gin.Default()
	r.Use(middleware.CORS(cfg))

	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "ok"})
	})

	// 测试 OPTIONS 请求
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "http://localhost:4200")
	r.ServeHTTP(w, req)

	if w.Code != 204 {
		t.Errorf("Expected status 204, got %d", w.Code)
	}

	if w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:4200" {
		t.Errorf("Expected CORS header, got '%s'", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

// TestSecurity 测试安全头中间件
func TestSecurity(t *testing.T) {
	r := gin.Default()
	r.Use(middleware.Security())

	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	if w.Header().Get("X-Frame-Options") != "DENY" {
		t.Errorf("Expected X-Frame-Options DENY, got '%s'", w.Header().Get("X-Frame-Options"))
	}

	if w.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Errorf("Expected X-Content-Type-Options nosniff, got '%s'", w.Header().Get("X-Content-Type-Options"))
	}
}

// TestRateLimit 测试限流中间件
func TestRateLimit(t *testing.T) {
	r := gin.Default()
	r.Use(middleware.RateLimit())

	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "ok"})
	})

	// 发送多个请求
	for i := 0; i < 105; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		r.ServeHTTP(w, req)

		if i >= 100 && w.Code != 429 {
			t.Errorf("Expected status 429 at request %d, got %d", i, w.Code)
		}
	}
}

// TestAuthMiddleware 测试认证中间件
func TestAuthMiddleware(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "test-secret",
	}

	r := gin.Default()
	r.Use(middleware.Auth(cfg))

	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "ok"})
	})

	// 测试无 Token
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("Expected status 401, got %d", w.Code)
	}

	// 测试无效 Token
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("Expected status 401, got %d", w.Code)
	}
}

// TestRequireRole 测试角色权限中间件
func TestRequireRole(t *testing.T) {
	r := gin.Default()

	// 模拟用户角色
	r.Use(func(c *gin.Context) {
		c.Set("role", "viewer")
		c.Next()
	})

	r.GET("/test", middleware.RequireRole("admin"), func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "ok"})
	})

	// 测试权限不足
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	if w.Code != 403 {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}
