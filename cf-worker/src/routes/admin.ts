/**
 * 管理后台路由 — 对齐 Go 版 handler/admin/admin.go
 */
import { Hono } from "hono";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import {
  users,
  posts,
  comments,
  projects,
  loginLogs,
  riskEvents,
  siteSettings,
  aiNews,
  aiTools,
} from "../db/schema";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";
import { error } from "../utils/response";
import { logAudit } from "../services/audit.service";
import { hashPassword } from "../utils/password";
import { validatePasswordStrength } from "../services/auth.service";
import { getClientIP } from "../middleware/rate-limit";

type Variables = AuthVariables;
const admin = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── 公共中间件：所有 admin 路由需要认证 + admin 角色 ──────────────────
admin.use("*", authMiddleware);
admin.use("*", requireRole("admin"));

// ── helpers ──────────────────────────────────────────────────────────────

function getDB(env: Env) {
  return drizzle(env.DB);
}

function getClientInfo(c: { req: { header: (name: string) => string | undefined } }) {
  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown";
  const ua = c.req.header("User-Agent") ?? "";
  return { ip, ua };
}

// ── 用户管理 ─────────────────────────────────────────────────────────────

/** GET /users — 用户列表（分页） */
admin.get("/users", async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query("page_size") || "20", 10) || 20));
  const offset = (page - 1) * pageSize;

  const db = getDB(c.env);

  const totalResult = await db.select({ count: count() }).from(users);
  const total = totalResult[0]?.count ?? 0;

  const rows = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(offset);

  const userInfos = rows.map((u) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    status: u.status,
    avatar_url: u.avatarUrl || "",
    email_verified_at: u.emailVerifiedAt || null,
    last_login_at: u.lastLoginAt || null,
    last_login_ip: u.lastLoginIp || "",
    login_fail_count: u.loginFailCount,
    locked_until: u.lockedUntil || null,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  }));

  return c.json({
    users: userInfos,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  });
});

/** GET /users/stats — 用户统计 */
admin.get("/users/stats", async (c) => {
  const db = getDB(c.env);

  const [totalRes, activeRes, bannedRes, lockedRes, pendingRes, recentRes] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(eq(users.status, "active")),
    db.select({ count: count() }).from(users).where(eq(users.status, "banned")),
    db.select({ count: count() }).from(users).where(eq(users.status, "locked")),
    db.select({ count: count() }).from(users).where(eq(users.status, "pending_verify")),
    db.select({ count: count() }).from(users).where(
      sql`${users.createdAt} > datetime('now', '-7 days')`
    ),
  ]);

  return c.json({
    total_users: totalRes[0]?.count ?? 0,
    active_users: activeRes[0]?.count ?? 0,
    banned_users: bannedRes[0]?.count ?? 0,
    locked_users: lockedRes[0]?.count ?? 0,
    pending_verify_users: pendingRes[0]?.count ?? 0,
    recent_users: recentRes[0]?.count ?? 0,
  });
});

/** GET /users/:id — 用户详情 */
admin.get("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const db = getDB(c.env);

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (result.length === 0) {
    return c.json(error("User not found"), 404);
  }

  const u = result[0];
  return c.json({
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    status: u.status,
    avatar_url: u.avatarUrl || "",
    email_verified_at: u.emailVerifiedAt || null,
    last_login_at: u.lastLoginAt || null,
    last_login_ip: u.lastLoginIp || "",
    login_fail_count: u.loginFailCount,
    locked_until: u.lockedUntil || null,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  });
});

/** GET /users/:id/risk-profile — 用户风控画像 */
admin.get("/users/:id/risk-profile", async (c) => {
  const userId = c.req.param("id");
  const db = getDB(c.env);

  const [recentLogs, unresolvedEvents, failCount7dRes] = await Promise.all([
    db
      .select()
      .from(loginLogs)
      .where(eq(loginLogs.userId, userId))
      .orderBy(desc(loginLogs.loginAt))
      .limit(10),
    db
      .select()
      .from(riskEvents)
      .where(and(eq(riskEvents.userId, userId), eq(riskEvents.resolved, false)))
      .orderBy(desc(riskEvents.createdAt))
      .limit(20),
    db
      .select({ count: count() })
      .from(loginLogs)
      .where(
        and(
          eq(loginLogs.userId, userId),
          eq(loginLogs.success, false),
          sql`${loginLogs.loginAt} > datetime('now', '-7 days')`
        )
      ),
  ]);

  return c.json({
    recent_logs: recentLogs,
    unresolved_events: unresolvedEvents,
    fail_count_7d: failCount7dRes[0]?.count ?? 0,
  });
});

