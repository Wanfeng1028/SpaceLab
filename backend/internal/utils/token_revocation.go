package utils

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"time"
)

// TokenRevocationManager Token 撤销管理器（支持 Redis / 内存双模式）
type TokenRevocationManager struct {
	cache    CacheDriver
	ctx      context.Context
	useRedis bool

	// 内存降级时的辅助存储（stamp / user token 集合）
	memStamps    sync.Map // userID -> stampEntry
	memUserTokens sync.Map // userID -> map[string]time.Time (token -> expiresAt)
}

type stampEntry struct {
	stamp string
}

// NewTokenRevocationManager 创建 Token 撤销管理器
func NewTokenRevocationManager(cache CacheDriver, useRedis bool) *TokenRevocationManager {
	return &TokenRevocationManager{
		cache:    cache,
		ctx:      context.Background(),
		useRedis: useRedis,
	}
}

// RevokeToken 撤销 Token
func (m *TokenRevocationManager) RevokeToken(tokenString string, expiresIn time.Duration) error {
	// 计算过期时间
	expiry := expiresIn
	if expiry == 0 || expiry < time.Second {
		expiry = 24 * time.Hour
	}

	// 将 token 添加到黑名单
	key := fmt.Sprintf("token:blacklist:%s", tokenString)
	return m.cache.Set(m.ctx, key, []byte("revoked"), expiry)
}

// IsTokenRevoked 检查 Token 是否被撤销
func (m *TokenRevocationManager) IsTokenRevoked(tokenString string) (bool, error) {
	key := fmt.Sprintf("token:blacklist:%s", tokenString)
	return m.cache.Exists(m.ctx, key)
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
func (m *TokenRevocationManager) GetOrCreateStamp(userID string) string {
	key := stampKeyPrefix + userID

	if m.useRedis || m.cache != nil {
		val, err := m.cache.Get(m.ctx, key)
		if err == nil && len(val) > 0 {
			return string(val)
		}
		newStamp := generateRandomHex(16)
		_ = m.cache.Set(m.ctx, key, []byte(newStamp), 0)
		return newStamp
	}

	// 内存降级
	if v, ok := m.memStamps.Load(userID); ok {
		return v.(*stampEntry).stamp
	}
	newStamp := generateRandomHex(16)
	m.memStamps.Store(userID, &stampEntry{stamp: newStamp})
	return newStamp
}

// RotateStamp 轮换用户的安全 stamp（改密码/重置后调用），使旧 token 失效
func (m *TokenRevocationManager) RotateStamp(userID string) string {
	key := stampKeyPrefix + userID
	newStamp := generateRandomHex(16)

	if m.useRedis || m.cache != nil {
		_ = m.cache.Set(m.ctx, key, []byte(newStamp), 0)
		return newStamp
	}

	// 内存降级
	m.memStamps.Store(userID, &stampEntry{stamp: newStamp})
	return newStamp
}

// IsStampRevoked 检查给定 stamp 是否已被轮换（即 token 是否失效）
func (m *TokenRevocationManager) IsStampRevoked(userID, stamp string) (bool, error) {
	if stamp == "" {
		// 未启用 stamp 跟踪（老 token），视为有效，保持向后兼容
		return false, nil
	}
	key := stampKeyPrefix + userID

	if m.useRedis || m.cache != nil {
		val, err := m.cache.Get(m.ctx, key)
		if err != nil {
			// stamp 尚未初始化（老用户），不撤销
			return false, nil
		}
		return string(val) != stamp, nil
	}

	// 内存降级
	if v, ok := m.memStamps.Load(userID); ok {
		return v.(*stampEntry).stamp != stamp, nil
	}
	// stamp 尚未初始化，不撤销
	return false, nil
}

// RevokeUserTokens 撤销用户所有已记录的 Token
func (m *TokenRevocationManager) RevokeUserTokens(userID string) error {
	if m.useRedis {
		// Redis 模式：使用 SMembers 获取用户 token 集合
		key := fmt.Sprintf("token:user:%s", userID)
		val, err := m.cache.Get(m.ctx, key)
		if err == nil && len(val) > 0 {
			// 简单实现：遍历已知 token 并撤销
			// 注意：完整实现需要 Redis Set 操作，这里通过 CacheDriver 的 Keys 做兜底
			pattern := fmt.Sprintf("token:blacklist:user:%s:*", userID)
			keys, _ := m.cache.Keys(m.ctx, pattern)
			for _, k := range keys {
				_ = m.cache.Delete(m.ctx, k)
			}
		}
		_ = m.cache.Delete(m.ctx, key)
		return nil
	}

	// 内存降级：清理用户 token 记录
	m.memUserTokens.Delete(userID)
	return nil
}

// AddUserTokenToBlacklist 将用户 token 加入黑名单
func (m *TokenRevocationManager) AddUserTokenToBlacklist(tokenString, userID string, expiresIn time.Duration) error {
	// 撤销该 token
	if err := m.RevokeToken(tokenString, expiresIn); err != nil {
		return err
	}

	if m.useRedis {
		// Redis 模式：记录到 user token 集合（简化为 key-value）
		key := fmt.Sprintf("token:user:%s:%s", userID, tokenString)
		return m.cache.Set(m.ctx, key, []byte("1"), expiresIn)
	}

	// 内存降级
	tokens, _ := m.memUserTokens.LoadOrStore(userID, make(map[string]time.Time))
	tokenMap := tokens.(map[string]time.Time)
	tokenMap[tokenString] = time.Now().Add(expiresIn)
	return nil
}

// ClearUserTokens 清除用户的 token 记录
func (m *TokenRevocationManager) ClearUserTokens(userID string) error {
	key := fmt.Sprintf("token:user:%s", userID)
	_ = m.cache.Delete(m.ctx, key)

	if !m.useRedis {
		m.memUserTokens.Delete(userID)
	}
	return nil
}

// ParseAndCheckToken 解析并检查 Token
func ParseAndCheckToken(tokenString string) (bool, error) {
	if tokenString == "" {
		return false, nil
	}

	// 清理 Bearer 前缀
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	if TokenRevocationMgr == nil {
		return false, nil
	}

	return TokenRevocationMgr.IsTokenRevoked(tokenString)
}

// TokenRevocationMgr 全局 Token 撤销管理器实例
var TokenRevocationMgr *TokenRevocationManager

// InitTokenRevocation 初始化全局 Token 撤销管理器。
// 如果 cache 非 nil 则使用缓存驱动，否则使用内存降级。
func InitTokenRevocation(cache CacheDriver, useRedis bool) {
	TokenRevocationMgr = NewTokenRevocationManager(cache, useRedis)
}
