import { Hono } from "hono";
import { authMiddleware, optionalAuthMiddleware, type AuthVariables } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { generalRateLimit } from "../middleware/rate-limit";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

type Variables = AuthVariables;
const posts = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── helpers ──────────────────────────────────────────────────────────

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function calcReadingTime(content: string): number {
  if (!content) return 0;
  const len = [...content].length; // count unicode chars
  const mins = Math.ceil(len / 200);
  return mins < 1 ? 1 : mins;
}

function serializePost(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    tags: parseJSON<string[]>(row.tags as string, []),
  };
}

// ── GET /posts — 文章列表 ────────────────────────────────────────────

posts.get("/", optionalAuthMiddleware, async (c) => {
  const url = new URL(c.req.url);
  let page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
  let pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") || "10") || 10));
  const status = url.searchParams.get("status") || "";
  const language = url.searchParams.get("language") || "";
  const category = url.searchParams.get("category") || "";

  // Non-admin users can only see published posts
  const role = c.get("role") as string | undefined;
  let effectiveStatus = status;
  if (role !== "admin" && role !== "writer") {
    if (effectiveStatus && effectiveStatus !== "published") {
      return c.json({ error: "Access denied" }, 403);
    }
    effectiveStatus = "published";
  }

  // Build query
  let whereClauses: string[] = ["deleted_at IS NULL"];
  let params: unknown[] = [];

  if (effectiveStatus) {
    whereClauses.push("status = ?");
    params.push(effectiveStatus);
  }
  if (language) {
    whereClauses.push("language = ?");
    params.push(language);
  }
  if (category) {
    whereClauses.push("category = ?");
    params.push(category);
  }

  const whereStr = whereClauses.join(" AND ");

  // Count total
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM posts WHERE ${whereStr}`
  )
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  // Fetch page
  const offset = (page - 1) * pageSize;
  const rows = await c.env.DB.prepare(
    `SELECT * FROM posts WHERE ${whereStr} ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, pageSize, offset)
    .all<Record<string, unknown>>();

  const postsData = rows.results.map((row) => serializePost(row));

  return c.json({
    posts: postsData,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  });
});

// ── GET /posts/:slug — 文章详情 ──────────────────────────────────────

posts.get("/:slug", optionalAuthMiddleware, async (c) => {
  const slug = c.req.param("slug");

  const row = await c.env.DB.prepare(
    "SELECT * FROM posts WHERE slug = ? AND deleted_at IS NULL"
  )
    .bind(slug)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Draft/archived posts only visible to admin/writer/author
  if (row.status !== "published") {
    const role = c.get("role") as string | undefined;
    const userId = c.get("userId") as string | undefined;
    if (role !== "admin" && role !== "writer" && userId !== row.author_id) {
      return c.json({ error: "Post not found" }, 404);
    }
  }

  return c.json(serializePost(row));
});

// ── POST /posts/:id/view — 增加阅读量 ────────────────────────────────

posts.post("/:id/view", generalRateLimit, async (c) => {
  const id = c.req.param("id");

  // Atomic increment via D1 (SQLite write lock ensures correctness)
  const result = await c.env.DB.prepare(
    "UPDATE posts SET view_count = view_count + 1 WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Post not found" }, 404);
  }

  return c.json({ message: "View count incremented" });
});

// ── POST /posts — 创建文章 ───────────────────────────────────────────

posts.post("/", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const body = await c.req.json();
  const userId = c.get("userId");
  const now = nowISO();
  const id = generateUUID();

  if (!body.slug || !body.slug.trim()) {
    return c.json({ error: "slug is required" }, 400);
  }

  const tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : "[]";
  const content = body.content || "";
  const readingTime = body.reading_time || calcReadingTime(content);

  await c.env.DB.prepare(
    `INSERT INTO posts (id, slug, title, summary, content, cover_url, category, tags, reading_time, status, language, author_id, view_count, comments_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, 0, 1, ?, ?)`
  )
    .bind(
      id,
      body.slug || "",
      body.title || "",
      body.summary || "",
      content,
      body.cover_url || "",
      body.category || "",
      tags,
      readingTime,
      body.language || "zh-CN",
      userId,
      now,
      now
    )
    .run();

  const created = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(serializePost(created!), 201);
});

// ── PUT /posts/:id — 更新文章 ────────────────────────────────────────

posts.put("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  const now = nowISO();
  const updates: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    title: "title",
    summary: "summary",
    content: "content",
    cover_url: "cover_url",
    category: "category",
    language: "language",
    status: "status",
    slug: "slug",
  };

  for (const [jsonKey, dbCol] of Object.entries(fieldMap)) {
    if (body[jsonKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[jsonKey]);
    }
  }

  if (body.tags !== undefined) {
    updates.push("tags = ?");
    params.push(JSON.stringify(body.tags));
  }

  if (body.content !== undefined) {
    const rt = body.reading_time || calcReadingTime(body.content);
    updates.push("reading_time = ?");
    params.push(rt);
  } else if (body.reading_time !== undefined) {
    updates.push("reading_time = ?");
    params.push(body.reading_time);
  }

  // If status changed to published and no published_at yet
  if (body.status === "published" && !existing.published_at) {
    updates.push("published_at = ?");
    params.push(now);
  }

  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE posts SET ${updates.join(", ")} WHERE id = ?`
  )
    .bind(...params)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(serializePost(updated!));
});

// ── DELETE /posts/:id — 软删除文章 ───────────────────────────────────

posts.delete("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const now = nowISO();

  const result = await c.env.DB.prepare(
    "UPDATE posts SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(now, now, id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Post not found" }, 404);
  }

  return c.json({ message: "Post deleted successfully" });
});

// ── POST /posts/:id/publish — 发布文章 ───────────────────────────────

posts.post("/:id/publish", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const now = nowISO();

  const existing = await c.env.DB.prepare(
    "SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  const publishedAt = existing.published_at ? existing.published_at : now;

  await c.env.DB.prepare(
    "UPDATE posts SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?"
  )
    .bind(publishedAt, now, id)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(serializePost(updated!));
});

export default posts;
