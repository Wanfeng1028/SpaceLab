package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/service"
)

type MediaHandler struct {
	cfg    *config.Config
	db     *gorm.DB
}

func NewMediaHandler(cfg *config.Config, db *gorm.DB) *MediaHandler {
	return &MediaHandler{cfg: cfg, db: db}
}

// Upload 上传文件
func (h *MediaHandler) Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查文件大小
	if file.Size > h.cfg.MaxUploadSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("File size exceeds maximum allowed size (%d bytes)", h.cfg.MaxUploadSize)})
		return
	}

	// 验证文件类型
	validTypes := map[string]bool{
		"image/jpeg":   true,
		"image/png":    true,
		"image/gif":    true,
		"image/webp":   true,
		"video/mp4":    true,
		"video/webm":   true,
	}

	if !validTypes[file.Header.Get("Content-Type")] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type"})
		return
	}

	// 创建上传目录
	uploadDir := filepath.Join(h.cfg.UploadPath, time.Now().Format("2006/01"))
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// 生成文件名
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dst := filepath.Join(uploadDir, filename)

	// 保存文件
	if err := c.SaveFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 获取文件信息
	info, err := os.Stat(dst)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 存储到数据库
	mediaAsset := model.MediaAsset{
		ID:           uuid.New(),
		Filename:     filename,
		OriginalName: file.Filename,
		StoragePath:  dst,
		MimeType:     file.Header.Get("Content-Type"),
		Size:         info.Size(),
		Type:         getMediaType(file.Header.Get("Content-Type")),
		CreatedAt:    time.Now(),
	}

	if err := h.db.Create(&mediaAsset).Error; err != nil {
		os.Remove(dst) // 回滚：删除文件
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 返回文件 URL（实际项目中应该使用 CDN 或云存储 URL）
	fileURL := fmt.Sprintf("http://localhost:%d/uploads/%s", h.cfg.ServerPort, filepath.ToSlash(filepath.Join(filepath.Dir(filename), filename)))

	c.JSON(http.StatusCreated, gin.H{
		"id":          mediaAsset.ID.String(),
		"url":         fileURL,
		"name":        mediaAsset.OriginalName,
		"type":        mediaAsset.Type,
		"size":        mediaAsset.Size,
		"mime_type":   mediaAsset.MimeType,
	})
}

// List 获取媒体列表
func (h *MediaHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	fileType := c.Query("type")

	if page < 1 {
		page = 1
	}

	var mediaAssets []model.MediaAsset
	var total int64

	query := h.db.Model(&model.MediaAsset{})

	if fileType != "" {
		query = query.Where("type = ?", fileType)
	}

	query.Count(&total)
	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&mediaAssets)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	response := struct {
		Assets     []model.MediaAsset `json:"assets"`
		Total      int64              `json:"total"`
		Page       int                `json:"page"`
		PageSize   int                `json:"page_size"`
		TotalPages int                `json:"total_pages"`
	}{
		Assets:     mediaAssets,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: int((total + int64(pageSize-1)) / int64(pageSize)),
	}

	c.JSON(http.StatusOK, response)
}

// Delete 删除媒体文件
func (h *MediaHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var mediaAsset model.MediaAsset
	result := h.db.Where("id = ?", id).First(&mediaAsset)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
		return
	}

	// 删除物理文件
	if err := os.Remove(mediaAsset.StoragePath); err != nil && !os.IsNotExist(err) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
		return
	}

	// 删除数据库记录
	if err := h.db.Delete(&mediaAsset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete from database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Media deleted successfully"})
}

// Get 获取媒体详情
func (h *MediaHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var mediaAsset model.MediaAsset
	result := h.db.Where("id = ?", id).First(&mediaAsset)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
		return
	}

	c.JSON(http.StatusOK, mediaAsset)
}

func getMediaType(mimeType string) string {
	if mimeType == "" {
		return "unknown"
	}

	if len(mimeType) > 5 && mimeType[:5] == "image" {
		return "image"
	}
	if len(mimeType) > 5 && mimeType[:5] == "video" {
		return "video"
	}

	return "unknown"
}
