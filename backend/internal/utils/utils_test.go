package utils

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// TestLogger 测试日志系统
func TestLogger(t *testing.T) {
	// 初始化日志
	InitLogger()
	defer Logger.Sync()

	// 测试基本日志
	Logger.Info("Test info message",
		zap.String("key", "value"),
		zap.Int("count", 42),
	)

	// 测试错误日志
	LogError("Test error message", fmt.Errorf("test error"))

	// 测试请求日志
	LogRequest("GET", "/test", 200, 100*time.Millisecond)

	// 测试认证日志
	LogAuth("login", "user-123", true)

	// 测试分析日志
	LogAnalytics("page_view", "/home")
}

// TestCache 测试缓存系统
func TestCache(t *testing.T) {
	// 注意：需要 Redis 运行才能测试
	// 这里只测试无 Redis 时的行为

	ctx := context.Background()

	// 测试无 Redis 时的缓存操作
	err := CacheSet(ctx, "test-key", "test-value", 5*time.Minute)
	if err != nil {
		t.Errorf("CacheSet should not error without Redis: %v", err)
	}

	var value string
	err = CacheGet(ctx, "test-key", &value)
	if err != redis.Nil {
		t.Errorf("CacheGet should return redis.Nil without Redis: %v", err)
	}

	// 测试缓存存在检查
	exists, err := CacheExists(ctx, "test-key")
	if err != nil {
		t.Errorf("CacheExists should not error: %v", err)
	}
	if exists {
		t.Error("CacheExists should return false without Redis")
	}
}

// TestMetrics 测试指标系统
func TestMetrics(t *testing.T) {
	// 测试 HTTP 请求指标
	RecordHttpRequest("GET", "/test", "200", 0.1)

	// 测试数据库查询指标
	RecordDBQuery("SELECT", "posts", 0.05)

	// 测试活跃用户
	IncrementActiveUsers()
	DecrementActiveUsers()

	// 测试文章总数
	SetPostsTotal(100)

	// 测试评论总数
	IncrementCommentsTotal()

	// 测试上传大小
	RecordUploadSize(1024)

	// 测试缓存命中
	RecordCacheHit()
	RecordCacheMiss()
}

// TestWebSocket 测试 WebSocket
func TestWebSocket(t *testing.T) {
	// 初始化 WebSocket
	InitWebSocket()

	// 测试在线用户统计
	count := Hub.GetOnlineCount()
	if count != 0 {
		t.Errorf("Expected 0 online users, got %d", count)
	}

	// 测试获取在线用户列表
	users := Hub.GetOnlineUsers()
	if len(users) != 0 {
		t.Errorf("Expected 0 users in list, got %d", len(users))
	}
}

// TestSanitizeFunctions 测试数据清洗函数
func TestSanitizeFunctions(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"strip basic html", "<script>alert(1)</script>Hello", "alert(1)Hello"},
		{"strip complex html", "<p><b>Bold</b></p>Text", "BoldText"},
		{"strip with entities", "Hello &amp; World", "Hello &amp; World"},
		{"no html", "Clean Text", "Clean Text"},
		{"empty", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SanitizePlainString(tt.input)
			if got != tt.expected {
				t.Errorf("SanitizePlainString(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

// TestValidateSafeURL 测试安全 URL 校验
func TestValidateSafeURL(t *testing.T) {
	tests := []struct {
		name string
		url  string
		want bool
	}{
		{"https url", "https://example.com", true},
		{"http url", "http://example.com", true},
		{"javascript scheme", "javascript:alert(1)", false},
		{"data scheme", "data:text/html,<script>alert(1)</script>", false},
		{"empty", "", true},
		{"no scheme", "ftp://example.com", false},
		{"whitespace", "  https://example.com  ", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ValidateSafeURL(tt.url)
			if got != tt.want {
				t.Errorf("ValidateSafeURL(%q) = %v, want %v", tt.url, got, tt.want)
			}
		})
	}
}

// TestIsValidURL 测试 URL 格式校验
func TestIsValidURL(t *testing.T) {
	tests := []struct {
		name string
		url  string
		want bool
	}{
		{"valid https", "https://example.com/path?q=1", true},
		{"valid http", "http://example.com", true},
		{"empty", "", false},
		{"no host", "https://", false},
		{"javascript", "javascript:alert(1)", false},
		{"data uri", "data:text/plain,hello", false},
		{"mailto", "mailto:test@example.com", false},
		{"invalid", "not-a-url", false},
		{"ipv4", "https://127.0.0.1:8080/api", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsValidURL(tt.url)
			if got != tt.want {
				t.Errorf("IsValidURL(%q) = %v, want %v", tt.url, got, tt.want)
			}
		})
	}
}

// TestSanitizeLinkURL 测试链接 URL 清洗
func TestSanitizeLinkURL(t *testing.T) {
	tests := []struct {
		name string
		url  string
		want string
	}{
		{"safe https", "https://example.com", "https://example.com"},
		{"safe http", "http://example.com", "http://example.com"},
		{"javascript", "javascript:alert(1)", ""},
		{"data", "data:text/html,<script>", ""},
		{"whitespace", "  https://example.com  ", "https://example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SanitizeLinkURL(tt.url)
			if got != tt.want {
				t.Errorf("SanitizeLinkURL(%q) = %q, want %q", tt.url, got, tt.want)
			}
		})
	}
}
