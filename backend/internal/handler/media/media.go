package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/model"
	"github.com/spacelab/backend/internal/utils"
	"gorm.io/gorm"
)

type MediaHandler struct {
	cfg *config.Config
	db  *gorm.DB
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
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
		"video/mp4":  true,
		"video/webm": true,
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

	// S10: 白名单验证扩展名
	validExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
		".mp4": true, ".webm": true,
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !validExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file extension"})
		return
	}

	// 路径遍历防护：确保文件名不包含路径分隔符或 ..
	cleanName := filepath.Base(file.Filename)
	if cleanName != file.Filename || strings.Contains(file.Filename, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	// L6: 使用临时文件写入，成功后重命名
	tempFile, err := os.CreateTemp(uploadDir, "upload-*"+ext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp file"})
		return
	}
	tempPath := tempFile.Name()

	// 保存文件到临时文件
	src, err := file.Open()
	if err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer src.Close()

	if _, err = tempFile.ReadFrom(src); err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tempFile.Close()

	// Magic bytes 验证：读取文件头确认真实类型
	detectedType, err := detectFileType(tempPath)
	if err != nil || !validTypes[detectedType] {
		os.Remove(tempPath)
		c.JSON(http.StatusBadRequest, gin.H{"error": "File content does not match allowed types"})
		return
	}

	// 生成最终文件名（UUID + 白名单扩展名）
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	finalPath := filepath.Join(uploadDir, filename)
	if err := os.Rename(tempPath, finalPath); err != nil {
		os.Remove(tempPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// 获取文件信息
	info, err := os.Stat(finalPath)
	if err != nil {
		os.Remove(finalPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 存储到数据库
	uploaderID, _ := uuid.Parse(c.GetString("user_id"))
	mediaAsset := model.MediaAsset{
		ID:           uuid.New(),
		Filename:     filename,
		OriginalName: file.Filename,
		StoragePath:  finalPath,
		MimeType:     detectedType, // 使用 magic bytes 检测的真实类型，而非客户端 Content-Type
		Size:         info.Size(),
		Type:         getMediaType(detectedType),
		UploadedBy:   uploaderID,
		CreatedAt:    time.Now(),
	}

	if err := h.db.Create(&mediaAsset).Error; err != nil {
		os.Remove(finalPath) // 回滚：删除文件
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 返回文件 URL（使用环境变量配置基础 URL）
	baseURL := utils.GetEnv("API_BASE_URL", fmt.Sprintf("http://localhost:%d", h.cfg.ServerPort))
	fileURL := fmt.Sprintf("%s/uploads/%s", baseURL, filepath.ToSlash(filepath.Join(filepath.Dir(filename), filename)))

	c.JSON(http.StatusCreated, gin.H{
		"id":        mediaAsset.ID.String(),
		"url":       fileURL,
		"name":      mediaAsset.OriginalName,
		"type":      mediaAsset.Type,
		"size":      mediaAsset.Size,
		"mime_type": mediaAsset.MimeType,
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

	// 权限检查：只有 admin 或资源所有者可删除
	currentUserID := c.GetString("user_id")
	currentRole := c.GetString("role")
	if mediaAsset.UploadedBy != uuid.Nil && mediaAsset.UploadedBy.String() != currentUserID && currentRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	// 路径遍历防护：确保 StoragePath 在上传目录内
	absPath, err := filepath.Abs(mediaAsset.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid file path"})
		return
	}
	absUpload, err := filepath.Abs(h.cfg.UploadPath)
	if err != nil || !strings.HasPrefix(absPath, absUpload) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid storage path"})
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

// detectFileType 通过读取文件头部 magic bytes 判断真实 MIME 类型
// 防止攻击者伪造 Content-Type / 扩展名上传恶意文件
func detectFileType(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	buf := make([]byte, 32)
	n, err := f.Read(buf)
	if err != nil || n < 4 {
		return "", fmt.Errorf("cannot read file header")
	}

	switch {
	case len(buf) >= 3 && buf[0] == 0xFF && buf[1] == 0xD8 && buf[2] == 0xFF:
		return "image/jpeg", nil
	case len(buf) >= 8 && string(buf[:8]) == "\x89PNG\r\n\x1a\n":
		return "image/png", nil
	case len(buf) >= 6 && (string(buf[:6]) == "GIF87a" || string(buf[:6]) == "GIF89a"):
		return "image/gif", nil
	case len(buf) >= 4 && string(buf[:4]) == "RIFF" && len(buf) >= 12 && string(buf[8:12]) == "WEBP":
		return "image/webp", nil
	case len(buf) >= 8 && (string(buf[:4]) == "ftyp" || (len(buf) >= 12 && string(buf[4:8]) == "ftyp")):
		// MP4 / MOV 等容器格式均以 ftyp box 开头
		return "video/mp4", nil
	case len(buf) >= 4 && string(buf[:4]) == "\x1a\x45\xdf\xa3":
		return "video/webm", nil
	default:
		return "", fmt.Errorf("unknown file type")
	}
}
