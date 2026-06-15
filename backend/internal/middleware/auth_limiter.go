package middleware

import (
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// 包级单例限流器
var (
	globalLimiter     *authRateLimiter
	globalLimiterOnce sync.Once
)

// getLimiter 获取全局限流器单例
func getLimiter() *authRateLimiter {
	globalLimiterOnce.Do(func() {
		globalLimiter = newAuthRateLimiter()
		// 定期清理过期记录
		go func() {
			ticker := time.NewTicker(1 * time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				globalLimiter.cleanupExpired()
			}
		}()
	})
	return globalLimiter
}

// authAttempt 认证尝试记录
type authAttempt struct {
	failures   int
	lastFailed time.Time
	locked     bool
	lockUntil  time.Time
}

// authRateLimiter 认证限流器
type authRateLimiter struct {
	// IP 级别的限流
	ipAttempts map[string]*authAttempt
	ipMu       sync.RWMutex

	// 账号级别的限流（防暴力破解）
	accountAttempts map[string]*authAttempt
	accountMu       sync.RWMutex

	// 配置
	ipMaxAttempts       int           // IP 最大尝试次数
	ipWindow            time.Duration // IP 统计窗口
	ipLockDuration      time.Duration // IP 锁定时间
	accountMaxAttempts  int           // 账号最大尝试次数
	accountWindow       time.Duration // 账号统计窗口
	accountLockDuration time.Duration // 账号锁定时间
}

// newAuthRateLimiter 创建认证限流器
func newAuthRateLimiter() *authRateLimiter {
	env := getEnv("ENVIRONMENT", "development")

	ipMax := 10
	ipLock := 10 * time.Minute
	acctMax := 5
	acctLock := 30 * time.Minute

	// 开发环境放宽限流
	if env == "development" {
		ipMax = 100
		ipLock = 1 * time.Minute
		acctMax = 50
		acctLock = 1 * time.Minute
	}

	return &authRateLimiter{
		ipAttempts:          make(map[string]*authAttempt),
		accountAttempts:     make(map[string]*authAttempt),
		ipMaxAttempts:       ipMax,
		ipWindow:            5 * time.Minute,
		ipLockDuration:      ipLock,
		accountMaxAttempts:  acctMax,
		accountWindow:       15 * time.Minute,
		accountLockDuration: acctLock,
	}
}

// getEnv 读取环境变量
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// cleanupExpired 清理过期记录
func (l *authRateLimiter) cleanupExpired() {
	now := time.Now()

	l.ipMu.Lock()
	defer l.ipMu.Unlock()

	for ip, attempt := range l.ipAttempts {
		if now.Sub(attempt.lastFailed) > l.ipWindow {
			delete(l.ipAttempts, ip)
		}
	}
}

// checkIP 检查 IP 是否被限制
func (l *authRateLimiter) checkIP(ip string) (allowed bool, retryAfter time.Duration) {
	l.ipMu.Lock()
	defer l.ipMu.Unlock()

	now := time.Now()
	attempt, exists := l.ipAttempts[ip]

	if !exists {
		l.ipAttempts[ip] = &authAttempt{
			failures:   1,
			lastFailed: now,
		}
		return true, 0
	}

	// 检查是否过期
	if now.Sub(attempt.lastFailed) > l.ipWindow {
		attempt.failures = 1
		attempt.lastFailed = now
		attempt.locked = false
		return true, 0
	}

	// 检查是否锁定
	if attempt.locked && now.Before(attempt.lockUntil) {
		return false, attempt.lockUntil.Sub(now)
	}

	// 解锁过期
	if attempt.locked && now.After(attempt.lockUntil) {
		attempt.locked = false
	}

	attempt.failures++
	attempt.lastFailed = now

	if attempt.failures >= l.ipMaxAttempts {
		attempt.locked = true
		attempt.lockUntil = now.Add(l.ipLockDuration)
		return false, l.ipLockDuration
	}

	return true, 0
}

// checkAccount 检查账号是否被限制
func (l *authRateLimiter) checkAccount(account string) (allowed bool, retryAfter time.Duration) {
	l.accountMu.Lock()
	defer l.accountMu.Unlock()

	now := time.Now()
	attempt, exists := l.accountAttempts[account]

	if !exists {
		l.accountAttempts[account] = &authAttempt{
			failures:   1,
			lastFailed: now,
		}
		return true, 0
	}

	// 检查是否过期
	if now.Sub(attempt.lastFailed) > l.accountWindow {
		attempt.failures = 1
		attempt.lastFailed = now
		attempt.locked = false
		return true, 0
	}

	// 检查是否锁定
	if attempt.locked && now.Before(attempt.lockUntil) {
		return false, attempt.lockUntil.Sub(now)
	}

	// 解锁过期
	if attempt.locked && now.After(attempt.lockUntil) {
		attempt.locked = false
	}

	attempt.failures++
	attempt.lastFailed = now

	if attempt.failures >= l.accountMaxAttempts {
		attempt.locked = true
		attempt.lockUntil = now.Add(l.accountLockDuration)
		return false, l.accountLockDuration
	}

	return true, 0
}

// recordSuccess 记录成功尝试（清除失败记录）
func (l *authRateLimiter) recordSuccess(ip, account string) {
	l.ipMu.Lock()
	if attempt, exists := l.ipAttempts[ip]; exists {
		attempt.failures = 0
		attempt.locked = false
	}
	l.ipMu.Unlock()

	l.accountMu.Lock()
	if attempt, exists := l.accountAttempts[account]; exists {
		attempt.failures = 0
		attempt.locked = false
	}
	l.accountMu.Unlock()
}

// authLimiter 认证接口限流中间件
func AuthLimiter() gin.HandlerFunc {
	limiter := getLimiter()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		allowed, retryAfter := limiter.checkIP(ip)

		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Too many authentication attempts, please try again later",
				"retry_after": int(retryAfter.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// authFailureLimiter 认证失败限流中间件（需要在 Handler 中调用）
func AuthFailureLimiter() gin.HandlerFunc {
	limiter := getLimiter()

	return func(c *gin.Context) {
		// 只处理 POST 请求
		if c.Request.Method != "POST" {
			c.Next()
			return
		}

		ip := c.ClientIP()
		allowed, retryAfter := limiter.checkIP(ip)

		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Too many failed attempts, please try again later",
				"retry_after": int(retryAfter.Seconds()),
			})
			c.Abort()
			return
		}

		// 获取账号标识（邮箱或用户名）
		var account string
		if email, exists := c.Get("login_email"); exists {
			account = email.(string)
		} else {
			account = ip // 如果没有邮箱，使用 IP
		}

		// 检查账号级别限制
		accountAllowed, accountRetryAfter := limiter.checkAccount(account)
		if !accountAllowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Account temporarily locked due to too many failed attempts",
				"retry_after": int(accountRetryAfter.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()

		// 检查响应状态，如果是失败则记录
		if c.Writer.Status() >= 400 {
			limiter.recordFailure(ip, account)
		} else {
			limiter.recordSuccess(ip, account)
		}
	}
}

// recordFailure 记录失败尝试
func (l *authRateLimiter) recordFailure(ip, account string) {
	l.ipMu.Lock()
	if attempt, exists := l.ipAttempts[ip]; exists {
		attempt.failures++
		attempt.lastFailed = time.Now()
		if attempt.failures >= l.ipMaxAttempts {
			attempt.locked = true
			attempt.lockUntil = time.Now().Add(l.ipLockDuration)
		}
	}
	l.ipMu.Unlock()

	l.accountMu.Lock()
	if attempt, exists := l.accountAttempts[account]; exists {
		attempt.failures++
		attempt.lastFailed = time.Now()
		if attempt.failures >= l.accountMaxAttempts {
			attempt.locked = true
			attempt.lockUntil = time.Now().Add(l.accountLockDuration)
		}
	}
	l.accountMu.Unlock()
}
