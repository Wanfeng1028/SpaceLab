/**
 * 评论核心服务 — 对齐 Go 版 service/comment.go
 */
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import {
  users,
  posts,
  comments,
  siteSettings,
  commentReports,
  sensitiveWords,
} from "../db/schema";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";
import { sanitizeComment } from "../utils/sanitize";
import { globalSensitiveChecker } from "../utils/sensitive-word";

// ── 工具函数 ──────────────────────────────────────────────────────

function getDB(env: Env): DrizzleD1Database {
  return drizzle(env.DB);
}

/** Turnstile 验证 */
async function verifyTurnstile(
  env: Env,
  token: string | undefined
): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) return; // 未配置则跳过
  if (!token) {
    throw { status: 400, message: "turnstile token is required" };
  }

  const formData = new URLSearchParams();
  formData.append("secret", env.TURNSTILE_SECRET_KEY);
  formData.append("response", token);

  const resp = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: formData }
  );
  const result = await resp.json<{ success: boolean; "error-codes"?: string[] }>();
  if (!result.success) {
    throw { status: 400, message: "captcha verification failed" };
  }
}

/** 获取 IP 归属地（使用 CF 内置 geo headers） */
function getIPLocation(country?: string, city?: string): string {
  const parts: string[] = [];
  if (country) parts.push(country);
  if (city) parts.push(city);
  return parts.join(" ");
}

// ── 类型 ──────────────────────────────────────────────────────────

export interface CreateCommentInput {
  contentId: string;
  contentType: string;
  content: string;
  parentId?: string;
  ip: string;
  turnstileToken?: string;
  country?: string;
  city?: string;
}

export interface CommentWithUser {
  id: string;
  contentType: string;
  contentId: string;
  userId: string;
  parentId: string | null;
  content: string;
  status: string;
  ip: string;
  ipLocation: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  replies?: CommentWithUser[];
}

// ── 核心服务函数 ──────────────────────────────────────────────────

/**
 * 获取评论列表（已审核的，分页）
 */
