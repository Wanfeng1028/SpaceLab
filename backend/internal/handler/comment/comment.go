package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/config"
)

// httpClient 带超时的 HTTP 客户端
var httpClient = &http.Client{
	Timeout: 10 * time.Second,
}

// LiveCommentHandler LiveComment 集成处理器
// LiveComment API: https://docs.livecomment.cn/
type LiveCommentHandler struct {
	cfg *config.Config
}

// CommentListResponse LiveComment 评论列表响应
type CommentListResponse struct {
	Code int         `json:"code"`
	Data CommentList `json:"data"`
	Msg  string      `json:"msg"`
}

// CommentList 评论列表结构
type CommentList struct {
	Total int       `json:"total"`
	List  []Comment `json:"list"`
	Pager Pager     `json:"pager"`
}

// Comment LiveComment 评论结构
type Comment struct {
	ID        string    `json:"id"`
	PostID    string    `json:"post_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Avatar    string    `json:"avatar"`
	Content   string    `json:"content"`
	IP        string    `json:"ip"`
	UserID    string    `json:"user_id"`
	Status    string    `json:"status"`
	CreatedAt int64     `json:"create_time"`
	UpdatedAt int64     `json:"update_time"`
	Replies   []Comment `json:"replies"`
}

// Pager 分页信息
type Pager struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	Total    int `json:"total"`
	Count    int `json:"count"`
}

func NewLiveCommentHandler(cfg *config.Config) *LiveCommentHandler {
	return &LiveCommentHandler{cfg: cfg}
}

// GetComments 获取文章评论列表（通过 LiveComment API）
func (h *LiveCommentHandler) GetComments(c *gin.Context) {
	postID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	// 构建 API 请求
	apiURL := "https://api.livecomment.cn/v1/comment/list"
	params := url.Values{}
	params.Set("site_id", h.cfg.LiveCommentSiteID)
	params.Set("post_id", postID)
	params.Set("page", strconv.Itoa(page))
	params.Set("page_size", strconv.Itoa(pageSize))

	resp, err := httpClient.Get(apiURL + "?" + params.Encode())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result CommentListResponse
	if err := json.Unmarshal(body, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
		return
	}

	if result.Code != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": result.Msg})
		return
	}

	c.JSON(http.StatusOK, result.Data)
}

// GetCommentCount 获取评论数量（通过 LiveComment API）
func (h *LiveCommentHandler) GetCommentCount(c *gin.Context) {
	postID := c.Param("id")

	apiURL := "https://api.livecomment.cn/v1/comment/count"
	params := url.Values{}
	params.Set("site_id", h.cfg.LiveCommentSiteID)
	params.Set("post_id", postID)

	resp, err := httpClient.Get(apiURL + "?" + params.Encode())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comment count"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Code int    `json:"code"`
		Data int    `json:"data"`
		Msg  string `json:"msg"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
		return
	}

	if result.Code != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": result.Msg})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": result.Data})
}
