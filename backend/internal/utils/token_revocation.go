package utils

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// TokenRevocationManager Token 撤销管理器
type TokenRevocationManager struct {
	rdb *redis.Client
	ctx context.Context
}

// NewTokenRevocationManager 创建 Token 撤销管理器
func NewTokenRevocationManager(rdb *redis.Client) *TokenRevocationManager {
	return &TokenRevocationManager{
		rdb: rdb,
		ctx: context.Background(),
	}
}

// RevokeToken 撤销 Token
func (m *TokenRevocationManager) RevokeToken(tokenString string, expiresIn time.Duration) error {
	if m.rdb == nil {
		return nil // Redis 未配置，跳过
	}

	// 计算过期时间
	expiry := expiresIn
	if expiry == 0 || expiry < time.Second {
		expiry = 24 * time.Hour
	}

	// 将 token 添加到黑名单
	key := fmt.Sprintf("token:blacklist:%s", tokenString)
	return m.rdb.Set(m.ctx, key, "revoked", expiry).Err()
}

// IsTokenRevoked 检查 Token 是否被撤销
func (m *TokenRevocationManager) IsTokenRevoked(tokenString string) (bool, error) {
	if m.rdb == nil {
		return false, nil // Redis 未配置，跳过检查
	}

	key := fmt.Sprintf("token:blacklist:%s", tokenString)
	exists, err := m.rdb.Exists(m.ctx, key).Result()
	if err != nil {
		return false, err
	}

	return exists > 0, nil
}

// RevokeUserTokens 撤销用户所有 Token（密码修改/账号安全时）
func (m *TokenRevocationManager) RevokeUserTokens(userID string) error {
	if m.rdb == nil {
		return nil
	}

	// 查找并删除该用户的所有 token
	pattern := fmt.Sprintf("token:blacklist:user:%s:*", userID)
	var keys []string

	// 分批删除，避免一次性删除太多
	cursor := uint64(0)
	for {
		k, newCursor, err := m.rdb.Scan(m.ctx, cursor, pattern, 100).Result()
		if err != nil {
			return err
		}
		keys = append(keys, k...)
		cursor = newCursor
		if cursor == 0 {
			break
		}
	}

	if len(keys) > 0 {
		return m.rdb.Del(m.ctx, keys...).Err()
	}

	return nil
}

// AddUserTokenToBlacklist 将用户所有 token 加入黑名单
func (m *TokenRevocationManager) AddUserTokenToBlacklist(tokenString, userID string, expiresIn time.Duration) error {
	if m.rdb == nil {
		return nil
	}

	// 撤销该 token
	if err := m.RevokeToken(tokenString, expiresIn); err != nil {
		return err
	}

	// 记录用户 token
	key := fmt.Sprintf("token:user:%s", userID)
	return m.rdb.SAdd(m.ctx, key, tokenString).Err()
}

// ClearUserTokens 清除用户的 token 记录
func (m *TokenRevocationManager) ClearUserTokens(userID string) error {
	if m.rdb == nil {
		return nil
	}

	key := fmt.Sprintf("token:user:%s", userID)
	return m.rdb.Del(m.ctx, key).Err()
}

// ParseAndCheckToken 解析并检查 Token
func ParseAndCheckToken(rdb *redis.Client, tokenString string) (bool, error) {
	if tokenString == "" {
		return false, nil
	}

	// 清理 Bearer 前缀
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	if rdb == nil {
		return false, nil
	}

	return NewTokenRevocationManager(rdb).IsTokenRevoked(tokenString)
}