/** PUT /users/:id/role — 修改角色 */
admin.put("/users/:id/role", async (c) => {
  const userId = c.req.param("id");
  const currentUserId = c.get("userId");

  if (userId === currentUserId) {
    return c.json(error("Cannot modify your own role"), 403);
  }

  const body = await c.req.json<{ role?: string }>();
  const validRoles = ["admin", "writer", "viewer"];
  if (!body.role || !validRoles.includes(body.role)) {
    return c.json(error("Invalid role. Must be admin, writer, or viewer"), 400);
  }

  const db = getDB(c.env);
  await db.update(users).set({ role: body.role, updatedAt: nowISO() }).where(eq(users.id, userId));

  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "update_role", "user", userId, { new_role: body.role }, ip, ua);

  return c.json({ message: "User role updated successfully" });
});

/** PUT /users/:id/status — 修改状态 */
admin.put("/users/:id/status", async (c) => {
  const userId = c.req.param("id");
  const currentUserId = c.get("userId");

  if (userId === currentUserId) {
    return c.json(error("Cannot modify your own status"), 403);
  }

  const body = await c.req.json<{ status?: string }>();
  if (!body.status || !["active", "banned"].includes(body.status)) {
    return c.json(error("Invalid status. Must be active or banned"), 400);
  }

  const db = getDB(c.env);
  await db.update(users).set({ status: body.status, updatedAt: nowISO() }).where(eq(users.id, userId));

  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "update_status", "user", userId, { new_status: body.status }, ip, ua);

  return c.json({ message: "User status updated successfully" });
});

/** DELETE /users/:id — 删除用户 */
admin.delete("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const currentUserId = c.get("userId");

  if (userId === currentUserId) {
    return c.json(error("Cannot delete your own account"), 403);
  }

  const db = getDB(c.env);
  await db.delete(users).where(eq(users.id, userId));

  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "delete", "user", userId, null, ip, ua);

  return c.json({ message: "User deleted successfully" });
});

/** POST /users/:id/reset-password — 重置密码 */
admin.post("/users/:id/reset-password", async (c) => {
  const userId = c.req.param("id");

  const body = await c.req.json<{ new_password?: string }>();
  if (!body.new_password || body.new_password.length < 8) {
    return c.json(error("Invalid request parameters"), 400);
  }

  const pwdErr = validatePasswordStrength(body.new_password);
  if (pwdErr) {
    return c.json(error(pwdErr), 400);
  }

  const passwordHash = await hashPassword(body.new_password, c.env.AUTH_MODE || "full");
  const db = getDB(c.env);
  await db.update(users).set({ passwordHash, updatedAt: nowISO() }).where(eq(users.id, userId));

  // 撤销该用户已有 token（加入黑名单）
  await c.env.TOKEN_BLACKLIST.put(`stamp:${userId}`, crypto.randomUUID());

  const currentUserId = c.get("userId");
  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "reset_password", "user", userId, null, ip, ua);

  return c.json({ message: "Password reset successfully" });
});

/** POST /users/:id/lock — 锁定用户 */
admin.post("/users/:id/lock", async (c) => {
  const userId = c.req.param("id");

  const body = await c.req.json<{ duration_minutes?: number }>();
  if (!body.duration_minutes || body.duration_minutes < 1) {
    return c.json(error("duration_minutes is required"), 400);
  }

  const lockedUntil = new Date(Date.now() + body.duration_minutes * 60_000).toISOString();
  const db = getDB(c.env);
  await db.update(users).set({ status: "locked", lockedUntil, updatedAt: nowISO() }).where(eq(users.id, userId));

  const currentUserId = c.get("userId");
  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "lock", "user", userId, { duration_minutes: body.duration_minutes }, ip, ua);

  return c.json({ message: "User locked successfully" });
});

/** POST /users/:id/unlock — 解锁用户 */
admin.post("/users/:id/unlock", async (c) => {
  const userId = c.req.param("id");
  const db = getDB(c.env);
  await db
    .update(users)
    .set({ status: "active", lockedUntil: "", loginFailCount: 0, updatedAt: nowISO() })
    .where(eq(users.id, userId));

  const currentUserId = c.get("userId");
  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "unlock", "user", userId, null, ip, ua);

  return c.json({ message: "User unlocked successfully" });
});

