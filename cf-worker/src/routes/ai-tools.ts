import { Hono } from "hono";

const aiTools = new Hono<{ Bindings: Env }>();

// ── helpers ──────────────────────────────────────────────────────────

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function serializeTool(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    tags: parseJSON<string[]>(row.tags as string, []),
  };
}

// ── GET /ai-tools — 工具列表 ─────────────────────────────────────────

aiTools.get("/", async (c) => {
  const url = new URL(c.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") || "20") || 20));
  const category = url.searchParams.get("category") || "";
  const search = url.searchParams.get("search") || "";

  let whereClauses: string[] = [];
  let params: unknown[] = [];

  if (category && category !== "all") {
    whereClauses.push("category = ?");
    params.push(category);
  }
  if (search) {
    whereClauses.push("(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(source) LIKE ?)");
    const like = `%${search.toLowerCase()}%`;
    params.push(like, like, like);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM ai_tools ${whereStr}`
  )
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const offset = (page - 1) * pageSize;
  const rows = await c.env.DB.prepare(
    `SELECT * FROM ai_tools ${whereStr} ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, pageSize, offset)
    .all<Record<string, unknown>>();

  return c.json({
    tools: rows.results.map(serializeTool),
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  });
});

// ── GET /ai-tools/categories — 工具分类列表 ──────────────────────────

aiTools.get("/categories", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT DISTINCT category FROM ai_tools WHERE category != '' AND category IS NOT NULL ORDER BY category ASC"
  ).all<{ category: string }>();

  return c.json({
    categories: rows.results.map((r) => r.category),
  });
});

export default aiTools;
