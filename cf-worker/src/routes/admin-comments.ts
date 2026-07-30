/**
 * 后台评论管理路由 — 对齐 Go 版 handler/comment/native_comment.go
 */
import { Hono } from "hono";
import type { AuthVariables } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import * as commentService from "../services/comment.service";

type AppContext = { Bindings: Env; Variables: AuthVariables };

const adminCommentsRouter = new Hono<AppContext>();

/** 统一错误处理 */
function handleError(c: any, err: unknown) {
  if (err && typeof err === "object" && "status" in err && "message" in err) {
    const e = err as { status: number; message: string };
    return c.json({ error: e.message }, e.status);
  }
  console.error("Unexpected error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
}

// ── 所有路由都需要认证 + admin 角色 ──────────────────────────────

adminCommentsRouter.use("*", authMiddleware, requireRole("admin"));

/**
 * GET /comments — 评论审核列表（支持 status? 过滤）
 * Go 版返回: { comments, total, page, page_size, total_pages }
 */
adminCommentsRouter.get("/comments", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const pageSize = parseInt(c.req.query("page_size") || "20", 10);
  const status = c.req.query("status");

  try {
    const result = await commentService.listComments(
      c.env,
      page,
      pageSize,
      status || undefined
    );
    return c.json({
      comments: result.comments,
      total: result.total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(result.total / pageSize),
    });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * POST /comments/:id/approve — 审核通过评论
 * Go 版: { message: "Comment approved" }
 */
adminCommentsRouter.post("/comments/:id/approve", async (c) => {
  const commentId = c.req.param("id");

  try {
    await commentService.approveComment(c.env, commentId);
    return c.json({ message: "Comment approved" });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * POST /comments/:id/reject — 审核拒绝评论
 * Go 版: { message: "Comment rejected" }
 */
adminCommentsRouter.post("/comments/:id/reject", async (c) => {
  const commentId = c.req.param("id");

  try {
    await commentService.rejectComment(c.env, commentId);
    return c.json({ message: "Comment rejected" });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * DELETE /comments/:id — 管理员删除评论
 */
adminCommentsRouter.delete("/comments/:id", async (c) => {
  const commentId = c.req.param("id");

  try {
    await commentService.adminDeleteComment(c.env, commentId);
    return c.json({ message: "Comment deleted successfully" });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * GET /comment-reports — 举报列表
 * Go 版: { reports, total, page, page_size }
 */
adminCommentsRouter.get("/comment-reports", async (c) => {
  const page = parseInt(c.req.query("page") || "1", 10);
  const pageSize = parseInt(c.req.query("page_size") || "20", 10);
  const status = c.req.query("status");

  try {
    const result = await commentService.listCommentReports(
      c.env,
      page,
      pageSize,
      status || undefined
    );
    return c.json({
      reports: result.reports,
      total: result.total,
      page,
      page_size: pageSize,
    });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * POST /comment-reports/:id/review — 审核举报
 */
adminCommentsRouter.post("/comment-reports/:id/review", async (c) => {
  const reportId = c.req.param("id");
  const userId = c.get("userId");

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  // dismiss: true = 驳回举报, false = 举报成立
  const dismiss = body.dismiss === true;

  try {
    await commentService.reviewCommentReport(c.env, reportId, userId, dismiss);
    return c.json({ message: "Report reviewed" });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * GET /sensitive-words — 敏感词列表
 * Go 版: { words: [...] }
 */
adminCommentsRouter.get("/sensitive-words", async (c) => {
  const category = c.req.query("category");

  try {
    const words = await commentService.getSensitiveWords(
      c.env,
      category || undefined
    );
    return c.json({ words });
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * POST /sensitive-words — 添加敏感词
 */
adminCommentsRouter.post("/sensitive-words", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (!body.word || !body.word.trim()) {
    return c.json({ error: "word is required" }, 400);
  }

  try {
    await commentService.addSensitiveWord(
      c.env,
      body.word,
      body.category || ""
    );
    return c.json({ message: "Sensitive word added" }, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * DELETE /sensitive-words/:id — 删除敏感词
 */
adminCommentsRouter.delete("/sensitive-words/:id", async (c) => {
  const id = c.req.param("id");

  try {
    await commentService.deleteSensitiveWord(c.env, id);
    return c.json({ message: "Sensitive word deleted" });
  } catch (err) {
    return handleError(c, err);
  }
});

export { adminCommentsRouter as adminCommentRoutes };
