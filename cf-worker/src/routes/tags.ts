import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

type Variables = AuthVariables;
const tags = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── GET /tags — 标签列表 ─────────────────────────────────────────────

tags.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM tags ORDER BY name ASC"
  ).all<Record<string, unknown>>();

  return c.json({ tags: rows.results });
});

// ── GET /tags/:slug — 标签详情 ───────────────────────────────────────

tags.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const row = await c.env.DB.prepare(
    "SELECT * FROM tags WHERE slug = ?"
  )
    .bind(slug)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: "Tag not found" }, 404);
  }

  return c.json(row);
});

// ── POST /tags — 创建标签 ────────────────────────────────────────────

tags.post("/", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const body = await c.req.json();
  const now = nowISO();
  const id = generateUUID();

  if (!body.slug || !body.name) {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  // Validate color format if provided
  if (body.color && !/^#[0-9a-fA-F]{3,8}$/.test(body.color)) {
    return c.json({ error: "Invalid color format" }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO tags (id, slug, name, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, body.slug, body.name, body.color || "", now, now)
    .run();

  const created = await c.env.DB.prepare("SELECT * FROM tags WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(created!, 201);
});

// ── PUT /tags/:id — 更新标签 ─────────────────────────────────────────

tags.put("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT * FROM tags WHERE id = ?"
  )
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return c.json({ error: "Tag not found" }, 404);
  }

  // Validate color format if provided
  if (body.color && !/^#[0-9a-fA-F]{3,8}$/.test(body.color)) {
    return c.json({ error: "Invalid color format" }, 400);
  }

  const now = nowISO();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.slug !== undefined) {
    updates.push("slug = ?");
    params.push(body.slug);
  }
  if (body.name !== undefined) {
    updates.push("name = ?");
    params.push(body.name);
  }
  if (body.color !== undefined) {
    updates.push("color = ?");
    params.push(body.color);
  }

  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE tags SET ${updates.join(", ")} WHERE id = ?`
  )
    .bind(...params)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM tags WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(updated!);
});

// ── DELETE /tags/:id — 删除标签 ──────────────────────────────────────

tags.delete("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");

  const result = await c.env.DB.prepare(
    "DELETE FROM tags WHERE id = ?"
  )
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Tag not found" }, 404);
  }

  return c.json({ message: "Tag deleted successfully" });
});

export default tags;
