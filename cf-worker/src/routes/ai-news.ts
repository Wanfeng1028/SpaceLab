import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

type Variables = AuthVariables;
const aiNews = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── helpers ──────────────────────────────────────────────────────────

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function serializeNews(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    tags: parseJSON<string[]>(row.tags as string, []),
  };
}

// ── GET /ai-news — 新闻列表 ──────────────────────────────────────────

aiNews.get("/", async (c) => {
  const url = new URL(c.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") || "20") || 20));
  const status = url.searchParams.get("status") || "";
  const category = url.searchParams.get("category") || "";

  let whereClauses: string[] = [];
  let params: unknown[] = [];

  if (status) {
    whereClauses.push("status = ?");
    params.push(status);
  }
  if (category) {
    whereClauses.push("category = ?");
    params.push(category);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM ai_news ${whereStr}`
  )
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const offset = (page - 1) * pageSize;
  const rows = await c.env.DB.prepare(
    `SELECT * FROM ai_news ${whereStr} ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, pageSize, offset)
    .all<Record<string, unknown>>();

  return c.json({
    news: rows.results.map(serializeNews),
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  });
});

// ── GET /ai-news/categories — 新闻分类列表 ───────────────────────────
// NOTE: Must be registered BEFORE /:slug

aiNews.get("/categories", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT DISTINCT category FROM ai_news WHERE category != '' AND category IS NOT NULL ORDER BY category ASC"
  ).all<{ category: string }>();

  return c.json({
    categories: rows.results.map((r) => r.category),
  });
});

// ── GET /ai-news/:slug — 新闻详情 ────────────────────────────────────

aiNews.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const row = await c.env.DB.prepare(
    "SELECT * FROM ai_news WHERE slug = ?"
  )
    .bind(slug)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: "News not found" }, 404);
  }

  return c.json(serializeNews(row));
});

// ── POST /ai-news — 创建新闻 ─────────────────────────────────────────

aiNews.post("/", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const body = await c.req.json();
  const now = nowISO();
  const id = generateUUID();

  const tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : "[]";
  const status = body.status === "published" ? "published" : (body.status || "draft");
  const publishedAt = status === "published" ? now : null;

  await c.env.DB.prepare(
    `INSERT INTO ai_news (id, slug, title, summary, content, source_name, source_url, category, tags, image_url, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.slug || "",
      body.title || "",
      body.summary || "",
      body.content || "",
      body.source_name || "",
      body.source_url || "",
      body.category || "",
      tags,
      body.image_url || "",
      status,
      publishedAt,
      now,
      now
    )
    .run();

  const created = await c.env.DB.prepare("SELECT * FROM ai_news WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(serializeNews(created!), 201);
});

// ── PUT /ai-news/:id — 更新新闻 ──────────────────────────────────────

aiNews.put("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT * FROM ai_news WHERE id = ?"
  )
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return c.json({ error: "News not found" }, 404);
  }

  const now = nowISO();
  const updates: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    title: "title",
    summary: "summary",
    content: "content",
    source_name: "source_name",
    source_url: "source_url",
    category: "category",
    image_url: "image_url",
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

  // If status changed to published and no published_at yet
  if (body.status === "published" && !existing.published_at) {
    updates.push("published_at = ?");
    params.push(now);
  }

  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE ai_news SET ${updates.join(", ")} WHERE id = ?`
  )
    .bind(...params)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM ai_news WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(serializeNews(updated!));
});

// ── DELETE /ai-news/:id — 删除新闻 ───────────────────────────────────

aiNews.delete("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");

  const result = await c.env.DB.prepare(
    "DELETE FROM ai_news WHERE id = ?"
  )
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "News not found" }, 404);
  }

  return c.json({ message: "News deleted" });
});

export default aiNews;
