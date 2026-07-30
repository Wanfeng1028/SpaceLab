import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { securityHeaders } from "./middleware/security";
import { authRoutes } from "./routes/auth";
import posts from "./routes/posts";
import projects from "./routes/projects";
import categories from "./routes/categories";
import tags from "./routes/tags";
import friendLinks from "./routes/friend-links";
import aiNews from "./routes/ai-news";
import aiTools from "./routes/ai-tools";
import { commentRoutes } from "./routes/comments";
import { adminCommentRoutes } from "./routes/admin-comments";
import { mediaRoutes } from "./routes/media";
import { adminRoutes } from "./routes/admin";
import { analyticsRoutes } from "./routes/analytics";
import { captchaRoutes } from "./routes/captcha";
import feed from "./routes/feed";
import { runScheduledPublish } from "./cron/scheduled-publish";
import { runCleanupUsers } from "./cron/cleanup-users";
import { runSyncAiNews } from "./cron/sync-ai-news";
import { runSyncLabTools } from "./cron/sync-lab-tools";
import { runSyncGithubProjects } from "./cron/sync-github-projects";
import { runDailyStats } from "./cron/daily-stats";

const app = new Hono<{ Bindings: Env }>();

// ─── 请求日志中间件 ──────────────────────────────────────────────
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(
    `[${c.req.method}] ${c.req.path} → ${c.res.status} (${ms}ms)`
  );
});

// ─── 全局中间件 ──────────────────────────────────────────────────
app.use("*", corsMiddleware());
app.use("*", securityHeaders());

// ─── 健康检查 ────────────────────────────────────────────────────
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || "development",
  });
});

// ─── API v1 路由挂载 ─────────────────────────────────────────────────
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/posts", posts);
app.route("/api/v1/projects", projects);
app.route("/api/v1/categories", categories);
app.route("/api/v1/tags", tags);
app.route("/api/v1/friend-links", friendLinks);
app.route("/api/v1/ai-news", aiNews);
app.route("/api/v1/ai-tools", aiTools);
app.route("/api/v1", commentRoutes);
app.route("/api/v1/admin", adminCommentRoutes);
app.route("/api/v1/media", mediaRoutes);
app.route("/api/v1/admin", adminRoutes);
app.route("/api/v1/analytics", analyticsRoutes);
app.route("/captcha", captchaRoutes);

// ─── RSS Feed 路由 ───────────────────────────────────────────────
app.route("/feed", feed);
app.get("/feed.xml", (c) => {
  // 重定向 /feed.xml 到 /feed
  return c.redirect("/feed");
});

// ─── 404 处理 ────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ error: "Not Found", message: "Resource not found" }, 404);
});

// ─── 全局错误处理 ────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message:
        c.env.ENVIRONMENT === "production"
          ? "An unexpected error occurred"
          : err.message,
    },
    500
  );
});

// ─── Cron Trigger 入口 ───────────────────────────────────────────
export default {
  fetch: app.fetch,
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) {
    console.log(`Cron triggered: ${controller.cron}`);

    switch (controller.cron) {
      // 每分钟：定时发布
      case "* * * * *":
        ctx.waitUntil(runScheduledPublish(env));
        break;

      // 每日凌晨 3 点：清理未验证用户
      case "0 3 * * *":
        ctx.waitUntil(runCleanupUsers(env));
        break;

      // 每 2 小时（:17）：AI 新闻同步
      case "17 */2 * * *":
        ctx.waitUntil(runSyncAiNews(env));
        break;

      // 每 2 小时（:21）：AI 工具同步
      case "21 */2 * * *":
        ctx.waitUntil(runSyncLabTools(env));
        break;

      // 每日 18:23 UTC：GitHub 项目同步
      case "23 18 * * *":
        ctx.waitUntil(runSyncGithubProjects(env));
        break;

      // 每日 0 点：每日统计
      case "0 0 * * *":
        ctx.waitUntil(runDailyStats(env));
        break;

      default:
        console.log(`Unknown cron expression: ${controller.cron}`);
    }
  },
};

export type AppType = typeof app;
