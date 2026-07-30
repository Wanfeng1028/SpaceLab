package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// ============================================================
// CacheDriver 缓存驱动接口
// ============================================================

// CacheDriver 缓存驱动抽象接口
type CacheDriver interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, expiration time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
	// Keys 返回匹配 pattern 的 key 列表（内存模式做前缀匹配）
	Keys(ctx context.Context, pattern string) ([]string, error)
}

// ============================================================
// RedisCacheDriver — 封装现有 Redis 逻辑
// ============================================================

// RedisCacheDriver Redis 缓存驱动
type RedisCacheDriver struct {
	client *redis.Client
}

// NewRedisCacheDriver 创建 Redis 缓存驱动
func NewRedisCacheDriver(client *redis.Client) *RedisCacheDriver {
	return &RedisCacheDriver{client: client}
}

func (d *RedisCacheDriver) Get(ctx context.Context, key string) ([]byte, error) {
	return d.client.Get(ctx, key).Bytes()
}

func (d *RedisCacheDriver) Set(ctx context.Context, key string, value []byte, expiration time.Duration) error {
	return d.client.Set(ctx, key, value, expiration).Err()
}

func (d *RedisCacheDriver) Delete(ctx context.Context, key string) error {
	return d.client.Del(ctx, key).Err()
}

func (d *RedisCacheDriver) Exists(ctx context.Context, key string) (bool, error) {
	result, err := d.client.Exists(ctx, key).Result()
	return result > 0, err
}

func (d *RedisCacheDriver) Keys(ctx context.Context, pattern string) ([]string, error) {
	return d.client.Keys(ctx, pattern).Result()
}

// ============================================================
// MemoryCacheDriver — sync.Map + TTL 过期清理
// ============================================================

type memoryEntry struct {
	data      []byte
	expiresAt time.Time // zero value = 永不过期
}

// MemoryCacheDriver 内存缓存驱动
type MemoryCacheDriver struct {
	store sync.Map
}

// NewMemoryCacheDriver 创建内存缓存驱动并启动清理 goroutine
func NewMemoryCacheDriver() *MemoryCacheDriver {
	d := &MemoryCacheDriver{}
	go d.cleanupLoop()
	return d
}

func (d *MemoryCacheDriver) Get(_ context.Context, key string) ([]byte, error) {
	val, ok := d.store.Load(key)
	if !ok {
		return nil, redis.Nil
	}
	entry := val.(*memoryEntry)
	if !entry.expiresAt.IsZero() && time.Now().After(entry.expiresAt) {
		d.store.Delete(key)
		return nil, redis.Nil
	}
	// 返回副本防止外部修改
	cp := make([]byte, len(entry.data))
	copy(cp, entry.data)
	return cp, nil
}

func (d *MemoryCacheDriver) Set(_ context.Context, key string, value []byte, expiration time.Duration) error {
	cp := make([]byte, len(value))
	copy(cp, value)
	entry := &memoryEntry{data: cp}
	if expiration > 0 {
		entry.expiresAt = time.Now().Add(expiration)
	}
	d.store.Store(key, entry)
	return nil
}

func (d *MemoryCacheDriver) Delete(_ context.Context, key string) error {
	d.store.Delete(key)
	return nil
}

func (d *MemoryCacheDriver) Exists(_ context.Context, key string) (bool, error) {
	val, ok := d.store.Load(key)
	if !ok {
		return false, nil
	}
	entry := val.(*memoryEntry)
	if !entry.expiresAt.IsZero() && time.Now().After(entry.expiresAt) {
		d.store.Delete(key)
		return false, nil
	}
	return true, nil
}

func (d *MemoryCacheDriver) Keys(_ context.Context, pattern string) ([]string, error) {
	// 简单前缀匹配：将 Redis 通配符 "*" 转为前缀
	prefix := ""
	for i, c := range pattern {
		if c == '*' {
			break
		}
		if i == len(pattern)-1 {
			prefix = pattern
		}
	}
	// 去掉尾部的 *
	if len(prefix) > 0 && prefix[len(prefix)-1] == '*' {
		prefix = prefix[:len(prefix)-1]
	}

	var keys []string
	d.store.Range(func(key, _ interface{}) bool {
		k := key.(string)
		if prefix == "" || len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			keys = append(keys, k)
		}
		return true
	})
	return keys, nil
}

