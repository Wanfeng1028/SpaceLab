package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL       string
	JWTSecret         string
	JWTExpiration     time.Duration
	ServerPort        int
	Environment       string
	MaxUploadSize     int64
	UploadPath        string
	AllowedOrigins    []string
	LiveCommentSiteID string // LiveComment 站点 ID
	// Resend 交易邮件配置
	ResendAPIKey string
	ResendFrom   string
	// MailerLite Newsletter 配置
	MailerLiteAPIKey  string
	MailerLiteGroupID string
	MailerLiteBaseURL string
	// reCAPTCHA v3 配置
	RecaptchaSecret  string
	RecaptchaSiteKey string
}

func LoadConfig() *Config {
	// 开发环境加载 .env 文件
	if os.Getenv("ENVIRONMENT") != "production" {
		_ = godotenv.Load()
	}

	expirationStr := os.Getenv("JWT_EXPIRATION")
	if expirationStr == "" {
		expirationStr = "24h"
	}

	duration, err := time.ParseDuration(expirationStr)
	if err != nil {
		duration = 24 * time.Hour
		log.Printf("Invalid JWT_EXPIRATION, using default: %s", duration)
	}

	portStr := os.Getenv("SERVER_PORT")
	port, err := strconv.Atoi(portStr)
	if err != nil || port == 0 {
		port = 8080
		log.Printf("Invalid SERVER_PORT, using default: %d", port)
	}

	maxSize, err := strconv.ParseInt(os.Getenv("MAX_UPLOAD_SIZE"), 10, 64)
	if err != nil || maxSize == 0 {
		maxSize = 10 * 1024 * 1024 // 10MB
		log.Printf("Invalid MAX_UPLOAD_SIZE, using default: %d bytes", maxSize)
	}

	uploadPath := os.Getenv("UPLOAD_PATH")
	if uploadPath == "" {
		uploadPath = "./uploads"
	}

	origins := []string{"http://localhost:4200", "http://localhost:8080"}
	if originsStr := os.Getenv("ALLOWED_ORIGINS"); originsStr != "" {
		origins = parseOrigins(originsStr)
	}

	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable is required and must be set to a secure random string in production")
	}

	return &Config{
		DatabaseURL:       getEnv("DATABASE_URL", ""),
		JWTSecret:         jwtSecret,
		JWTExpiration:     duration,
		ServerPort:        port,
		Environment:       getEnv("ENVIRONMENT", "development"),
		MaxUploadSize:     maxSize,
		UploadPath:        getEnv("UPLOAD_PATH", "./uploads"),
		AllowedOrigins:    origins,
		LiveCommentSiteID: getEnv("LIVECOMMENT_SITE_ID", ""),
		// Resend
		ResendAPIKey: getEnv("RESEND_API_KEY", ""),
		ResendFrom:   getEnv("RESEND_FROM", "noreply@tx.yourdomain.com"),
		// MailerLite
		MailerLiteAPIKey:  getEnv("MAILERLITE_API_KEY", ""),
		MailerLiteGroupID: getEnv("MAILERLITE_GROUP_ID", ""),
		MailerLiteBaseURL: getEnv("MAILERLITE_BASE_URL", "https://api.mailerlite.com/api/v2"),
		// reCAPTCHA
		RecaptchaSecret:  getEnv("RECAPTCHA_SECRET_KEY", ""),
		RecaptchaSiteKey: getEnv("RECAPTCHA_SITE_KEY", ""),
	}
}

func parseOrigins(s string) []string {
	result := make([]string, 0)
	for _, origin := range parseCommaSeparated(s) {
		origin = trimSpace(origin)
		if origin != "" {
			result = append(result, origin)
		}
	}
	if len(result) == 0 {
		return []string{"http://localhost:4200", "http://localhost:8080"}
	}
	return result
}

func parseCommaSeparated(s string) []string {
	result := make([]string, 0)
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == ',' {
			result = append(result, s[start:i])
			start = i + 1
		}
	}
	result = append(result, s[start:])
	return result
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && s[start] == ' ' || s[start] == '\t' {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}

// getEnv 从环境变量读取值，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