export async function getComments(
  env: Env,
  contentId: string,
  contentType: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ comments: CommentWithUser[]; total: number }> {
  const db = getDB(env);

  if (page < 1) page = 1;
  if (pageSize < 1 || pageSize > 100) pageSize = 20;
  const offset = (page - 1) * pageSize;

  // 查询总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(
      and(
        eq(comments.contentId, contentId),
        eq(comments.contentType, contentType),
        eq(comments.status, "approved"),
        sql`${comments.deletedAt} IS NULL`
      )
    );
  const total = countResult[0]?.count || 0;

  // 查询评论（含用户信息）
  const commentRows = await db
    .select({
      id: comments.id,
      contentType: comments.contentType,
      contentId: comments.contentId,
      userId: comments.userId,
      parentId: comments.parentId,
      content: comments.content,
      status: comments.status,
      ip: comments.ip,
      ipLocation: comments.ipLocation,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(
      and(
        eq(comments.contentId, contentId),
        eq(comments.contentType, contentType),
        eq(comments.status, "approved"),
        sql`${comments.deletedAt} IS NULL`
      )
    )
    .orderBy(asc(comments.createdAt))
    .limit(pageSize)
    .offset(offset);

  // 组装结果
  const commentMap = new Map<string, CommentWithUser>();
  const topLevel: CommentWithUser[] = [];

  for (const row of commentRows) {
    const c: CommentWithUser = {
      id: row.id,
      contentType: row.contentType,
      contentId: row.contentId,
      userId: row.userId,
      parentId: row.parentId,
      content: row.content,
      status: row.status,
      ip: "", // 不暴露给前端
      ipLocation: row.ipLocation || "",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: {
        id: row.userId,
        username: row.username || "Unknown",
        avatarUrl: row.avatarUrl || "",
      },
      replies: [],
    };
    commentMap.set(c.id, c);
  }

  for (const c of commentMap.values()) {
    if (c.parentId && commentMap.has(c.parentId)) {
      commentMap.get(c.parentId)!.replies!.push(c);
    } else {
      topLevel.push(c);
    }
  }

  return { comments: topLevel, total };
}

/**
 * 获取评论数
 */
export async function getCommentCount(
  env: Env,
  contentId: string,
  contentType: string = "post"
): Promise<number> {
  const db = getDB(env);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(
      and(
        eq(comments.contentId, contentId),
        eq(comments.contentType, contentType),
        eq(comments.status, "approved"),
        sql`${comments.deletedAt} IS NULL`
      )
    );
  return result[0]?.count || 0;
}

/**
 * 创建评论
 */
export async function createComment(
  env: Env,
  userId: string,
  input: CreateCommentInput
): Promise<CommentWithUser> {
  const db = getDB(env);

  // 1. 检查用户邮箱是否已验证
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userResult.length === 0) {
    throw { status: 404, message: "user not found" };
  }
  const user = userResult[0];

  if (!user.emailVerifiedAt) {
    throw {
      status: 403,
      message: "email not verified, please verify your email before commenting",
    };
  }

  // 2. 检查全站评论开关
  const settingResult = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, "comments_enabled"))
    .limit(1);
  if (settingResult.length > 0) {
    const val = settingResult[0].value;
    if (val === "false" || val === "0") {
      throw { status: 403, message: "comments are currently disabled" };
    }
  }

  // 3. 检查单篇评论开关
  if (input.contentType === "post" || !input.contentType) {
    const postResult = await db
      .select()
      .from(posts)
      .where(eq(posts.id, input.contentId))
      .limit(1);
    if (postResult.length > 0 && !postResult[0].commentsEnabled) {
      throw { status: 403, message: "comments are disabled for this post" };
    }
  }

  // 4. Turnstile 验证
  await verifyTurnstile(env, input.turnstileToken);

  // 5. XSS 清洗
  const cleanedContent = sanitizeComment(input.content);
  if (!cleanedContent) {
    throw { status: 400, message: "comment content is empty after sanitization" };
  }

  // 6. 频率限制：3条/分钟, 20条/小时
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();

  const minuteCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(
      and(eq(comments.userId, userId), sql`${comments.createdAt} > ${oneMinuteAgo}`, sql`${comments.deletedAt} IS NULL`)
    );
  if ((minuteCount[0]?.count || 0) >= 3) {
    throw {
      status: 429,
      message: "comment rate limit exceeded, please wait before posting again",
    };
  }

  const hourCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(
      and(eq(comments.userId, userId), sql`${comments.createdAt} > ${oneHourAgo}`, sql`${comments.deletedAt} IS NULL`)
    );
  if ((hourCount[0]?.count || 0) >= 20) {
    throw { status: 429, message: "hourly comment limit exceeded" };
  }

  // 7. 敏感词检查
  let initialStatus = "pending";

  // 信任分级：累计通过审核 >= 3 条且账号正常的用户，新评论自动通过
  if ((user.commentApprovedCount || 0) >= 3 && user.status === "active") {
    initialStatus = "approved";
  }

  const [hitSensitive, sensitiveCategory] =
    await globalSensitiveChecker.checkWithCategory(env, cleanedContent);
  if (hitSensitive) {
    initialStatus = "pending"; // 命中敏感词，强制待审核
    console.log(
      `Comment hit sensitive word, category: ${sensitiveCategory}`
    );
  }

  // 8. IP 归属地
  const ipLocation = getIPLocation(input.country, input.city);

  // 9. 写入 comments 表
  const now = nowISO();
  const commentId = generateUUID();
  await db.insert(comments).values({
    id: commentId,
    contentType: input.contentType || "post",
    contentId: input.contentId,
    userId,
    parentId: input.parentId || null,
    content: cleanedContent,
    status: initialStatus,
    ip: input.ip,
    ipLocation,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: commentId,
    contentType: input.contentType || "post",
    contentId: input.contentId,
    userId,
    parentId: input.parentId || null,
    content: cleanedContent,
    status: initialStatus,
    ip: "",
    ipLocation,
    createdAt: now,
    updatedAt: now,
    user: {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl || "",
    },
    replies: [],
  };
}

/**
 * 更新评论（仅评论作者）
 */
export async function updateComment(
  env: Env,
  userId: string,
  commentId: string,
  content: string
): Promise<CommentWithUser> {
  const db = getDB(env);

  const result = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), sql`${comments.deletedAt} IS NULL`))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "comment not found" };
  }

  const comment = result[0];
  if (comment.userId !== userId) {
    throw { status: 403, message: "forbidden" };
  }

  const sanitized = sanitizeComment(content);
  if (!sanitized) {
    throw { status: 400, message: "comment content is empty after sanitization" };
  }

  const now = nowISO();

  // 编辑后重新检查敏感词，命中且当前为 approved 则重置为 pending
  const hitSensitive = await globalSensitiveChecker.check(env, sanitized);
  if (hitSensitive && comment.status === "approved") {
    await db
      .update(comments)
      .set({ content: sanitized, status: "pending", updatedAt: now })
      .where(eq(comments.id, commentId));
    return {
      id: comment.id,
      contentType: comment.contentType,
      contentId: comment.contentId,
      userId: comment.userId,
      parentId: comment.parentId,
      content: sanitized,
      status: "pending",
      ip: "",
      ipLocation: comment.ipLocation || "",
      createdAt: comment.createdAt,
      updatedAt: now,
    };
  }

  await db
    .update(comments)
    .set({ content: sanitized, updatedAt: now })
    .where(eq(comments.id, commentId));

  return {
    id: comment.id,
    contentType: comment.contentType,
    contentId: comment.contentId,
    userId: comment.userId,
    parentId: comment.parentId,
    content: sanitized,
    status: comment.status,
    ip: "",
    ipLocation: comment.ipLocation || "",
    createdAt: comment.createdAt,
    updatedAt: now,
  };
}

