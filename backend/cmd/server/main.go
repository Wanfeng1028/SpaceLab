package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spacelab/backend/internal/config"
	adminhandler "github.com/spacelab/backend/internal/handler/admin"
	analytics "github.com/spacelab/backend/internal/handler/analytics"
	auth "github.com/spacelab/backend/internal/handler/auth"
	comment "github.com/spacelab/backend/internal/handler/comment"
	media "github.com/spacelab/backend/internal/handler/media"
	post "github.com/spacelab/backend/internal/handler/post"
	projecthandler "github.com/spacelab/backend/internal/handler/project"
	"github.com/spacelab/backend/internal/middleware"
	"github.com/spacelab/backend/internal/service"
	"github.com/spacelab/backend/internal/utils"
	"go.uber.org/zap"
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
	if redisAddr := utils.GetEnv("REDIS_ADDR", ""); redisAddr != "" {
		if err := utils.InitRedis(redisAddr, utils.GetEnv("REDIS_PASSWORD", ""), 0); err != nil {
			utils.Logger.Warn("Redis connection failed, caching disabled", zap.Error(err))
		} else {
			utils.Logger.Info("Redis connected successfully")
		}
	}

	// 初始化邮件服务
	utils.InitEmail()

	// 初始化 Resend 邮件服务（可选）
	resendSvc := utils.InitResend(cfg.ResendAPIKey, cfg.ResendFrom, cfg.ResendFrom)

	// 初始化 WebSocket
	utils.InitWebSocket()

	// 创建服务
	authService := service.NewAuthService(config.GetDB(), cfg, resendSvc)
	postService := service.NewPostService(config.GetDB())
	projectService := service.NewProjectService(config.GetDB())
	commentService := service.NewCommentService(config.GetDB())

	// 创建处理器
	authHandler := auth.NewAuthHandler(authService, cfg)
	adminHandler := adminhandler.NewAdminHandler(authService)
	postHandler := post.NewPostHandler(postService)
	projectHandler := projecthandler.NewProjectHandler(projectService)
	nativeCommentHandler := comment.NewNativeCommentHandler(commentService)
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
		// 认证路由（无需登录，带限流）
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", middleware.AuthLimiter(), authHandler.Register)
			authRoutes.POST("/login", middleware.AuthFailureLimiter(), authHandler.Login)
		}

		// 需要认证的路由
		protected := api.Group("")
		protected.Use(middleware.Auth(cfg))
		{
			// 用户信息
			protected.GET("/auth/me", authHandler.GetMe)
			protected.PUT("/auth/password", authHandler.UpdatePassword)
			protected.PUT("/auth/profile", authHandler.UpdateProfile)

			// 评论管理
			protected.POST("/comments", nativeCommentHandler.CreateComment)
			protected.PUT("/comments/:id", nativeCommentHandler.UpdateComment)
			protected.DELETE("/comments/:id", nativeCommentHandler.DeleteComment)

			// 文章管理（仅 Admin 可访问）
			adminOnly := protected.Group("")
			adminOnly.Use(middleware.RequireRole("admin", "writer"))
			{
				adminOnly.POST("/posts", postHandler.CreatePost)
				adminOnly.PUT("/posts/:id", postHandler.UpdatePost)
				adminOnly.DELETE("/posts/:id", postHandler.DeletePost)
				adminOnly.POST("/posts/:id/publish", postHandler.PublishPost)

				// 项目管理
				adminOnly.POST("/projects", projectHandler.CreateProject)
				adminOnly.PUT("/projects/:id", projectHandler.UpdateProject)
				adminOnly.DELETE("/projects/:id", projectHandler.DeleteProject)
			}

			// 管理员路由（仅 Admin 可访问）
			adminRoutes := protected.Group("")
			adminRoutes.Use(middleware.RequireRole("admin"))
			{
				// 用户管理
				adminRoutes.GET("/admin/users", adminHandler.ListUsers)
				adminRoutes.GET("/admin/users/:id", adminHandler.GetUser)
				adminRoutes.PUT("/admin/users/:id/role", adminHandler.UpdateUserRole)
				adminRoutes.PUT("/admin/users/:id/status", adminHandler.UpdateUserStatus)
				adminRoutes.DELETE("/admin/users/:id", adminHandler.DeleteUser)
				adminRoutes.POST("/admin/users/:id/reset-password", adminHandler.ResetUserPassword)
				adminRoutes.GET("/admin/users/stats", adminHandler.GetStats)

				// 评论审核
				adminRoutes.POST("/admin/comments/:id/approve", nativeCommentHandler.ApproveComment)
				adminRoutes.POST("/admin/comments/:id/reject", nativeCommentHandler.RejectComment)
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

			// 项目（公开）
			public.GET("/projects", projectHandler.ListProjects)
			public.GET("/projects/:slug", projectHandler.GetProjectBySlug)
			public.POST("/projects/:id/view", projectHandler.IncrementViewCount)
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

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.ServerPort),
		Handler: r,
	}

	// 在 goroutine 中启动服务器
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			utils.Logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	utils.Logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		utils.Logger.Error("Server forced to shutdown", zap.Error(err))
	}

	// 关闭数据库连接
	sqlDB, err := config.DB.DB()
	if err == nil {
		sqlDB.Close()
	}

	// 关闭 WebSocket Hub
	if utils.Hub != nil {
		utils.Hub.Stop()
	}

	utils.Logger.Info("Server exited properly")
}
