/**
 * 评论路由 — 对齐 Go 版 handler/comment/native_comment.go
 */
import { Hono } from "hono";
import type { AuthVariables } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import * as commentService from "../services/comment.service";

type AppContext = { Bindings: Env; Variables: AuthVariables };

const commentsRouter = new Hono<AppContext>();

/** 获取客户端 IP */
function getClientIP(c: any): string {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** 统一错误处理 */
function handleError(c: any, err: unknown) {
  if (err && typeof err === "object" && "status" in err && "message" in err) {
    const e = err as { status: number; message: string };
    return c.json({ error: e.message }, e.status);
  }
  console.error("Unexpected error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
}

// ── 公开路由 ──────────────────────────────────────────────────────

/**
 * GET /posts/:id/comments — 获取评论列表
 * Go 版返回: { comments: [...], total: number }
 */
commentsRouter.get("/posts/:id/comments", async (c) => {
  const contentId = c.req.param("id");
  const page = parseInt(c.req.query("page") || "1", 10);
  const pageSize = parseInt(c.req.query("page_size") || "20", 10);

  try {
    const result = await commentService.getComments(
      c.env,
      contentId,
      "post",
      page,
      pageSize
    );
    return c.json({
      comments: result.comments,
      total: result.total,
    });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * GET /posts/:id/comment-count — 获取评论数
 */
commentsRouter.get("/posts/:id/comment-count", async (c) => {
  const contentId = c.req.param("id");

  try {
    const count = await commentService.getCommentCount(c.env, contentId, "post");
    return c.json({ count });
  } catch (err) {
    return handleError(c, err);
  }
});

// ── 需要认证的路由 ────────────────────────────────────────────────

/**
 * POST /posts/:id/comments — 创建评论（文章路径）
 * Go 版直接返回 comment 对象 (201)
 */
commentsRouter.post("/posts/:id/comments", authMiddleware, async (c) => {
  const contentId = c.req.param("id");
  const userId = c.get("userId");

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (!body.content || !body.content.trim()) {
    return c.json({ error: "comment content is required" }, 400);
  }

  try {
    const comment = await commentService.createComment(c.env, userId, {
      contentId,
      contentType: "post",
      content: body.content,
      parentId: body.parent_id,
      ip: getClientIP(c),
      turnstileToken: body.turnstile_token,
      country: c.req.header("CF-IPCountry"),
      city: c.req.header("CF-IPCity"),
    });
    return c.json(comment, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * POST /comments — 创建评论（兼容路径）
 */
commentsRouter.post("/comments", authMiddleware, async (c) => {
  const userId = c.get("userId");

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (!body.content_id || !body.content || !body.content.trim()) {
    return c.json({ error: "content_id and content are required" }, 400);
  }

  try {
    const comment = await commentService.createComment(c.env, userId, {
      contentId: body.content_id,
      contentType: body.content_type || "post",
      content: body.content,
      parentId: body.parent_id,
      ip: getClientIP(c),
      turnstileToken: body.turnstile_token,
      country: c.req.header("CF-IPCountry"),
      city: c.req.header("CF-IPCity"),
    });
    return c.json(comment, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * PUT /comments/:id — 更新评论
 * Go 版直接返回 comment 对象
 */
commentsRouter.put("/comments/:id", authMiddleware, async (c) => {
  const commentId = c.req.param("id");
  const userId = c.get("userId");

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (!body.content || !body.content.trim()) {
    return c.json({ error: "comment content is required" }, 400);
  }

  try {
    const comment = await commentService.updateComment(
      c.env,
      userId,
      commentId,
      body.content
    );
    return c.json(comment);
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * DELETE /comments/:id — 删除评论
 */
commentsRouter.delete("/comments/:id", authMiddleware, async (c) => {
  const commentId = c.req.param("id");
  const userId = c.get("userId");
  const role = c.get("role");

  try {
    await commentService.deleteComment(c.env, userId, commentId, role);
    return c.json({ message: "Comment deleted" });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * POST /comments/:id/report — 举报评论
 */
commentsRouter.post("/comments/:id/report", authMiddleware, async (c) => {
  const commentId = c.req.param("id");
  const userId = c.get("userId");

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (!body.reason) {
    return c.json({ error: "reason is required" }, 400);
  }

  try {
    await commentService.reportComment(
      c.env,
      userId,
      commentId,
      body.reason,
      body.description || ""
    );
    return c.json({ message: "Report submitted" });
  } catch (err) {
    return handleError(c, err);
  }
});

export { commentsRouter as commentRoutes };
