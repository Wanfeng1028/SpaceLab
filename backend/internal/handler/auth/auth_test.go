package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/service"
	"github.com/spacelab/backend/internal/utils"
)

func init() {
	utils.InitLogger()
	gin.SetMode(gin.TestMode)
}

// TestAuthHandler_RegisterValidation 测试注册参数验证
func TestAuthHandler_RegisterValidation(t *testing.T) {
	handler := &AuthHandler{
		authService:     nil,
		cfg:             &config.Config{JWTSecret: "test"},
		turnstileSecret: "",
	}

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "missing email",
			body:       `{"password":"Password1","username":"test"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing password",
			body:       `{"email":"test@test.com","username":"test"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing username",
			body:       `{"email":"test@test.com","password":"Password1"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid email",
			body:       `{"email":"not-an-email","password":"Password1","username":"test"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "short password",
			body:       `{"email":"test@test.com","password":"Ab1","username":"test"}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/auth/register", strings.NewReader(tt.body))
			c.Request.Header.Set("Content-Type", "application/json")

			handler.Register(c)

			if w.Code != tt.wantStatus {
				t.Errorf("Register(%q) status = %d, want %d", tt.name, w.Code, tt.wantStatus)
			}
		})
	}
}

// TestGetClientIP 测试 IP 获取
func TestGetClientIP(t *testing.T) {
	tests := []struct {
		name    string
		headers map[string]string
		remote  string
		want    string
	}{
		{"X-Forwarded-For", map[string]string{"X-Forwarded-For": "1.2.3.4"}, "10.0.0.1", "1.2.3.4"},
		{"X-Real-IP", map[string]string{"X-Real-IP": "5.6.7.8"}, "10.0.0.1", "5.6.7.8"},
		{"Direct IP", map[string]string{}, "9.9.9.9", "9.9.9.9"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/", nil)
			c.Request.RemoteAddr = tt.remote + ":12345"
			for k, v := range tt.headers {
				c.Request.Header.Set(k, v)
			}

			got := getClientIP(c)
			if got != tt.want {
				t.Errorf("getClientIP() = %q, want %q", got, tt.want)
			}
		})
	}
}

// TestParseDeviceInfo 测试设备信息解析
func TestParseDeviceInfo(t *testing.T) {
	tests := []struct {
		name string
		ua   string
		want string
	}{
		{"Chrome Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0", "Windows PC"},
		{"Firefox macOS", "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0) Gecko/20100101 Firefox/121.0", "Mac"},
		{"Safari iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148", "iPhone"},
		{"Unknown", "curl/8.0.1", "Unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseDeviceInfo(tt.ua)
			if got != tt.want {
				t.Errorf("parseDeviceInfo(%q) = %q, want %q", tt.ua, got, tt.want)
			}
		})
	}
}

// TestValidatePasswordStrength 测试密码强度
func TestValidatePasswordStrength(t *testing.T) {
	if service.ValidatePasswordStrength("Short1A") == nil {
		t.Error("Expected error for password < 8 chars")
	}
	if service.ValidatePasswordStrength("nouppercaseornumbers") == nil {
		t.Error("Expected error for password without uppercase/numbers")
	}
	if service.ValidatePasswordStrength("ValidPass1") != nil {
		t.Error("Expected no error for valid password")
	}
	if service.ValidatePasswordStrength("123456") == nil {
		t.Error("Expected error for weak password (all digits)")
	}
}