/**
 * 删除评论（评论作者或管理员）
 */
export async function deleteComment(
  env: Env,
  userId: string,
  commentId: string,
  userRole: string
): Promise<void> {
  const db = getDB(env);

  const result = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), sql`${comments.deletedAt} IS NULL`))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "comment not found" };
  }

  const comment = result[0];
  if (comment.userId !== userId && userRole !== "admin") {
    throw { status: 403, message: "forbidden" };
  }

  const now = nowISO();
  await db
    .update(comments)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(comments.id, commentId));
}

/**
 * 审核通过（管理员）+ 更新用户 comment_approved_count
 */
export async function approveComment(
  env: Env,
  commentId: string
): Promise<void> {
  const db = getDB(env);

  const result = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "comment not found" };
  }

  const comment = result[0];
  const now = nowISO();

  await db
    .update(comments)
    .set({ status: "approved", updatedAt: now })
    .where(eq(comments.id, commentId));

  // 信任分级：递增作者累计通过数
  await db
    .update(users)
    .set({
      commentApprovedCount: sql`${users.commentApprovedCount} + 1`,
    })
    .where(eq(users.id, comment.userId));
}

/**
 * 审核拒绝（管理员）
 */
export async function rejectComment(
  env: Env,
  commentId: string
): Promise<void> {
  const db = getDB(env);

  const result = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "comment not found" };
  }

  const now = nowISO();
  await db
    .update(comments)
    .set({ status: "rejected", updatedAt: now })
    .where(eq(comments.id, commentId));
}

/**
 * 举报评论（防重复举报）
 */
