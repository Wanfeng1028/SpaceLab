package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/model"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const testPassword = "password123"

// TestDB 测试数据库
var TestDB *gorm.DB

// SetupTestDB 初始化测试数据库
func SetupTestDB(t *testing.T) {
	var err error
	TestDB, err = gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// 自动迁移
	TestDB.AutoMigrate(&model.User{}, &model.Post{}, &model.Comment{}, &model.MediaAsset{}, &model.AnalyticsEvent{}, &model.Project{})
}

// TestAuthService_Register 测试用户注册
func TestAuthService_Register(t *testing.T) {
	SetupTestDB(t)

	cfg := &config.Config{
		JWTSecret:     "test-secret",
		JWTExpiration: 24 * time.Hour,
	}

	service := NewAuthService(TestDB, cfg, nil)

	// 测试注册
	response, err := service.Register("test@example.com", testPassword, "testuser")
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	if response.User.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%s'", response.User.Email)
	}

	if response.User.Username != "testuser" {
		t.Errorf("Expected username 'testuser', got '%s'", response.User.Username)
	}

	if response.Token == "" {
		t.Error("Expected token, got empty string")
	}
}

// TestAuthService_Login 测试用户登录
func TestAuthService_Login(t *testing.T) {
	SetupTestDB(t)

	cfg := &config.Config{
		JWTSecret:     "test-secret",
		JWTExpiration: 24 * time.Hour,
	}

	service := NewAuthService(TestDB, cfg, nil)

	// 先注册
	_, err := service.Register("test@example.com", testPassword, "testuser")
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	// 测试登录
	response, err := service.Login("test@example.com", testPassword)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}

	if response.User.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%s'", response.User.Email)
	}

	// 测试错误密码
	_, err = service.Login("test@example.com", "wrongpassword")
	if err == nil {
		t.Error("Expected error for wrong password, got nil")
	}
}

// TestAuthService_GetUserByID 测试获取用户
func TestAuthService_GetUserByID(t *testing.T) {
	SetupTestDB(t)

	cfg := &config.Config{
		JWTSecret:     "test-secret",
		JWTExpiration: 24 * time.Hour,
	}

	service := NewAuthService(TestDB, cfg, nil)

	// 注册用户
	response, err := service.Register("test@example.com", testPassword, "testuser")
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	// 获取用户
	user, err := service.GetUserByID(response.User.ID)
	if err != nil {
		t.Fatalf("GetUserByID failed: %v", err)
	}

	if user.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%s'", user.Email)
	}
}

// TestPostService_CreatePost 测试创建文章
func TestPostService_CreatePost(t *testing.T) {
	SetupTestDB(t)

	service := NewPostService(TestDB)

	// 创建用户
	user := model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}
	TestDB.Create(&user)

	// 创建文章
	input := CreatePostInput{
		Slug:     "test-post",
		Title:    "Test Post",
		Summary:  "Test summary",
		Content:  "Test content",
		Language: "zh-CN",
		AuthorID: user.ID.String(),
	}

	post, err := service.CreatePost(input)
	if err != nil {
		t.Fatalf("CreatePost failed: %v", err)
	}

	if post.Slug != "test-post" {
		t.Errorf("Expected slug 'test-post', got '%s'", post.Slug)
	}

	if post.Status != "draft" {
		t.Errorf("Expected status 'draft', got '%s'", post.Status)
	}
}

// TestPostService_ListPosts 测试获取文章列表
func TestPostService_ListPosts(t *testing.T) {
	SetupTestDB(t)

	service := NewPostService(TestDB)

	// 创建用户
	user := model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}
	TestDB.Create(&user)

	// 创建多篇文章
	for i := 0; i < 5; i++ {
		input := CreatePostInput{
			Slug:     fmt.Sprintf("post-%d", i),
			Title:    fmt.Sprintf("Post %d", i),
			Content:  fmt.Sprintf("Content %d", i),
			Language: "zh-CN",
			AuthorID: user.ID.String(),
		}
		service.CreatePost(input)
	}

	// 获取列表
	posts, total, err := service.ListPosts("", "", "", 1, 10)
	if err != nil {
		t.Fatalf("ListPosts failed: %v", err)
	}

	if total != 5 {
		t.Errorf("Expected 5 posts, got %d", total)
	}

	if len(posts) != 5 {
		t.Errorf("Expected 5 posts in list, got %d", len(posts))
	}
}

// TestPostService_PublishPost 测试发布文章
func TestPostService_PublishPost(t *testing.T) {
	SetupTestDB(t)

	service := NewPostService(TestDB)

	// 创建用户
	user := model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}
	TestDB.Create(&user)

	// 创建文章
	input := CreatePostInput{
		Slug:     "test-post",
		Title:    "Test Post",
		Content:  "Test content",
		Language: "zh-CN",
		AuthorID: user.ID.String(),
	}

	post, _ := service.CreatePost(input)

	// 发布文章
	published, err := service.PublishPost(post.ID.String())
	if err != nil {
		t.Fatalf("PublishPost failed: %v", err)
	}

	if published.Status != "published" {
		t.Errorf("Expected status 'published', got '%s'", published.Status)
	}

	if published.PublishedAt == nil {
		t.Error("Expected published_at to be set, got nil")
	}
}

// TestPostService_IncrementViewCount 测试增加阅读量
func TestPostService_IncrementViewCount(t *testing.T) {
	SetupTestDB(t)

	service := NewPostService(TestDB)

	// 创建用户
	user := model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}
	TestDB.Create(&user)

	// 创建文章
	input := CreatePostInput{
		Slug:     "test-post",
		Title:    "Test Post",
		Content:  "Test content",
		Language: "zh-CN",
		AuthorID: user.ID.String(),
	}

	post, _ := service.CreatePost(input)

	// 增加阅读量
	err := service.IncrementViewCount(post.ID.String())
	if err != nil {
		t.Fatalf("IncrementViewCount failed: %v", err)
	}

	// 验证阅读量
	updated, _ := service.GetPostBySlug("test-post")
	if updated.ViewCount != 1 {
		t.Errorf("Expected view_count 1, got %d", updated.ViewCount)
	}
}
