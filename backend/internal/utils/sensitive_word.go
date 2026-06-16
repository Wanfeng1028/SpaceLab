package utils

import (
	"strings"
	"sync"

	"github.com/spacelab/backend/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SensitiveWordChecker 敏感词检查器
type SensitiveWordChecker struct {
	db    *gorm.DB
	words map[string]string // word -> category
	mu    sync.RWMutex
}

var GlobalSensitiveChecker *SensitiveWordChecker

// InitSensitiveChecker 初始化敏感词检查器
func InitSensitiveChecker(db *gorm.DB) {
	GlobalSensitiveChecker = &SensitiveWordChecker{
		db:    db,
		words: make(map[string]string),
	}
	GlobalSensitiveChecker.Reload()
}

// Reload 从数据库重新加载敏感词
func (c *SensitiveWordChecker) Reload() {
	var words []model.SensitiveWord
	if err := c.db.Find(&words).Error; err != nil {
		Logger.Warn("Failed to load sensitive words", zap.Error(err))
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	c.words = make(map[string]string, len(words))
	for _, w := range words {
		c.words[strings.ToLower(w.Word)] = w.Category
	}
}

// Check 检查内容是否包含敏感词，返回 true 表示命中
func (c *SensitiveWordChecker) Check(content string) bool {
	if c == nil {
		return false
	}
	c.mu.RLock()
	defer c.mu.RUnlock()

	lower := strings.ToLower(content)
	for word := range c.words {
		if strings.Contains(lower, word) {
			return true
		}
	}
	return false
}

// CheckWithCategory 检查内容是否包含敏感词，返回命中的分类
func (c *SensitiveWordChecker) CheckWithCategory(content string) (bool, string) {
	if c == nil {
		return false, ""
	}
	c.mu.RLock()
	defer c.mu.RUnlock()

	lower := strings.ToLower(content)
	for word, category := range c.words {
		if strings.Contains(lower, word) {
			return true, category
		}
	}
	return false, ""
}
