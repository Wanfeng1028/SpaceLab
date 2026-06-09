package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/service"
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Event recorded successfully"})
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
