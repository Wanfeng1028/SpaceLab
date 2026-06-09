package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/config"
	"github.com/spacelab/backend/internal/handler/analytics"
	"github.com/spacelab/backend/internal/handler/auth"
	"github.com/spacelab/backend/internal/handler/comment"
	"github.com/spacelab/backend/internal/handler/media"
	"github.com/spacelab/backend/internal/handler/post"
	"github.com/spacelab/backend/internal/middleware"
	"github.com/spacelab/backend/internal/service"
	"github.com/spacelab/backend/internal/utils"
)

func main() {
	// 初始化日志
	utils.InitLogger()
	defer utils.Logger.Sync()

	// 加载配置
	cfg := config.LoadConfig()

	// 初始化数据库
	if err := config.InitDB(cfg); err != nil {
		utils.Logger.Fatal("Failed to initialize database", zap.Error(err))
	}

	// 初始化 Redis（可选）
	if redisAddr := getEnv("REDIS_ADDR", ""); redisAddr != "" {
		if err := utils.InitRedis(redisAddr, getEnv("REDIS_PASSWORD", ""), 0); err != nil {
			utils.Logger.Warn("Redis connection failed, caching disabled", zap.Error(err))
		} else {
			utils.Logger.Info("Redis connected successfully")
		}
	}

	// 初始化邮件服务
	utils.InitEmail()

	// 初始化 WebSocket
	utils.InitWebSocket()

	// 创建服务
	authService := service.NewAuthService(config.GetDB(), cfg)
	postService := service.NewPostService(config.GetDB())

	// 创建处理器
	authHandler := auth.NewAuthHandler(authService, cfg)
	postHandler := post.NewPostHandler(postService)
	liveCommentHandler := comment.NewLiveCommentHandler(cfg)
	mediaHandler := media.NewMediaHandler(cfg, config.GetDB())
	analyticsHandler := analytics.NewAnalyticsHandler(config.GetDB())

	r := gin.Default()

	// 全局中间件
	r.Use(middleware.CORS(cfg))
	r.Use(middleware.Security())
	r.Use(middleware.MetricsMiddleware())
	r.Use(middleware.LoggingMiddleware())
	r.Use(middleware.RecoveryMiddleware())

	// 监控路由
	r.GET("/metrics", middleware.PrometheusHandler())
	r.GET("/ws", func(c *gin.Context) {
		utils.HandleWebSocket(c.Writer, c.Request)
	})

	// API v1 路由组
	api := r.Group("/api/v1")
	{
		// 认证路由（无需登录）
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
		}

		// 需要认证的路由
		protected := api.Group("")
		protected.Use(middleware.Auth(cfg))
		{
			// 用户信息
			protected.GET("/auth/me", authHandler.GetMe)
			protected.PUT("/auth/password", authHandler.UpdatePassword)
			protected.PUT("/auth/profile", authHandler.UpdateProfile)

			// 文章管理（仅 Admin 可访问）
			adminOnly := protected.Group("")
			adminOnly.Use(middleware.RequireRole("admin", "writer"))
			{
				adminOnly.POST("/posts", postHandler.CreatePost)
				adminOnly.PUT("/posts/:id", postHandler.UpdatePost)
				adminOnly.DELETE("/posts/:id", postHandler.DeletePost)
				adminOnly.POST("/posts/:id/publish", postHandler.PublishPost)
			}
		}

		// 公开路由
		public := api.Group("")
		{
			// 文章
			public.GET("/posts", postHandler.ListPosts)
			public.GET("/posts/:slug", postHandler.GetPostBySlug)
			public.POST("/posts/:id/view", postHandler.IncrementViewCount)

			// 评论（通过 LiveComment API）
			public.GET("/posts/:post_id/comments", liveCommentHandler.GetComments)
			public.GET("/posts/:post_id/comment-count", liveCommentHandler.GetCommentCount)

			// 媒体库（需登录查看完整列表）
			public.GET("/media", mediaHandler.List)
			public.GET("/media/:id", mediaHandler.Get)

			// 上传（需登录）
			upload := api.Group("/media")
			upload.Use(middleware.Auth(cfg))
			{
				upload.POST("/upload", mediaHandler.Upload)
				upload.DELETE("/media/:id", mediaHandler.Delete)
			}

			// 分析接口
			public.GET("/analytics/summary", analyticsHandler.GetSummary)
			public.GET("/analytics/top-posts", analyticsHandler.GetTopPosts)
			public.GET("/analytics/traffic", analyticsHandler.GetTrafficTrend)
			public.POST("/analytics/event", analyticsHandler.RecordEvent)

			// 在线用户统计
			public.GET("/online", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"online_count": utils.Hub.GetOnlineCount(),
					"online_users": utils.Hub.GetOnlineUsers(),
				})
			})
		}
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"version":   "1.0.0",
			"timestamp": fmt.Sprintf("%v", time.Now()),
		})
	})

	// 首页
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"name":    "SpaceLab Backend API",
			"version": "1.0.0",
			"docs":    "/api-docs",
			"metrics": "/metrics",
			"health":  "/health",
		})
	})

	utils.Logger.Info("Server starting",
		zap.Int("port", cfg.ServerPort),
		zap.String("environment", cfg.Environment),
	)

	log.Printf("Server starting on port %d", cfg.ServerPort)
	log.Printf("Environment: %s", cfg.Environment)
	log.Printf("Metrics: http://localhost:%d/metrics", cfg.ServerPort)
	log.Printf("WebSocket: ws://localhost:%d/ws", cfg.ServerPort)

	if err := r.Run(fmt.Sprintf(":%d", cfg.ServerPort)); err != nil {
		utils.Logger.Fatal("Failed to start server", zap.Error(err))
	}
}

// 辅助函数
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
