package utils

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Logger *zap.Logger
var SugarLogger *zap.SugaredLogger

// InitLogger 初始化日志系统
func InitLogger() {
	// 配置日志级别
	logLevel := zapcore.InfoLevel
	if os.Getenv("ENVIRONMENT") == "development" {
		logLevel = zapcore.DebugLevel
	}

	// 配置编码器
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "timestamp",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		MessageKey:     "message",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	// 创建核心
	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		zapcore.AddSync(os.Stdout),
		logLevel,
	)

	// 创建 Logger
	Logger = zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
	SugarLogger = Logger.Sugar()
}

// WithContext 带上下文的日志
func WithContext(fields ...zap.Field) *zap.Logger {
	return Logger.With(fields...)
}

// LogRequest 记录请求日志
func LogRequest(method, path string, statusCode int, duration time.Duration) {
	Logger.Info("Request processed",
		zap.String("method", method),
		zap.String("path", path),
		zap.Int("status_code", statusCode),
		zap.Duration("duration", duration),
	)
}

// LogError 记录错误日志
func LogError(message string, err error, fields ...zap.Field) {
	Logger.Error(message,
		zap.Error(err),
		zap.Time("timestamp", time.Now()),
	)
}

// LogDatabase 记录数据库操作
func LogDatabase(operation, table string, duration time.Duration, err error) {
	if err != nil {
		Logger.Error("Database operation failed",
			zap.String("operation", operation),
			zap.String("table", table),
			zap.Duration("duration", duration),
			zap.Error(err),
		)
	} else {
		Logger.Debug("Database operation",
			zap.String("operation", operation),
			zap.String("table", table),
			zap.Duration("duration", duration),
		)
	}
}

// LogAuth 记录认证日志
func LogAuth(event, userID string, success bool) {
	Logger.Info("Auth event",
		zap.String("event", event),
		zap.String("user_id", userID),
		zap.Bool("success", success),
		zap.Time("timestamp", time.Now()),
	)
}

// LogAnalytics 记录分析日志
func LogAnalytics(eventType, pagePath string) {
	Logger.Info("Analytics event",
		zap.String("event_type", eventType),
		zap.String("page_path", pagePath),
		zap.Time("timestamp", time.Now()),
	)
}
