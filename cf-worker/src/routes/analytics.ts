/**
 * 分析路由 — 对齐 Go 版 handler/analytics/analytics.go
 */
import { Hono } from "hono";
import { desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { generalRateLimit } from "../middleware/rate-limit";
import { analyticsEvents, posts } from "../db/schema";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";
import { error } from "../utils/response";

type Variables = Record<string, never>;
const analytics = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── helpers ──────────────────────────────────────────────────────────────

function getDB(env: Env) {
  return drizzle(env.DB);
}

/** 截断字符串 */
function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

/** 事件类型白名单 */
const VALID_EVENT_TYPES = new Set(["page_view", "click", "scroll", "share", "download", "search"]);

/** target_type 白名单 */
const VALID_TARGET_TYPES = new Set(["post", "project", "comment", "category", "tag"]);

// ── GET /summary — 访问统计概览 ───────────────────────────────────────────

analytics.get("/summary", async (c) => {
  const cacheKey = "analytics:summary";
  const cached = await c.env.CACHE.get(cacheKey, "json");
  if (cached) {
    return c.json(cached);
  }

  const db = getDB(c.env);

  const [totalViewsRes, todayViewsRes, weekViewsRes, monthViewsRes] = await Promise.all([
    db.select({ count: count() }).from(analyticsEvents).where(sql`${analyticsEvents.eventType} = 'page_view'`),
    db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(sql`${analyticsEvents.eventType} = 'page_view' AND ${analyticsEvents.createdAt} > datetime('now', '-1 day')`),
    db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(sql`${analyticsEvents.eventType} = 'page_view' AND ${analyticsEvents.createdAt} > datetime('now', '-7 days')`),
    db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(sql`${analyticsEvents.eventType} = 'page_view' AND ${analyticsEvents.createdAt} > datetime('now', '-30 days')`),
  ]);

  const data = {
    total_views: totalViewsRes[0]?.count ?? 0,
    today_views: todayViewsRes[0]?.count ?? 0,
    week_views: weekViewsRes[0]?.count ?? 0,
    month_views: monthViewsRes[0]?.count ?? 0,
    updated_at: nowISO(),
  };

  // 缓存 5 分钟
  await c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 300 });

  return c.json(data);
});

// ── GET /top-posts — 热门文章排行 ─────────────────────────────────────────

analytics.get("/top-posts", async (c) => {
  let limit = parseInt(c.req.query("limit") || "10", 10) || 10;
  if (limit < 1) limit = 10;
  if (limit > 50) limit = 50;

  const cacheKey = `analytics:top-posts:${limit}`;
  const cached = await c.env.CACHE.get(cacheKey, "json");
  if (cached) {
    return c.json(cached);
  }

  const db = getDB(c.env);
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      view_count: posts.viewCount,
    })
    .from(posts)
    .orderBy(desc(posts.viewCount))
    .limit(limit);

  // 缓存 15 分钟
  await c.env.CACHE.put(cacheKey, JSON.stringify(rows), { expirationTtl: 900 });

  return c.json(rows);
});

// ── GET /traffic — 流量趋势 ────────────────────────────────────────────────

analytics.get("/traffic", async (c) => {
  let days = parseInt(c.req.query("days") || "7", 10) || 7;
  if (days < 1) days = 7;
  if (days > 365) days = 365;

  const cacheKey = `analytics:traffic:${days}`;
  const cached = await c.env.CACHE.get(cacheKey, "json");
  if (cached) {
    return c.json(cached);
  }

  const db = getDB(c.env);

  // SQLite: DATE() 函数提取日期部分
  const rows = await db
    .select({
      date: sql<string>`DATE(${analyticsEvents.createdAt})`.as("date"),
      views: count().as("views"),
    })
    .from(analyticsEvents)
    .where(
      sql`${analyticsEvents.eventType} = 'page_view' AND ${analyticsEvents.createdAt} > datetime('now', '-${days} days')`
    )
    .groupBy(sql`DATE(${analyticsEvents.createdAt})`)
    .orderBy(sql`DATE(${analyticsEvents.createdAt}) ASC`);

  const data = { days, trend: rows };

  // 缓存 10 分钟
  await c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 600 });

  return c.json(data);
});

// ── POST /event — 记录分析事件 ────────────────────────────────────────────

analytics.post("/event", generalRateLimit, async (c) => {
  const body = await c.req.json<{
    event_type?: string;
    page_path?: string;
    page_title?: string;
    target_id?: string;
    target_type?: string;
    referrer?: string;
    device_type?: string;
    browser?: string;
    language?: string;
    user_agent?: string;
    session_id?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }>();

  if (!body.event_type || !VALID_EVENT_TYPES.has(body.event_type)) {
    return c.json(error("Invalid event type"), 400);
  }

  // 清洗字段
  const pagePath = truncate((body.page_path || "").replace(/[<>]/g, ""), 500);
  const pageTitle = truncate((body.page_title || "").replace(/[<>]/g, ""), 500);
  const referrer = truncate(body.referrer || "", 500);
  const deviceType = truncate(body.device_type || "", 50);
  const browser = truncate(body.browser || "", 100);
  const language = truncate(body.language || "", 10);
  const userAgent = truncate(body.user_agent || "", 500);
  const sessionId = truncate(body.session_id || "", 100);
  const duration = typeof body.duration === "number" ? body.duration : 0;
  const metadata = body.metadata ? JSON.stringify(body.metadata) : "{}";

  // target_type 验证
  let targetType = body.target_type || "";
  if (targetType && !VALID_TARGET_TYPES.has(targetType)) {
    targetType = "";
  }

  // IP 和地理位置
  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "";
  const cfObj = (c.req as unknown as { cf?: { country?: string; city?: string } }).cf;
  const country = cfObj?.country ?? "";
  const city = cfObj?.city ?? "";

  const db = getDB(c.env);
  await db.insert(analyticsEvents).values({
    id: generateUUID(),
    eventType: body.event_type,
    pagePath,
    pageTitle,
    targetId: body.target_id || null,
    targetType,
    referrer,
    deviceType,
    browser,
    language,
    userAgent,
    ipAddress: ip,
    country,
    city,
    sessionId,
    duration,
    metadata,
    createdAt: nowISO(),
  });

  return c.json({ message: "Event recorded successfully" }, 201);
});

export { analytics as analyticsRoutes };
