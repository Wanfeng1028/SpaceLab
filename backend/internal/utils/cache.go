package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

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
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return nil
}

// CacheSet 设置缓存
func CacheSet(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if RedisClient == nil {
		return nil // Redis 未配置时跳过
	}

	json, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return RedisClient.Set(ctx, key, json, expiration).Err()
}

// CacheGet 获取缓存
func CacheGet(ctx context.Context, key string, dest interface{}) error {
	if RedisClient == nil {
		return redis.Nil // Redis 未配置时返回未找到
	}

	val, err := RedisClient.Get(ctx, key).Bytes()
	if err != nil {
		return err
	}

	return json.Unmarshal(val, dest)
}

// CacheDelete 删除缓存
func CacheDelete(ctx context.Context, key string) error {
	if RedisClient == nil {
		return nil
	}

	return RedisClient.Del(ctx, key).Err()
}

// CacheDeletePattern 批量删除缓存
func CacheDeletePattern(ctx context.Context, pattern string) error {
	if RedisClient == nil {
		return nil
	}

	keys, err := RedisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return RedisClient.Del(ctx, keys...).Err()
	}

	return nil
}

// CacheExists 检查缓存是否存在
func CacheExists(ctx context.Context, key string) (bool, error) {
	if RedisClient == nil {
		return false, nil
	}

	result, err := RedisClient.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}

	return result > 0, nil
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
	CacheKeyPostList   = "posts:list:%d:%d"     // page:pageSize
	CacheKeyPostDetail = "posts:detail:%s"       // slug
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