export async function reportComment(
  env: Env,
  userId: string,
  commentId: string,
  reason: string,
  description: string
): Promise<void> {
  const db = getDB(env);

  // 检查评论是否存在
  const commentResult = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), sql`${comments.deletedAt} IS NULL`))
    .limit(1);
  if (commentResult.length === 0) {
    throw { status: 404, message: "comment not found" };
  }

  // 防重复举报
  const existingReport = await db
    .select()
    .from(commentReports)
    .where(
      and(
        eq(commentReports.commentId, commentId),
        eq(commentReports.reporterId, userId),
        eq(commentReports.status, "pending")
      )
    )
    .limit(1);
  if (existingReport.length > 0) {
    throw { status: 409, message: "you have already reported this comment" };
  }

  const cleanedDesc = sanitizeComment(description);
  const now = nowISO();

  await db.insert(commentReports).values({
    id: generateUUID(),
    commentId,
    reporterId: userId,
    reason,
    description: cleanedDesc,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * 获取评论列表（后台管理用，支持状态过滤）
 */
export async function listComments(
  env: Env,
  page: number = 1,
  pageSize: number = 20,
  status?: string
): Promise<{ comments: CommentWithUser[]; total: number }> {
  const db = getDB(env);

  if (page < 1) page = 1;
  if (pageSize < 1 || pageSize > 100) pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions = [sql`${comments.deletedAt} IS NULL`];
  if (status) {
    conditions.push(eq(comments.status, status));
  }

  const whereClause = conditions.length === 1
    ? conditions[0]
    : and(...conditions);

  // 总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(whereClause);
  const total = countResult[0]?.count || 0;

  // 查询
  const commentRows = await db
    .select({
      id: comments.id,
      contentType: comments.contentType,
      contentId: comments.contentId,
      userId: comments.userId,
      parentId: comments.parentId,
      content: comments.content,
      status: comments.status,
      ip: comments.ip,
      ipLocation: comments.ipLocation,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(whereClause)
    .orderBy(desc(comments.createdAt))
    .limit(pageSize)
    .offset(offset);

  const commentList: CommentWithUser[] = commentRows.map((row) => ({
    id: row.id,
    contentType: row.contentType,
    contentId: row.contentId,
    userId: row.userId,
    parentId: row.parentId,
    content: row.content,
    status: row.status,
    ip: row.ip || "",
    ipLocation: row.ipLocation || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: {
      id: row.userId,
      username: row.username || "Unknown",
      avatarUrl: row.avatarUrl || "",
    },
    replies: [],
  }));

  return { comments: commentList, total };
}

/**
 * 管理员删除评论（硬删除）
 */
export async function adminDeleteComment(
  env: Env,
  commentId: string
): Promise<void> {
  const db = getDB(env);

  const result = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "comment not found" };
  }

  const now = nowISO();
  await db
    .update(comments)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(comments.id, commentId));
}

/**
 * 获取举报列表（管理员）
 */
export async function listCommentReports(
  env: Env,
  page: number = 1,
  pageSize: number = 20,
  status?: string
): Promise<{ reports: any[]; total: number }> {
  const db = getDB(env);

  if (page < 1) page = 1;
  if (pageSize < 1 || pageSize > 100) pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (status) {
    conditions.push(eq(commentReports.status, status));
  }

  const whereClause = conditions.length === 0
    ? undefined
    : conditions.length === 1
      ? conditions[0]
      : and(...conditions);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(commentReports)
    .where(whereClause);
  const total = countResult[0]?.count || 0;

  const reportRows = await db
    .select({
      id: commentReports.id,
      commentId: commentReports.commentId,
      reporterId: commentReports.reporterId,
      reason: commentReports.reason,
      description: commentReports.description,
      status: commentReports.status,
      reviewedBy: commentReports.reviewedBy,
      createdAt: commentReports.createdAt,
      updatedAt: commentReports.updatedAt,
      reporterName: users.username,
      commentContent: comments.content,
    })
    .from(commentReports)
    .leftJoin(users, eq(commentReports.reporterId, users.id))
    .leftJoin(comments, eq(commentReports.commentId, comments.id))
    .orderBy(desc(commentReports.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { reports: reportRows, total };
}

/**
 * 审核举报
 */
export async function reviewCommentReport(
  env: Env,
  reportId: string,
  reviewerId: string,
  dismiss: boolean
): Promise<void> {
  const db = getDB(env);

  const result = await db
    .select()
    .from(commentReports)
    .where(eq(commentReports.id, reportId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "report not found" };
  }

  const report = result[0];
  const newStatus = dismiss ? "dismissed" : "reviewed";
  const now = nowISO();

  await db
    .update(commentReports)
    .set({ status: newStatus, reviewedBy: reviewerId, updatedAt: now })
    .where(eq(commentReports.id, reportId));

  // 如果举报成立（非 dismiss），自动将评论标记为待审核
  if (!dismiss) {
    await db
      .update(comments)
      .set({ status: "pending", updatedAt: now })
      .where(eq(comments.id, report.commentId));
  }
}

/**
 * 获取敏感词列表
 */
export async function getSensitiveWords(
  env: Env,
  category?: string
): Promise<any[]> {
  const db = getDB(env);

  if (category) {
    return db
      .select()
      .from(sensitiveWords)
      .where(eq(sensitiveWords.category, category))
      .orderBy(desc(sensitiveWords.createdAt))
      .all();
  }

  return db
    .select()
    .from(sensitiveWords)
    .orderBy(desc(sensitiveWords.createdAt))
    .all();
}

/**
 * 添加敏感词
 */
export async function addSensitiveWord(
  env: Env,
  word: string,
  category: string
): Promise<void> {
  const cleaned = word.trim().toLowerCase();
  if (!cleaned) {
    throw { status: 400, message: "word cannot be empty" };
  }

  const db = getDB(env);
  const now = nowISO();

  try {
    await db.insert(sensitiveWords).values({
      id: generateUUID(),
      word: cleaned,
      category: category || "",
      createdAt: now,
    });
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      throw { status: 409, message: "sensitive word already exists" };
    }
    throw { status: 500, message: "failed to add sensitive word" };
  }

  // 刷新缓存
  await globalSensitiveChecker.invalidate();
}

/**
 * 删除敏感词
 */
export async function deleteSensitiveWord(
  env: Env,
  id: string
): Promise<void> {
  const db = getDB(env);

  const result = await db
    .select()
    .from(sensitiveWords)
    .where(eq(sensitiveWords.id, id))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "sensitive word not found" };
  }

  await db.delete(sensitiveWords).where(eq(sensitiveWords.id, id));

  // 刷新缓存
  await globalSensitiveChecker.invalidate();
}
