import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

type Variables = AuthVariables;
const categories = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── GET /categories — 分类列表 ───────────────────────────────────────

categories.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC"
  ).all<Record<string, unknown>>();

  return c.json({ categories: rows.results });
});

// ── GET /categories/tree — 分类树形结构 ──────────────────────────────
// NOTE: Must be registered BEFORE /:slug

categories.get("/tree", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC"
  ).all<Record<string, unknown>>();

  // Build tree: find roots (parent_id IS NULL)
  const roots = rows.results.filter((r) => !r.parent_id);

  return c.json({ categories: roots });
});

// ── GET /categories/:slug — 分类详情 ─────────────────────────────────

categories.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const row = await c.env.DB.prepare(
    "SELECT * FROM categories WHERE slug = ?"
  )
    .bind(slug)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: "Category not found" }, 404);
  }

  return c.json(row);
});

// ── POST /categories — 创建分类 ──────────────────────────────────────

categories.post("/", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const body = await c.req.json();
  const now = nowISO();
  const id = generateUUID();

  if (!body.slug || !body.name) {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  const parentId = body.parent_id || null;

  await c.env.DB.prepare(
    `INSERT INTO categories (id, slug, name, description, icon, sort_order, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.slug,
      body.name,
      body.description || "",
      body.icon || "",
      body.sort_order || 0,
      parentId,
      now,
      now
    )
    .run();

  const created = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(created!, 201);
});

// ── PUT /categories/:id — 更新分类 ───────────────────────────────────

categories.put("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT * FROM categories WHERE id = ?"
  )
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return c.json({ error: "Category not found" }, 404);
  }

  const now = nowISO();
  const updates: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    slug: "slug",
    name: "name",
    description: "description",
    icon: "icon",
    sort_order: "sort_order",
  };

  for (const [jsonKey, dbCol] of Object.entries(fieldMap)) {
    if (body[jsonKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[jsonKey]);
    }
  }

  if (body.parent_id !== undefined) {
    updates.push("parent_id = ?");
    params.push(body.parent_id || null);
  }

  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE categories SET ${updates.join(", ")} WHERE id = ?`
  )
    .bind(...params)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(updated!);
});

// ── DELETE /categories/:id — 删除分类 ────────────────────────────────

categories.delete("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");

  const result = await c.env.DB.prepare(
    "DELETE FROM categories WHERE id = ?"
  )
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Category not found" }, 404);
  }

  return c.json({ message: "Category deleted successfully" });
});

export default categories;
