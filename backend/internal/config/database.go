package config

import (
	"fmt"
	"log"
	"time"

	"github.com/spacelab/backend/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(cfg *Config) error {
	// 设置全局 DB 驱动标识，供 JSONArray 等自定义类型使用
	model.ActiveDBDriver = cfg.DBDriver

	var err error

	switch cfg.DBDriver {
	case "sqlite":
		dsn := cfg.DatabaseURL
		if dsn == "" {
			dsn = "spacelab.db"
		}
		DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err != nil {
			return fmt.Errorf("failed to open sqlite database: %w", err)
		}
		// SQLite 优化：WAL 模式提升并发性能
		DB.Exec("PRAGMA journal_mode=WAL")
		DB.Exec("PRAGMA synchronous=NORMAL")
		DB.Exec("PRAGMA busy_timeout=5000")
		// SQLite 单连接限制
		sqlDB, err := DB.DB()
		if err != nil {
			return fmt.Errorf("failed to get sqlite db instance: %w", err)
		}
		sqlDB.SetMaxOpenConns(1)
		sqlDB.SetMaxIdleConns(1)
		sqlDB.SetConnMaxLifetime(0) // SQLite 不过期
		log.Println("SQLite database connection established (WAL mode)")

	default: // "postgres"
		if cfg.DatabaseURL == "" {
			return fmt.Errorf("DATABASE_URL environment variable is required for postgres driver")
		}
		DB, err = gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err != nil {
			return fmt.Errorf("failed to connect to postgres database: %w", err)
		}
		// PostgreSQL 连接池收紧，适配 2C2G
		sqlDB, err := DB.DB()
		if err != nil {
			return fmt.Errorf("failed to get postgres db instance: %w", err)
		}
		sqlDB.SetMaxOpenConns(10)
		sqlDB.SetMaxIdleConns(2)
		sqlDB.SetConnMaxLifetime(5 * time.Minute)
		log.Println("PostgreSQL database connection established successfully")
	}

	return nil
}

func GetDB() *gorm.DB {
	return DB
}
