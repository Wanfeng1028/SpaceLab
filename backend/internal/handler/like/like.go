package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/service"
)

type LikeHandler struct {
	likeService *service.LikeService
}

func NewLikeHandler(likeService *service.LikeService) *LikeHandler {
	return &LikeHandler{likeService: likeService}
}

// ToggleLike 切换文章点赞（需登录）
func (h *LikeHandler) ToggleLike(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	postID := c.Param("id")
	liked, count, err := h.likeService.ToggleLike(userID.(string), postID)
	if err != nil {
		status := http.StatusInternalServerError
		switch err.Error() {
		case "post not found":
			status = http.StatusNotFound
		case "invalid post ID", "invalid user ID":
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"liked": liked, "like_count": count})
}

// GetLikeStatus 查询文章点赞状态（需登录，返回当前用户是否已点赞及总点赞数）
func (h *LikeHandler) GetLikeStatus(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(string)

	postID := c.Param("id")
	liked, count, err := h.likeService.GetLikeStatus(uid, postID)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "invalid post ID" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"liked": liked, "like_count": count})
}
