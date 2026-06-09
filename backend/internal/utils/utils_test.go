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