/** POST /users/:id/ban — 封禁用户 */
admin.post("/users/:id/ban", async (c) => {
  const userId = c.req.param("id");
  const currentUserId = c.get("userId");

  if (userId === currentUserId) {
    return c.json(error("Cannot ban yourself"), 403);
  }

  const db = getDB(c.env);
  await db.update(users).set({ status: "banned", updatedAt: nowISO() }).where(eq(users.id, userId));

  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "ban", "user", userId, null, ip, ua);

  return c.json({ message: "User banned successfully" });
});

/** POST /users/:id/unban — 解封用户 */
admin.post("/users/:id/unban", async (c) => {
  const userId = c.req.param("id");
  const db = getDB(c.env);
  await db.update(users).set({ status: "active", updatedAt: nowISO() }).where(eq(users.id, userId));

  const currentUserId = c.get("userId");
  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "unban", "user", userId, null, ip, ua);

  return c.json({ message: "User unbanned successfully" });
});

/** POST /cleanup-unverified-users — 手动清理未验证用户 */
admin.post("/cleanup-unverified-users", async (c) => {
  let days = 7;
  try {
    const body = await c.req.json<{ days?: number }>();
    if (body.days && body.days > 0) days = body.days;
  } catch {
    // optional body
  }

  const db = getDB(c.env);
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const result = await db
    .delete(users)
    .where(and(eq(users.status, "pending_verify"), sql`${users.createdAt} < ${cutoff}`));

  // D1 返回 changes 字段
  const deletedCount = (result as { meta?: { changes?: number } })?.meta?.changes ?? 0;

  const currentUserId = c.get("userId");
  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "cleanup_unverified_users", "system", "", { days, deleted_count: deletedCount }, ip, ua);

  return c.json({ message: "清理完成", deleted_count: deletedCount });
});

// ── 站点设置 ─────────────────────────────────────────────────────────────

/** GET /settings — 获取站点设置 */
admin.get("/settings", async (c) => {
  const db = getDB(c.env);
  const keys = ["registration_open", "comments_enabled", "comment_pre_moderate"];
  const defaults: Record<string, string> = {
    registration_open: "true",
    comments_enabled: "true",
    comment_pre_moderate: "false",
  };

  const rows = await db.select().from(siteSettings);
  const settings: Record<string, string> = {};
  const rowMap = new Map(rows.map((r) => [r.key, r.value]));

  for (const key of keys) {
    settings[key] = rowMap.get(key) ?? defaults[key];
  }

  return c.json({ settings });
});

/** PUT /settings — 更新站点设置 */
admin.put("/settings", async (c) => {
  const body = await c.req.json<{ key?: string; value?: string }>();
  if (!body.key || !body.value) {
    return c.json(error("Invalid request parameters"), 400);
  }

  const allowedKeys = ["registration_open", "comments_enabled", "comment_pre_moderate"];
  if (!allowedKeys.includes(body.key)) {
    return c.json(error("Invalid setting key"), 400);
  }

  if (!["true", "false", "0", "1"].includes(body.value)) {
    return c.json(error("Value must be true or false"), 400);
  }

  const db = getDB(c.env);
  const now = nowISO();

  // upsert
  const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, body.key)).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettings).set({ value: body.value, updatedAt: now }).where(eq(siteSettings.key, body.key));
  } else {
    await db.insert(siteSettings).values({ id: generateUUID(), key: body.key, value: body.value, updatedAt: now });
  }

  const currentUserId = c.get("userId");
  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "update_setting", "site_setting", body.key, { value: body.value }, ip, ua);

  return c.json({ message: "Setting updated successfully" });
});

// ── 风控与日志 ────────────────────────────────────────────────────────────

/** GET /login-logs — 登录日志（分页） */
admin.get("/login-logs", async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query("page_size") || "20", 10) || 20));
  const userId = c.req.query("user_id") || "";
  const offset = (page - 1) * pageSize;

  const db = getDB(c.env);

  let totalResult: { count: number }[];
  let rows: typeof loginLogs.$inferSelect[];

  if (userId) {
    totalResult = await db.select({ count: count() }).from(loginLogs).where(eq(loginLogs.userId, userId));
    rows = await db
      .select()
      .from(loginLogs)
      .where(eq(loginLogs.userId, userId))
      .orderBy(desc(loginLogs.loginAt))
      .limit(pageSize)
      .offset(offset);
  } else {
    totalResult = await db.select({ count: count() }).from(loginLogs);
    rows = await db.select().from(loginLogs).orderBy(desc(loginLogs.loginAt)).limit(pageSize).offset(offset);
  }

  const total = totalResult[0]?.count ?? 0;
  return c.json({
    logs: rows,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  });
});

