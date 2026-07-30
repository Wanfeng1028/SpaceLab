import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

type Variables = AuthVariables;
const friendLinks = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── GET /friend-links — 友链列表 ─────────────────────────────────────

friendLinks.get("/", async (c) => {
  const url = new URL(c.req.url);
  const status = url.searchParams.get("status") || "active";

  const validStatuses = ["active", "inactive", "pending", "all"];
  if (!validStatuses.includes(status)) {
    return c.json({ error: "Invalid status filter" }, 400);
  }

  let rows;
  if (status === "all") {
    rows = await c.env.DB.prepare(
      "SELECT * FROM friend_links ORDER BY sort_order ASC, created_at ASC"
    ).all<Record<string, unknown>>();
  } else {
    rows = await c.env.DB.prepare(
      "SELECT * FROM friend_links WHERE status = ? ORDER BY sort_order ASC, created_at ASC"
    )
      .bind(status)
      .all<Record<string, unknown>>();
  }

  return c.json({ friend_links: rows.results });
});

// ── GET /friend-links/:id — 友链详情 ─────────────────────────────────

friendLinks.get("/:id", async (c) => {
  const id = c.req.param("id");

  const row = await c.env.DB.prepare(
    "SELECT * FROM friend_links WHERE id = ?"
  )
    .bind(id)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: "Friend link not found" }, 404);
  }

  return c.json(row);
});

// ── POST /friend-links — 创建友链 ────────────────────────────────────

friendLinks.post("/", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const body = await c.req.json();
  const now = nowISO();
  const id = generateUUID();

  if (!body.name || !body.url) {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  // Status whitelist
  const validStatuses = ["active", "inactive", "pending"];
  const status = body.status || "active";
  if (body.status && !validStatuses.includes(body.status)) {
    return c.json({ error: "Invalid status value" }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO friend_links (id, name, url, logo_url, description, sort_order, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.name,
      body.url,
      body.logo_url || "",
      body.description || "",
      body.sort_order || 0,
      status,
      now,
      now
    )
    .run();

  const created = await c.env.DB.prepare("SELECT * FROM friend_links WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(created!, 201);
});

// ── PUT /friend-links/:id — 更新友链 ─────────────────────────────────

friendLinks.put("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT * FROM friend_links WHERE id = ?"
  )
    .bind(id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return c.json({ error: "Friend link not found" }, 404);
  }

  // Validate status if provided
  if (body.status && !["active", "inactive", "pending"].includes(body.status)) {
    return c.json({ error: "Invalid status value" }, 400);
  }

  const now = nowISO();
  const updates: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    name: "name",
    url: "url",
    logo_url: "logo_url",
    description: "description",
    sort_order: "sort_order",
    status: "status",
  };

  for (const [jsonKey, dbCol] of Object.entries(fieldMap)) {
    if (body[jsonKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[jsonKey]);
    }
  }

  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE friend_links SET ${updates.join(", ")} WHERE id = ?`
  )
    .bind(...params)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM friend_links WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return c.json(updated!);
});

// ── DELETE /friend-links/:id — 删除友链 ──────────────────────────────

friendLinks.delete("/:id", authMiddleware, requireRole("admin", "writer"), async (c) => {
  const id = c.req.param("id");

  const result = await c.env.DB.prepare(
    "DELETE FROM friend_links WHERE id = ?"
  )
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Friend link not found" }, 404);
  }

  return c.json({ message: "Friend link deleted successfully" });
});

export default friendLinks;
