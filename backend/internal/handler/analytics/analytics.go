package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/utils"
	"gorm.io/gorm"
)

type AnalyticsHandler struct {
	db *gorm.DB
}

func NewAnalyticsHandler(db *gorm.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

// RecordEvent 记录访问事件
func (h *AnalyticsHandler) RecordEvent(c *gin.Context) {
	var input struct {
		EventType  string `json:"event_type" binding:"required"`
		PagePath   string `json:"page_path"`
		PageTitle  string `json:"page_title"`
		TargetID   string `json:"target_id"`
		TargetType string `json:"target_type"`
		Referrer   string `json:"referrer"`
		DeviceType string `json:"device_type"`
		Browser    string `json:"browser"`
		Language   string `json:"language"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// 事件类型白名单（防止任意数据注入）
	validEventTypes := map[string]bool{
		"page_view": true, "click": true, "scroll": true,
		"share": true, "download": true, "search": true,
	}
	if !validEventTypes[input.EventType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event type"})
		return
	}

	// 清洗输入字段（防止 XSS 和超长字符串）
	input.PagePath = truncateStr(utils.SanitizePlainString(input.PagePath), 500)
	input.PageTitle = truncateStr(utils.SanitizePlainString(input.PageTitle), 500)
	input.Referrer = truncateStr(utils.SanitizeLinkURL(input.Referrer), 500)
	input.DeviceType = truncateStr(utils.SanitizePlainString(input.DeviceType), 50)
	input.Browser = truncateStr(utils.SanitizePlainString(input.Browser), 100)
	input.Language = truncateStr(utils.SanitizePlainString(input.Language), 10)

	// 验证 TargetType
	if input.TargetType != "" {
		validTargetTypes := map[string]bool{"post": true, "project": true, "comment": true, "category": true, "tag": true}
		if !validTargetTypes[input.TargetType] {
			input.TargetType = ""
		}
	}

	event := model.AnalyticsEvent{
		ID:         uuid.New(),
		EventType:  input.EventType,
		PagePath:   input.PagePath,
		PageTitle:  input.PageTitle,
		DeviceType: input.DeviceType,
		Browser:    input.Browser,
		Language:   input.Language,
		CreatedAt:  time.Now(),
	}

	if input.TargetID != "" {
		if id, err := uuid.Parse(input.TargetID); err == nil {
			event.TargetID = &id
		}
	}

	event.TargetType = input.TargetType
	event.Referrer = input.Referrer

	result := h.db.Create(&event)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record event"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Event recorded successfully"})
}

// truncateStr 截断字符串到指定长度
func truncateStr(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

// GetSummary 获取分析概览
func (h *AnalyticsHandler) GetSummary(c *gin.Context) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := now.AddDate(0, 0, -7)
	monthStart := now.AddDate(0, -1, 0)

	var totalViews, todayViews, weekViews, monthViews int64

	h.db.Model(&model.AnalyticsEvent{}).Where("event_type = ?", "page_view").Count(&totalViews)
	h.db.Model(&model.AnalyticsEvent{}).
		Where("event_type = ? AND created_at >= ?", "page_view", todayStart).
		Count(&todayViews)
	h.db.Model(&model.AnalyticsEvent{}).
		Where("event_type = ? AND created_at >= ?", "page_view", weekStart).
		Count(&weekViews)
	h.db.Model(&model.AnalyticsEvent{}).
		Where("event_type = ? AND created_at >= ?", "page_view", monthStart).
		Count(&monthViews)

	response := gin.H{
		"total_views":    totalViews,
		"today_views":    todayViews,
		"week_views":     weekViews,
		"month_views":    monthViews,
		"updated_at":     now,
	}

	c.JSON(http.StatusOK, response)
}

// GetTopPosts 获取热门文章
func (h *AnalyticsHandler) GetTopPosts(c *gin.Context) {
	limit := 10
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	// 限制查询范围
	if limit > 50 {
		limit = 50
	}

	var posts []model.Post
	h.db.Model(&model.Post{}).
		Select("id, title, view_count").
		Order("view_count DESC").
		Limit(limit).
		Find(&posts)

	c.JSON(http.StatusOK, posts)
}

// GetTrafficTrend 获取流量趋势
func (h *AnalyticsHandler) GetTrafficTrend(c *gin.Context) {
	days := 7
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	// 限制查询范围
	if days > 365 {
		days = 365
	}

	startDate := time.Now().AddDate(0, 0, -days)

	type TrafficDay struct {
		Date  string `json:"date"`
		Views int64  `json:"views"`
	}

	var traffic []TrafficDay

	query := `
		SELECT DATE(created_at) as date, COUNT(*) as views
		FROM analytics_events
		WHERE event_type = 'page_view' AND created_at >= $1
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`

	h.db.Raw(query, startDate).Scan(&traffic)

	c.JSON(http.StatusOK, gin.H{
		"days":   days,
		"trend":  traffic,
	})
}
