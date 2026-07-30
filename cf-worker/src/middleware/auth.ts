import type { Context, MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";

// ── 常量 ──────────────────────────────────────────────────────────

/**
 * Stamp 强制迁移截止日期
 * 超过此日期后，所有无 stamp 的旧 token 将被拒绝
 * 给用户和旧客户端充足的迁移时间
 */
const STAMP_ENFORCEMENT_DATE = "2026-10-01T00:00:00Z";

// ── 类型定义 ──────────────────────────────────────────────────────

/** JWT Payload 中携带的业务声明 */
interface TokenPayload {
  user_id: string;
  email: string;
  role: string;
  /** 令牌类型：access / refresh */
  typ: string;
  /** 安全 stamp，用于改密码后批量失效旧 token */
  stamp: string;
}

/** 写入 Hono context variable 的认证信息 */
export interface AuthVariables {
  userId: string;
  email: string;
  role: string;
}

// ── 工具函数 ──────────────────────────────────────────────────────

/** 从 Authorization 头提取 Bearer token */
function extractToken(c: Context): string | null {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

/** 验证 JWT 签名 & 过期时间，返回 payload */
async function verifyToken(
  token: string,
  secret: string
): Promise<TokenPayload> {
  const secretKey = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ["HS256"],
  });
  return payload as unknown as TokenPayload;
}

// ── 核心认证逻辑 ──────────────────────────────────────────────────

async function doAuth(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  required: boolean
): Promise<Response | undefined> {
  const token = extractToken(c);

  if (!token) {
    if (!required) return undefined; // optional 模式：未携带 token 直接放行
    c.status(401);
    return c.json({ error: "Authorization required" });
  }

  // 1) Token 黑名单检查
  const blacklisted = await c.env.TOKEN_BLACKLIST.get(token);
  if (blacklisted) {
    c.status(401);
    return c.json({ error: "Token has been revoked" });
  }

  // 2) JWT 签名 & 过期验证
  let payload: TokenPayload;
  try {
    payload = await verifyToken(token, c.env.JWT_SECRET);
  } catch {
    c.status(401);
    return c.json({ error: "Authentication failed" });
  }

  // 3) 令牌类型检查（access token 才能访问 API）
  if (payload.typ && payload.typ !== "access") {
    c.status(401);
    return c.json({ error: "Invalid token type" });
  }

  // 4) 安全 Stamp 检查 — 改密码后旧 token 失效
  if (payload.user_id) {
    const storedStamp = await c.env.TOKEN_BLACKLIST.get(
      `stamp:${payload.user_id}`
    );
    if (storedStamp) {
      // 如果存储了 stamp，必须匹配
      if (!payload.stamp || storedStamp !== payload.stamp) {
        c.status(401);
        return c.json({ error: "Token has been revoked" });
      }
    } else if (!payload.stamp) {
      // 无 stamp 的旧 token：在截止日期后拒绝
      const now = new Date().toISOString();
      if (now >= STAMP_ENFORCEMENT_DATE) {
        c.status(401);
        return c.json({ error: "Token expired, please re-authenticate" });
      }
      // 截止日期前向后兼容放行
    }
  }

  // 写入上下文变量
  c.set("userId", payload.user_id);
  c.set("email", payload.email);
  c.set("role", payload.role);

  return undefined;
}

// ── 导出中间件 ────────────────────────────────────────────────────

/**
 * 强制认证中间件 — 未携带有效 token 返回 401
 * 对齐 Go 版 AuthWithRedis
 */
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: AuthVariables;
}> = async (c, next) => {
  const result = await doAuth(c, true);
  if (result) return result;
  await next();
};

/**
 * 可选认证中间件 — 未携带 token 不拒绝，但携带时必须有效
 */
export const optionalAuthMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: AuthVariables;
}> = async (c, next) => {
  const result = await doAuth(c, false);
  if (result) return result;
  await next();
};
