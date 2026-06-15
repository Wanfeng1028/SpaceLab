package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/model"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// 设置默认环境变量（脚本独立运行，不依赖 .env 文件）
	os.Setenv("JWT_SECRET", "dev-secret-key-for-local-use-only-change-in-production")
	os.Setenv("SERVER_PORT", "8080")
	os.Setenv("MAX_UPLOAD_SIZE", "10485760")
	os.Setenv("DATABASE_URL", "postgres://spacelab:spacelab_password@localhost:5432/spacelab?sslmode=disable")

	// 加载配置
	cfg := config.LoadConfig()

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	// 连接数据库
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 密码哈希
	password := "Admin@123456"
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// 创建管理员用户
	adminUser := model.User{
		ID:           uuid.New(),
		Email:        "admin@spacelab.dev",
		PasswordHash: string(passwordHash),
		Username:     "admin",
		Role:         "admin",
		Status:       "active",
		CreatedAt:    time.Now(),
	}

	if err := db.Create(&adminUser).Error; err != nil {
		log.Fatalf("Failed to create admin user: %v", err)
	}

	fmt.Println("========================================")
	fmt.Println("  管理员账号已创建！")
	fmt.Println("========================================")
	fmt.Printf("  邮箱: %s\n", adminUser.Email)
	fmt.Printf("  密码: %s\n", password)
	fmt.Println("========================================")
	fmt.Println("  登录地址: http://localhost:4200/login")
	fmt.Println("========================================")

	_ = db
}
