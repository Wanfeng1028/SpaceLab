package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/model"
)

// 匹配静态 content.generated.ts 中的 AiNewsItem 格式
type staticNewsItem struct {
	ID        string   `json:"id"`
	Date      string   `json:"date"`
	Title     string   `json:"title"`
	Summary   string   `json:"summary"`
	Source    string   `json:"source"`
	URL       string   `json:"url"`
	Category  string   `json:"category"`
	Tags      []string `json:"tags"`
	FetchedAt string   `json:"fetchedAt"`
}

func main() {
	cfg := config.LoadConfig()
	if err := config.InitDB(cfg); err != nil {
		log.Fatalf("Failed to init DB: %v", err)
	}
	db := config.GetDB()

	// 确保表存在
	db.AutoMigrate(&model.AiNews{})

	// 读取 content.generated.ts 格式文件
	// 期望传入的文件路径参数
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run seed_ai_news.go <path-to-news.json>")
	}

	data, err := os.ReadFile(os.Args[1])
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}

	var news []staticNewsItem
	if err := json.Unmarshal(data, &news); err != nil {
		log.Fatalf("Failed to parse JSON: %v", err)
	}

	imported := 0
	skipped := 0

	for _, item := range news {
		slug := slugify(item.Title)
		if slug == "" {
			slug = item.ID
		}

		// 检查是否已存在
		var existing model.AiNews
		result := db.Where("slug = ?", slug).First(&existing)
		if result.Error == nil {
			skipped++
			continue
		}

		publishedAt, _ := time.Parse("2006-01-02", item.Date)

		newsItem := model.AiNews{
			ID:         uuid.New(),
			Slug:       slug,
			Title:      item.Title,
			Summary:    item.Summary,
			SourceName: item.Source,
			SourceURL:  item.URL,
			Category:   item.Category,
			Tags:       item.Tags,
			Status:     "published",
			PublishedAt: &publishedAt,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		if err := db.Create(&newsItem).Error; err != nil {
			log.Printf("Error importing '%s': %v", item.Title, err)
			continue
		}
		imported++
	}

	fmt.Printf("✅ Imported %d AI news items (skipped %d existing)\n", imported, skipped)
}

func slugify(title string) string {
	slug := strings.ToLower(title)
	// Replace non-alphanumeric with hyphens
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return '-'
	}, slug)
	// Collapse multiple hyphens
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	slug = strings.Trim(slug, "-")
	if len(slug) > 200 {
		slug = slug[:200]
	}
	return slug
}
