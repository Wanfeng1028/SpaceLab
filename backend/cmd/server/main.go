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
	aiNewsHandler "github.com/spacelab/backend/internal/handler/ai_news"
	aiToolHandler "github.com/spacelab/backend/internal/handler/ai_tool"
	analytics "github.com/spacelab/backend/internal/handler/analytics"
	auth "github.com/spacelab/backend/internal/handler/auth"
	captchahandler "github.com/spacelab/backend/internal/handler/captcha"
	comment "github.com/spacelab/backend/internal/handler/comment"
	contenthandler "github.com/spacelab/backend/internal/handler/content"
	media "github.com/spacelab/backend/internal/handler/media"
	post "github.com/spacelab/backend/internal/handler/post"
	projecthandler "github.com/spacelab/backend/internal/handler/project"
	"github.com/spacelab/backend/internal/middleware"
	"github.com/spacelab/backend/internal/model"
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

	// 自动迁移数据库表结构
	if err := config.GetDB().AutoMigrate(
		&model.User{},
		&model.LoginLog{},
		&model.RiskEvent{},
		&model.SiteSetting{},
		&model.Post{},
		&model.Comment{},
		&model.MediaAsset{},
		&model.AnalyticsEvent{},
		&model.Project{},
		&model.PasswordResetToken{},
		&model.EmailVerificationToken{},
		&model.Category{},
		&model.Tag{},
		&model.FriendLink{},
		&model.AdminAuditLog{},
		&model.SensitiveWord{},
		&model.CommentReport{},
		&model.AiNews{},
		&model.AiTool{},
	); err != nil {
		utils.Logger.Warn("Auto-migration warning", zap.Error(err))
	}

	// 初始化 Redis（可选）
	if redisAddr := utils.GetEnv("REDIS_ADDR", ""); redisAddr != "" {
		if err := utils.InitRedis(redisAddr, utils.GetEnv("REDIS_PASSWORD", ""), 0); err != nil {
			utils.Logger.Warn("Redis connection failed, caching disabled", zap.Error(err))
		} else {
			utils.Logger.Info("Redis connected successfully")
			// 初始化 Token 撤销管理器（依赖 Redis）
			utils.InitTokenRevocation(utils.GetRedisClient())
		}
	}

	// 初始化邮件服务
	utils.InitEmail()

	// 初始化审计日志
	utils.InitAuditLogger(config.GetDB())

	// 初始化敏感词检查器
	utils.InitSensitiveChecker(config.GetDB())

	// 初始化 Resend 邮件服务（可选）
	resendSvc := utils.InitResend(cfg.ResendAPIKey, cfg.ResendFrom, cfg.ResendFrom)

	// 初始化 WebSocket
	utils.InitWebSocket()

	// 创建服务
	authService := service.NewAuthService(config.GetDB(), cfg, resendSvc)
	postService := service.NewPostService(config.GetDB())
	projectService := service.NewProjectService(config.GetDB())
	commentService := service.NewCommentService(config.GetDB())
	categoryService := service.NewCategoryService(config.GetDB())
	tagService := service.NewTagService(config.GetDB())
	friendLinkService := service.NewFriendLinkService(config.GetDB())
	aiNewsService := service.NewAiNewsService(config.GetDB())
	aiToolService := service.NewAiToolService(config.GetDB())

	// 创建处理器
	authHandler := auth.NewAuthHandler(authService, cfg)
	adminHandler := adminhandler.NewAdminHandler(authService)
	postHandler := post.NewPostHandler(postService)
	projectHandler := projecthandler.NewProjectHandler(projectService)
	nativeCommentHandler := comment.NewNativeCommentHandler(commentService)
	nativeCommentHandler.SetTurnstileSecret(cfg.TurnstileSecret)
	// liveCommentHandler 保留供未来切换使用
	_ = comment.NewLiveCommentHandler(cfg)
	mediaHandler := media.NewMediaHandler(cfg, config.GetDB())
	analyticsHandler := analytics.NewAnalyticsHandler(config.GetDB())
	categoryHandler := contenthandler.NewCategoryHandler(categoryService)
	tagHandler := contenthandler.NewTagHandler(tagService)
	friendLinkHandler := contenthandler.NewFriendLinkHandler(friendLinkService)
	newsHandler := aiNewsHandler.NewAiNewsHandler(aiNewsService)
	toolHandler := aiToolHandler.NewAiToolHandler(aiToolService)
	captchaHandler := captchahandler.NewCaptchaHandler()

	r := gin.Default()

	// 全局中间件
	r.Use(middleware.CORS(cfg))
	r.Use(middleware.Security())
	r.Use(middleware.ContentSecurityPolicy())
	r.Use(middleware.NoSnitch())
	r.Use(middleware.RequestSizeLimit(10 << 20)) // 10MB 全局请求体限制
	r.Use(middleware.MetricsMiddleware())
	r.Use(middleware.LoggingMiddleware())
	r.Use(middleware.RecoveryMiddleware())

	// 监控路由
	r.GET("/metrics", middleware.PrometheusHandler())

	// WebSocket — 独立路由，通过 ?token=JWT 认证（浏览器 WebSocket API 无法设置 Authorization 头）
	r.GET("/ws", func(c *gin.Context) {
		utils.HandleWebSocket(c.Writer, c.Request)
	})

	// 图形验证码（公开，无需认证）
	r.GET("/captcha/new", middleware.AuthLimiter(), captchaHandler.GetCaptchaID)
	r.GET("/captcha/:id.png", captchaHandler.GetCaptchaImage)
	r.POST("/captcha/verify", middleware.AuthLimiter(), captchaHandler.VerifyCaptcha)

	// API v1 路由组
	api := r.Group("/api/v1")
	{
		// 认证路由（无需登录，带限流）
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", middleware.AuthLimiter(), authHandler.Register)
			authRoutes.POST("/login", middleware.AuthFailureLimiter(), authHandler.Login)
			authRoutes.POST("/refresh", middleware.AuthLimiter(), authHandler.RefreshToken)
			authRoutes.POST("/verify-email", authHandler.VerifyEmail)
			authRoutes.GET("/verify-email", authHandler.VerifyEmail) // 邮件链接直接点击
			authRoutes.POST("/request-password-reset", middleware.AuthLimiter(), authHandler.RequestPasswordReset)
			authRoutes.POST("/reset-password", middleware.AuthLimiter(), authHandler.ResetPassword)
			authRoutes.GET("/registration-open", authHandler.IsRegistrationOpen)
		}

		// 需要认证的路由（带 Redis Token 撤销检查）
		protected := api.Group("")
		protected.Use(middleware.AuthWithRedis(cfg, utils.GetRedisClient(), config.GetDB()))
		{
			// 用户信息
			protected.GET("/auth/me", authHandler.GetMe)
			protected.PUT("/auth/password", authHandler.UpdatePassword)
			protected.PUT("/auth/profile", authHandler.UpdateProfile)
			protected.POST("/auth/resend-verification", middleware.AuthLimiter(), authHandler.ResendVerificationEmail)
			protected.POST("/auth/logout", authHandler.Logout)

			// 评论管理
			protected.POST("/comments", middleware.AuthLimiter(), nativeCommentHandler.CreateComment)
			protected.PUT("/comments/:id", middleware.AuthLimiter(), nativeCommentHandler.UpdateComment)
			protected.DELETE("/comments/:id", nativeCommentHandler.DeleteComment)
			// 兼容前端 /posts/:id/comments 路径创建评论
			protected.POST("/posts/:id/comments", middleware.AuthLimiter(), nativeCommentHandler.CreateComment)
			// 评论举报
			protected.POST("/comments/:id/report", middleware.AuthLimiter(), nativeCommentHandler.ReportComment)

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

				// 分类管理
				adminOnly.POST("/categories", categoryHandler.CreateCategory)
				adminOnly.PUT("/categories/:id", categoryHandler.UpdateCategory)
				adminOnly.DELETE("/categories/:id", categoryHandler.DeleteCategory)

				// 标签管理
				adminOnly.POST("/tags", tagHandler.CreateTag)
				adminOnly.PUT("/tags/:id", tagHandler.UpdateTag)
				adminOnly.DELETE("/tags/:id", tagHandler.DeleteTag)

				// 友链管理
				adminOnly.POST("/friend-links", friendLinkHandler.CreateFriendLink)
				adminOnly.PUT("/friend-links/:id", friendLinkHandler.UpdateFriendLink)
				adminOnly.DELETE("/friend-links/:id", friendLinkHandler.DeleteFriendLink)

				// AI 新闻管理
				adminOnly.POST("/ai-news", newsHandler.Create)
				adminOnly.PUT("/ai-news/:id", newsHandler.Update)
				adminOnly.DELETE("/ai-news/:id", newsHandler.Delete)
			}

			// 管理员路由（仅 Admin 可访问）
			adminRoutes := protected.Group("")
			adminRoutes.Use(middleware.RequireRole("admin"))
			{
				// 用户管理
				adminRoutes.GET("/admin/users", adminHandler.ListUsers)
				adminRoutes.GET("/admin/users/stats", adminHandler.GetStats)
				adminRoutes.GET("/admin/users/:id", adminHandler.GetUser)
				adminRoutes.GET("/admin/users/:id/risk-profile", adminHandler.GetUserRiskProfile)
				adminRoutes.PUT("/admin/users/:id/role", adminHandler.UpdateUserRole)
				adminRoutes.PUT("/admin/users/:id/status", adminHandler.UpdateUserStatus)
				adminRoutes.DELETE("/admin/users/:id", adminHandler.DeleteUser)
				adminRoutes.POST("/admin/users/:id/reset-password", adminHandler.ResetUserPassword)
				adminRoutes.POST("/admin/users/:id/lock", adminHandler.LockUser)
				adminRoutes.POST("/admin/users/:id/unlock", adminHandler.UnlockUser)
				adminRoutes.POST("/admin/users/:id/ban", adminHandler.BanUser)
				adminRoutes.POST("/admin/users/:id/unban", adminHandler.UnbanUser)

				// 评论审核
				adminRoutes.GET("/admin/comments", nativeCommentHandler.AdminListComments)
				adminRoutes.POST("/admin/comments/:id/approve", nativeCommentHandler.ApproveComment)
				adminRoutes.POST("/admin/comments/:id/reject", nativeCommentHandler.RejectComment)
				adminRoutes.DELETE("/admin/comments/:id", nativeCommentHandler.AdminDeleteComment)

				// 评论举报审核
				adminRoutes.GET("/admin/comment-reports", nativeCommentHandler.ListReports)
				adminRoutes.POST("/admin/comment-reports/:id/review", nativeCommentHandler.ReviewReport)

				// 敏感词管理
				adminRoutes.GET("/admin/sensitive-words", nativeCommentHandler.ListSensitiveWords)
				adminRoutes.POST("/admin/sensitive-words", nativeCommentHandler.AddSensitiveWord)
				adminRoutes.DELETE("/admin/sensitive-words/:id", nativeCommentHandler.DeleteSensitiveWord)

				// 风控管理
				adminRoutes.GET("/admin/login-logs", adminHandler.ListLoginLogs)
				adminRoutes.GET("/admin/risk-events", adminHandler.ListRiskEvents)
				adminRoutes.POST("/admin/risk-events/:id/resolve", adminHandler.ResolveRiskEvent)

				// 站点设置
				adminRoutes.GET("/admin/settings", adminHandler.GetSiteSettings)
				adminRoutes.PUT("/admin/settings", adminHandler.UpdateSiteSetting)
			}
		}

		// 公开路由
		public := api.Group("")
		{
			// 文章
			public.GET("/posts", postHandler.ListPosts)
			public.GET("/posts/:id", postHandler.GetPostBySlug)
			public.POST("/posts/:id/view", middleware.AuthLimiter(), postHandler.IncrementViewCount)

			// 评论（公开读取：优先使用自研原生评论，LiveComment 作为备用）
			public.GET("/posts/:id/comments", nativeCommentHandler.GetComments)
			public.GET("/posts/:id/comment-count", nativeCommentHandler.GetCommentCount)
			// 媒体库（需登录查看完整列表）
			public.GET("/media", mediaHandler.List)
			public.GET("/media/:id", mediaHandler.Get)

			// 上传（需登录）
			upload := api.Group("/media")
			upload.Use(middleware.AuthWithRedis(cfg, utils.GetRedisClient(), config.GetDB()))
			{
				upload.POST("/upload", mediaHandler.Upload)
				upload.DELETE("/:id", mediaHandler.Delete)
			}

			// 分析接口
			public.GET("/analytics/summary", analyticsHandler.GetSummary)
			public.GET("/analytics/top-posts", analyticsHandler.GetTopPosts)
			public.GET("/analytics/traffic", analyticsHandler.GetTrafficTrend)
			public.POST("/analytics/event", middleware.AuthLimiter(), analyticsHandler.RecordEvent)

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

			// 分类（公开）
			public.GET("/categories", categoryHandler.ListCategories)
			public.GET("/categories/tree", categoryHandler.GetCategoryTree)
			public.GET("/categories/:slug", categoryHandler.GetCategoryBySlug)

			// 标签（公开）
			public.GET("/tags", tagHandler.ListTags)
			public.GET("/tags/:slug", tagHandler.GetTagBySlug)

			// 友链（公开）
			public.GET("/friend-links", friendLinkHandler.ListFriendLinks)
			public.GET("/friend-links/:id", friendLinkHandler.GetFriendLink)

			// AI 新闻（公开）
			public.GET("/ai-news", newsHandler.List)
			public.GET("/ai-news/categories", newsHandler.GetCategories)
			public.GET("/ai-news/:slug", newsHandler.GetBySlug)

			// 实验室（公开）
			public.GET("/ai-tools", toolHandler.List)
			public.GET("/ai-tools/categories", toolHandler.GetCategories)
		}
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		db := config.GetDB()
		dbStatus := "healthy"
		if sqlDB, err := db.DB(); err != nil {
			dbStatus = "error: " + err.Error()
		} else if err := sqlDB.Ping(); err != nil {
			dbStatus = "error: " + err.Error()
		}

		redisStatus := "not configured"
		rdb := utils.GetRedisClient()
		if rdb != nil {
			if _, err := rdb.Ping(context.Background()).Result(); err != nil {
				redisStatus = "error: " + err.Error()
			} else {
				redisStatus = "healthy"
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"version":   "1.0.0",
			"timestamp": fmt.Sprintf("%v", time.Now()),
			"checks": gin.H{
				"database": dbStatus,
				"redis":    redisStatus,
			},
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

	// 启动定时发布检查器（每分钟检查一次）
	schedCtx, schedCancel := context.WithCancel(context.Background())
	defer schedCancel()
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		if count, err := postService.PublishScheduled(); err == nil && count > 0 {
			utils.Logger.Info("Scheduled posts published on startup", zap.Int64("count", count))
		}
		for {
			select {
			case <-ticker.C:
				if count, err := postService.PublishScheduled(); err != nil {
					utils.Logger.Warn("Scheduled publish check failed", zap.Error(err))
				} else if count > 0 {
					utils.Logger.Info("Scheduled posts published", zap.Int64("count", count))
				}
			case <-schedCtx.Done():
				utils.Logger.Info("Scheduled publish checker stopped")
				return
			}
		}
	}()

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
