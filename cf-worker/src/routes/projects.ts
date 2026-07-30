import { Hono } from "hono";
import { authMiddleware, optionalAuthMiddleware, type AuthVariables } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { generalRateLimit } from "../middleware/rate-limit";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

type Variables = AuthVariables;
const projects = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── helpers ──────────────────────────────────────────────────────────

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function serializeProject(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    tags: parseJSON<string[]>(row.tags as string, []),
    features: parseJSON<string[]>(row.features as string, []),
    technologies: parseJSON<string[]>(row.technologies as string, []),
  };
}

// ── GET /projects — 项目列表 ─────────────────────────────────────────

projects.get("/", async (c) => {
  const url = new URL(c.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") || "10") || 10));
  const status = url.searchParams.get("status") || "";
  const language = url.searchParams.get("language") || "";

  let whereClauses: string[] = ["deleted_at IS NULL"];
  let params: unknown[] = [];

  if (status) {
    whereClauses.push("status = ?");
    params.push(status);
  }
  if (language) {
    whereClauses.push("language = ?");
    params.push(language);
  }

  const whereStr = whereClauses.join(" AND ");

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM projects WHERE ${whereStr}`
  )
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const offset = (page - 1) * pageSize;
  const rows = await c.env.DB.prepare(
    `SELECT * FROM projects WHERE ${whereStr} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, pageSize, offset)
    .all<Record<string, unknown>>();

  const projectsData = await Promise.all(
    rows.results.map(async (row) => {
      const kvKey = `view:project:${row.id}`;
      const kvCount = await c.env.CACHE.get(kvKey, "json");
      const extraViews = typeof kvCount === "number" ? kvCount : 0;
      return serializeProject({
        ...row,
        view_count: (row.view_count as number) + extraViews,
      });
    })
  );

  return c.json({
    projects: projectsData,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  });
});

// ── GET /projects/:slug — 项目详情 ───────────────────────────────────

projects.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const row = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE slug = ? AND deleted_at IS NULL"
  )
    .bind(slug)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Merge KV view count
  const kvKey = `view:project:${row.id}`;
  const kvCount = await c.env.CACHE.get(kvKey, "json");
  const extraViews = typeof kvCount === "number" ? kvCount : 0;

  return c.json(serializeProject({ ...row, view_count: (row.view_count as number) + extraViews }));
});

// ── POST /projects/:id/view — 增加浏览数 ─────────────────────────────

projects.post("/:id/view", generalRateLimit, async (c) => {
  const id = c.req.param("id");

  const row = await c.env.DB.prepare(
    "SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(id)
    .first();

  if (!row) {
    return c.json({ error: "Project not found" }, 404);
  }

  const kvKey = `view:project:${id}`;
  const current = (await c.env.CACHE.get(kvKey, "json")) as number | null;
  const newCount = (typeof current === "number" ? current : 0) + 1;
  await c.env.CACHE.put(kvKey, JSON.stringify(newCount));

  return c.json({ message: "View count incremented" });
});

// ── POST /projects — 创建项目 ────────────────────────────────────────

projects.post("/", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const body = await c.req.json();
  const userId = c.get("userId");
  const now = nowISO();
  const id = generateUUID();

  if (!body.slug || !body.slug.trim()) {
    return c.json({ error: "slug is required" }, 400);
  }

  const tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : "[]";
  const features = Array.isArray(body.features) ? JSON.stringify(body.features) : "[]";
  const technologies = Array.isArray(body.technologies) ? JSON.stringify(body.technologies) : "[]";

  await c.env.DB.prepare(
    `INSERT INTO projects (id, slug, title, description, content, cover_url, website_url, github_url, language, tags, features, technologies, status, view_count, author_id, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.slug || "",
      body.title || "",
      body.description || "",
      body.content || "",
      body.cover_url || "",
      body.website_url || "",
      body.github_url || "",
      body.language || "",
      tags,
      features,
      technologies,
      userId,
      now,
      now,
      now
    )
    .run();

  const created = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(serializeProject(created!), 201);
});

// ── PUT /projects/:id — 更新项目 ─────────────────────────────────────

projects.put("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return c.json({ error: "Project not found" }, 404);
  }

  const now = nowISO();
  const updates: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    title: "title",
    description: "description",
    content: "content",
    cover_url: "cover_url",
    website_url: "website_url",
    github_url: "github_url",
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
  if (body.features !== undefined) {
    updates.push("features = ?");
    params.push(JSON.stringify(body.features));
  }
  if (body.technologies !== undefined) {
    updates.push("technologies = ?");
    params.push(JSON.stringify(body.technologies));
  }

  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE projects SET ${updates.join(", ")} WHERE id = ?`
  )
    .bind(...params)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(serializeProject(updated!));
});

// ── DELETE /projects/:id — 软删除项目 ────────────────────────────────

projects.delete("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const now = nowISO();

  const result = await c.env.DB.prepare(
    "UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(now, now, id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json({ message: "Project deleted successfully" });
});

export default projects;