func (d *MemoryCacheDriver) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		d.store.Range(func(key, val interface{}) bool {
			entry := val.(*memoryEntry)
			if !entry.expiresAt.IsZero() && now.After(entry.expiresAt) {
				d.store.Delete(key)
			}
			return true
		})
	}
}

// ============================================================
// 全局缓存驱动管理
// ============================================================

var (
	// ActiveCacheDriver 当前活跃的缓存驱动
	ActiveCacheDriver CacheDriver
)

// InitCacheDriver 初始化缓存驱动。
// 优先使用 Redis（如果 cacheDriver=="redis" 且 rdb 非 nil），否则降级为内存。
func InitCacheDriver(cacheDriver string, rdb *redis.Client) {
	if cacheDriver == "redis" && rdb != nil {
		ActiveCacheDriver = NewRedisCacheDriver(rdb)
		Logger.Info("Cache driver: Redis")
	} else {
		ActiveCacheDriver = NewMemoryCacheDriver()
		if cacheDriver == "redis" && rdb == nil {
			Logger.Warn("Redis unavailable, cache driver degraded to memory")
		} else {
			Logger.Info("Cache driver: memory")
		}
	}
}

// GetCacheDriver 获取当前活跃的缓存驱动
func GetCacheDriver() CacheDriver {
	if ActiveCacheDriver == nil {
		// 延迟初始化：默认内存
		InitCacheDriver("memory", nil)
	}
	return ActiveCacheDriver
}

// ============================================================
// 兼容层：保留原有 API，内部委托给 CacheDriver
// ============================================================

var RedisClient *redis.Client

// GetRedisClient 获取 Redis 客户端实例（可能为 nil）
func GetRedisClient() *redis.Client {
	return RedisClient
}

// InitRedis 初始化 Redis 连接
func InitRedis(addr, password string, db int) error {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := RedisClient.Ping(ctx).Result()
	if err != nil {
		RedisClient = nil
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return nil
}

// CacheSet 设置缓存
func CacheSet(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	driver := GetCacheDriver()
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return driver.Set(ctx, key, jsonBytes, expiration)
}

// CacheGet 获取缓存
func CacheGet(ctx context.Context, key string, dest interface{}) error {
	driver := GetCacheDriver()
	val, err := driver.Get(ctx, key)
	if err != nil {
		return err
	}
	return json.Unmarshal(val, dest)
}

// CacheDelete 删除缓存
func CacheDelete(ctx context.Context, key string) error {
	return GetCacheDriver().Delete(ctx, key)
}

// CacheDeletePattern 批量删除缓存
func CacheDeletePattern(ctx context.Context, pattern string) error {
	driver := GetCacheDriver()
	keys, err := driver.Keys(ctx, pattern)
	if err != nil {
		return err
	}
	for _, key := range keys {
		_ = driver.Delete(ctx, key)
	}
	return nil
}

// CacheExists 检查缓存是否存在
func CacheExists(ctx context.Context, key string) (bool, error) {
	return GetCacheDriver().Exists(ctx, key)
}

// CacheSetJSON 设置 JSON 缓存
func CacheSetJSON(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return CacheSet(ctx, key, value, expiration)
}

// CacheGetJSON 获取 JSON 缓存
func CacheGetJSON(ctx context.Context, key string, dest interface{}) error {
	return CacheGet(ctx, key, dest)
}

// 缓存 Key 常量
const (
	CacheKeyPostList   = "posts:list:%d:%d" // page:pageSize
	CacheKeyPostDetail = "posts:detail:%s"  // slug
	CacheKeyPostCount  = "posts:count"
	CacheKeyAnalytics  = "analytics:summary"
	CacheKeyTopPosts   = "analytics:top-posts"
)

// 缓存过期时间
const (
	CacheExpirationShort  = 5 * time.Minute
	CacheExpirationMedium = 30 * time.Minute
	CacheExpirationLong   = 2 * time.Hour
	CacheExpirationDay    = 24 * time.Hour
)
