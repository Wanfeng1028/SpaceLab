/**
 * 点赞路由 — 对齐 Go 版 handler/like/like.go
 * POST /posts/:id/like        切换点赞（需登录）
 * GET  /posts/:id/like-status 查询当前用户点赞状态 + 总点赞数（需登录）
 */
import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { generalRateLimit } from "../middleware/rate-limit";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

type AppContext = { Bindings: Env; Variables: AuthVariables };

const likesRouter = new Hono<AppContext>();

/** 统计目标点赞数（以 likes 表为准） */
async function getLikeCount(
  env: Env,
  targetType: string,
  targetId: string
): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND target_id = ?"
  )
    .bind(targetType, targetId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

// ── POST /posts/:id/like — 切换点赞 ──────────────────────────────────
likesRouter.post("/posts/:id/like", generalRateLimit, authMiddleware, async (c) => {
  const postId = c.req.param("id");
  const userId = c.get("userId");

  // 校验文章存在
  const post = await c.env.DB.prepare(
    "SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(postId)
    .first<{ id: string }>();
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM likes WHERE target_type = 'post' AND target_id = ? AND user_id = ?"
  )
    .bind(postId, userId)
    .first<{ id: string }>();

  let liked: boolean;
  if (existing) {
    // 已点赞 → 取消
    await c.env.DB.prepare("DELETE FROM likes WHERE id = ?").bind(existing.id).run();
    await c.env.DB.prepare(
      "UPDATE posts SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE id = ?"
    )
      .bind(postId)
      .run();
    liked = false;
  } else {
    // 未点赞 → 点赞
    await c.env.DB.prepare(
      "INSERT INTO likes (id, target_type, target_id, user_id, created_at) VALUES (?, 'post', ?, ?, ?)"
    )
      .bind(generateUUID(), postId, userId, nowISO())
      .run();
    await c.env.DB.prepare(
      "UPDATE posts SET like_count = like_count + 1 WHERE id = ?"
    )
      .bind(postId)
      .run();
    liked = true;
  }

  const count = await getLikeCount(c.env, "post", postId);
  return c.json({ liked, like_count: count });
});

// ── GET /posts/:id/like-status — 查询点赞状态 ────────────────────────
likesRouter.get("/posts/:id/like-status", authMiddleware, async (c) => {
  const postId = c.req.param("id");
  const userId = c.get("userId");

  const existing = await c.env.DB.prepare(
    "SELECT id FROM likes WHERE target_type = 'post' AND target_id = ? AND user_id = ?"
  )
    .bind(postId, userId)
    .first<{ id: string }>();

  const count = await getLikeCount(c.env, "post", postId);
  return c.json({ liked: !!existing, like_count: count });
});

export { likesRouter as likeRoutes };
