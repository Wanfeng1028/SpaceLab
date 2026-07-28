package utils

import (
	"context"
	"crypto/rand"
	"encoding/hex"
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

const stampKeyPrefix = "token:stamp:"

// generateRandomHex 生成随机十六进制字符串（用于安全 stamp）
func generateRandomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// GetOrCreateStamp 获取（或创建）用户的安全 stamp。
// stamp 内嵌在 JWT 中；修改密码/重置时通过 RotateStamp 轮换，使所有旧 token 立即失效。
func (m *TokenRevocationManager) GetOrCreateStamp(userID string) string {
	if m.rdb == nil {
		return ""
	}
	key := stampKeyPrefix + userID
	if val, err := m.rdb.Get(m.ctx, key).Result(); err == nil && val != "" {
		return val
	}
	newStamp := generateRandomHex(16)
	_ = m.rdb.Set(m.ctx, key, newStamp, 0).Err()
	return newStamp
}

// RotateStamp 轮换用户的安全 stamp（改密码/重置后调用），使旧 token 失效
func (m *TokenRevocationManager) RotateStamp(userID string) string {
	if m.rdb == nil {
		return ""
	}
	key := stampKeyPrefix + userID
	newStamp := generateRandomHex(16)
	_ = m.rdb.Set(m.ctx, key, newStamp, 0).Err()
	return newStamp
}

// IsStampRevoked 检查给定 stamp 是否已被轮换（即 token 是否失效）
func (m *TokenRevocationManager) IsStampRevoked(userID, stamp string) (bool, error) {
	if m.rdb == nil {
		return false, nil
	}
	if stamp == "" {
		// 未启用 stamp 跟踪（Redis 缺失或老 token），视为有效，保持向后兼容
		return false, nil
	}
	key := stampKeyPrefix + userID
	val, err := m.rdb.Get(m.ctx, key).Result()
	if err != nil {
		// stamp 尚未初始化（老用户），不撤销
		return false, nil
	}
	return val != stamp, nil
}

// RevokeUserTokens 撤销用户所有已记录的 Token（密码修改/账号安全时兜底使用）
func (m *TokenRevocationManager) RevokeUserTokens(userID string) error {
	if m.rdb == nil {
		return nil
	}

	// 撤销 logout 时记录到 token:user:{id} 集合中的 token
	key := fmt.Sprintf("token:user:%s", userID)
	if members, err := m.rdb.SMembers(m.ctx, key).Result(); err == nil {
		for _, t := range members {
			_ = m.RevokeToken(t, 24*time.Hour)
		}
		_ = m.rdb.Del(m.ctx, key).Err()
	}

	// 兜底：清理按旧 pattern 存储的黑名单 key
	var keys []string
	cursor := uint64(0)
	for {
		k, newCursor, e := m.rdb.Scan(m.ctx, cursor, fmt.Sprintf("token:blacklist:user:%s:*", userID), 100).Result()
		if e != nil {
			break
		}
		keys = append(keys, k...)
		cursor = newCursor
		if cursor == 0 {
			break
		}
	}
	if len(keys) > 0 {
		_ = m.rdb.Del(m.ctx, keys...).Err()
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

// TokenRevocationMgr 全局 Token 撤销管理器实例
var TokenRevocationMgr *TokenRevocationManager

// InitTokenRevocation 初始化全局 Token 撤销管理器
func InitTokenRevocation(rdb *redis.Client) {
	if rdb != nil {
		TokenRevocationMgr = NewTokenRevocationManager(rdb)
	}
}