/** GET /risk-events — 风险事件列表（分页） */
admin.get("/risk-events", async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query("page_size") || "20", 10) || 20));
  const userId = c.req.query("user_id") || "";
  const resolvedParam = c.req.query("resolved");
  const offset = (page - 1) * pageSize;

  const db = getDB(c.env);
  const conditions = [];

  if (userId) conditions.push(eq(riskEvents.userId, userId));
  if (resolvedParam === "true") conditions.push(eq(riskEvents.resolved, true));
  else if (resolvedParam === "false") conditions.push(eq(riskEvents.resolved, false));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalResult = await db.select({ count: count() }).from(riskEvents).where(whereClause);
  const total = totalResult[0]?.count ?? 0;

  const rows = await db
    .select()
    .from(riskEvents)
    .where(whereClause)
    .orderBy(desc(riskEvents.createdAt))
    .limit(pageSize)
    .offset(offset);

  return c.json({
    events: rows,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  });
});

/** POST /risk-events/:id/resolve — 标记风险已解决 */
admin.post("/risk-events/:id/resolve", async (c) => {
  const eventId = c.req.param("id");
  const db = getDB(c.env);
  await db.update(riskEvents).set({ resolved: true }).where(eq(riskEvents.id, eventId));

  const currentUserId = c.get("userId");
  const { ip, ua } = getClientInfo(c);
  await logAudit(c.env, currentUserId, c.get("email"), "resolve", "risk_event", eventId, null, ip, ua);

  return c.json({ message: "Risk event resolved successfully" });
});

// ── 综合统计 ─────────────────────────────────────────────────────────────

/** GET /stats/site — 驾驶舱综合统计 */
admin.get("/stats/site", async (c) => {
  // 尝试从 KV 缓存读取
  const cacheKey = "admin:stats:site";
  const cached = await c.env.CACHE.get(cacheKey, "json");
  if (cached) {
    return c.json(cached);
  }

  const db = getDB(c.env);

  const [
    totalPostsRes,
    publishedPostsRes,
    draftPostsRes,
    totalViewsRes,
    totalProjectsRes,
    totalCommentsRes,
    pendingCommentsRes,
    totalUsersRes,
    activeUsersRes,
    bannedUsersRes,
    recentUsersRes,
    totalAiNewsRes,
    totalAiToolsRes,
  ] = await Promise.all([
    db.select({ count: count() }).from(posts),
    db.select({ count: count() }).from(posts).where(eq(posts.status, "published")),
    db.select({ count: count() }).from(posts).where(eq(posts.status, "draft")),
    db.select({ total: sql<number>`COALESCE(SUM(${posts.viewCount}), 0)` }).from(posts),
    db.select({ count: count() }).from(projects),
    db.select({ count: count() }).from(comments),
    db.select({ count: count() }).from(comments).where(eq(comments.status, "pending")),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(eq(users.status, "active")),
    db.select({ count: count() }).from(users).where(eq(users.status, "banned")),
    db.select({ count: count() }).from(users).where(sql`${users.createdAt} > datetime('now', '-7 days')`),
    db.select({ count: count() }).from(aiNews),
    db.select({ count: count() }).from(aiTools),
  ]);

  const stats = {
    posts: {
      total: totalPostsRes[0]?.count ?? 0,
      published: publishedPostsRes[0]?.count ?? 0,
      drafts: draftPostsRes[0]?.count ?? 0,
      views: totalViewsRes[0]?.total ?? 0,
    },
    projects: totalProjectsRes[0]?.count ?? 0,
    comments: {
      total: totalCommentsRes[0]?.count ?? 0,
      pending: pendingCommentsRes[0]?.count ?? 0,
    },
    users: {
      total: totalUsersRes[0]?.count ?? 0,
      active: activeUsersRes[0]?.count ?? 0,
      banned: bannedUsersRes[0]?.count ?? 0,
      recent: recentUsersRes[0]?.count ?? 0,
    },
    ai_news: totalAiNewsRes[0]?.count ?? 0,
    ai_tools: totalAiToolsRes[0]?.count ?? 0,
  };

  // 缓存 10 分钟
  await c.env.CACHE.put(cacheKey, JSON.stringify(stats), { expirationTtl: 600 });

  return c.json(stats);
});

export { admin as adminRoutes };
