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
	TestDB.AutoMigrate(&model.User{}, &model.Post{}, &model.Comment{}, &model.MediaAsset{}, &model.AnalyticsEvent{}, &model.Project{}, &model.Category{}, &model.Tag{}, &model.FriendLink{}, &model.AiNews{}, &model.AiTool{})
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

// TestCategoryService 测试分类服务
func TestCategoryService_CreateAndList(t *testing.T) {
	SetupTestDB(t)

	service := NewCategoryService(TestDB)

	// 创建分类
	input := CreateCategoryInput{
		Slug:        "frontend",
		Name:        "前端",
		Description: "前端开发相关文章",
		SortOrder:   1,
	}

	cat, err := service.CreateCategory(input)
	if err != nil {
		t.Fatalf("CreateCategory failed: %v", err)
	}

	if cat.Slug != "frontend" {
		t.Errorf("Expected slug 'frontend', got '%s'", cat.Slug)
	}

	// 列出分类
	cats, err := service.ListCategories()
	if err != nil {
		t.Fatalf("ListCategories failed: %v", err)
	}

	if len(cats) != 1 {
		t.Errorf("Expected 1 category, got %d", len(cats))
	}
}

// TestCategoryService_Tree 测试分类树
func TestCategoryService_Tree(t *testing.T) {
	SetupTestDB(t)

	service := NewCategoryService(TestDB)

	// 创建父分类
	parent, _ := service.CreateCategory(CreateCategoryInput{
		Slug:      "tech",
		Name:      "技术",
		SortOrder: 0,
	})

	// 创建子分类
	parentIDStr := parent.ID.String()
	_, err := service.CreateCategory(CreateCategoryInput{
		Slug:      "frontend",
		Name:      "前端",
		ParentID:  &parentIDStr,
		SortOrder: 1,
	})
	if err != nil {
		t.Fatalf("CreateCategory child failed: %v", err)
	}

	// 获取分类树
	tree, err := service.GetCategoryTree()
	if err != nil {
		t.Fatalf("GetCategoryTree failed: %v", err)
	}

	if len(tree) != 1 {
		t.Errorf("Expected 1 root category, got %d", len(tree))
	}

	if len(tree[0].Children) != 1 {
		t.Errorf("Expected 1 child category, got %d", len(tree[0].Children))
	}
}

// TestTagService 测试标签服务
func TestTagService_CreateAndList(t *testing.T) {
	SetupTestDB(t)

	service := NewTagService(TestDB)

	// 创建标签
	input := CreateTagInput{
		Slug:  "angular",
		Name:  "Angular",
		Color: "#dd0031",
	}

	tag, err := service.CreateTag(input)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	if tag.Slug != "angular" {
		t.Errorf("Expected slug 'angular', got '%s'", tag.Slug)
	}

	if tag.Color != "#dd0031" {
		t.Errorf("Expected color '#dd0031', got '%s'", tag.Color)
	}

	// 列出标签
	tags, err := service.ListTags()
	if err != nil {
		t.Fatalf("ListTags failed: %v", err)
	}

	if len(tags) != 1 {
		t.Errorf("Expected 1 tag, got %d", len(tags))
	}
}

// TestFriendLinkService 测试友情链接服务
func TestFriendLinkService_CreateAndList(t *testing.T) {
	SetupTestDB(t)

	service := NewFriendLinkService(TestDB)

	input := CreateFriendLinkInput{
		Name:        "Example Blog",
		URL:         "https://example.com",
		Description: "A great blog",
		SortOrder:   1,
	}

	link, err := service.CreateFriendLink(input)
	if err != nil {
		t.Fatalf("CreateFriendLink failed: %v", err)
	}

	if link.Name != "Example Blog" {
		t.Errorf("Expected name 'Example Blog', got '%s'", link.Name)
	}

	if link.Status != "active" {
		t.Errorf("Expected status 'active', got '%s'", link.Status)
	}

	// 列出友链
	links, err := service.ListFriendLinks("active")
	if err != nil {
		t.Fatalf("ListFriendLinks failed: %v", err)
	}

	if len(links) != 1 {
		t.Errorf("Expected 1 friend link, got %d", len(links))
	}
}

// TestAiNewsService 测试 AI 新闻服务
func TestAiNewsService_CreateAndList(t *testing.T) {
	SetupTestDB(t)

	service := NewAiNewsService(TestDB)

	news, err := service.Create(CreateAiNewsInput{
		Slug:       "test-ai-news",
		Title:      "Test AI News",
		Summary:    "A test news item",
		SourceName: "Test Source",
		SourceURL:  "https://example.com",
		Category:   "product",
		Tags:       []string{"AI", "test"},
		Status:     "published",
	})
	if err != nil {
		t.Fatalf("Create AiNews failed: %v", err)
	}

	if news.Slug != "test-ai-news" {
		t.Errorf("Expected slug 'test-ai-news', got '%s'", news.Slug)
	}
	if news.Status != "published" {
		t.Errorf("Expected status 'published', got '%s'", news.Status)
	}

	// List published
	list, total, err := service.List("published", "", 1, 10)
	if err != nil {
		t.Fatalf("List AiNews failed: %v", err)
	}
	if total != 1 {
		t.Errorf("Expected 1 news item, got %d", total)
	}
	if len(list) != 1 {
		t.Errorf("Expected 1 item in list, got %d", len(list))
	}
}

// TestAiToolService 测试 AI 工具服务
func TestAiToolService_CreateAndList(t *testing.T) {
	SetupTestDB(t)

	service := NewAiToolService(TestDB)

	tool, err := service.Create(CreateAiToolInput{
		Title:    "Test Tool",
		Summary:  "A test tool",
		Category: "testing",
		Source:   "GitHub",
		URL:      "https://github.com/test",
		Tags:     []string{"tool"},
	})
	if err != nil {
		t.Fatalf("Create AiTool failed: %v", err)
	}

	if tool.Title != "Test Tool" {
		t.Errorf("Expected title 'Test Tool', got '%s'", tool.Title)
	}

	// List all
	list, total, err := service.List("", "", 1, 10)
	if err != nil {
		t.Fatalf("List AiTools failed: %v", err)
	}
	if total != 1 {
		t.Errorf("Expected 1 tool, got %d", total)
	}
	if len(list) != 1 {
		t.Errorf("Expected 1 tool in list, got %d", len(list))
	}

	// Filter by category
	catList, catTotal, err := service.List("testing", "", 1, 10)
	if err != nil {
		t.Fatalf("List AiTools by category failed: %v", err)
	}
	if catTotal != 1 {
		t.Errorf("Expected 1 tool in category, got %d", catTotal)
	}
	if len(catList) != 1 {
		t.Errorf("Expected 1 tool in category list, got %d", len(catList))
	}
}
