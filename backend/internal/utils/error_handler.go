package utils

import (
	"strings"
)

// SafeErrorMessage 返回对用户安全的错误信息，生产环境不暴露内部细节
func SafeErrorMessage(err error, fallback string) string {
	if err == nil {
		return fallback
	}

	errMsg := err.Error()

	// 始终隐藏的内部错误关键词
	unsafePatterns := []string{
		"sql:", "SQL", "gorm:", "database",
		"connection refused", "dial tcp",
		"redis", "no such host",
		"tls:", "certificate",
		"x509:", "crypto",
		"bcrypt", "hash", "argon2",
		"jwt:", "token", "signature",
		"secret", "password",
		"stack", "goroutine",
		"panic", "runtime error",
		"/app/", "/usr/", "/home/",
		"no rows in result set",
		"cannot connect", "timeout",
		"dns", "lookup",
	}

	lower := strings.ToLower(errMsg)
	for _, pattern := range unsafePatterns {
		if strings.Contains(lower, strings.ToLower(pattern)) {
			return fallback
		}
	}

	// 如果错误信息太长，可能包含堆栈
	if len(errMsg) > 200 {
		return fallback
	}

	return errMsg
}

// IsProduction 判断是否为生产环境
func IsProduction() bool {
	env := GetEnv("ENVIRONMENT", "development")
	return env == "production" || env == "prod"
}
