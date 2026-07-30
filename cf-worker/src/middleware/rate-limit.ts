import type { Context, MiddlewareHandler } from "hono";

// ── 类型定义 ──────────────────────────────────────────────────────

interface RateLimitOptions {
  /** KV key 前缀（业务标识） */
  key: string;
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 滑动窗口大小（秒） */
  windowSeconds: number;
  /** 超限后锁定时间（秒），可选 */
  lockoutSeconds?: number;
  /** 自定义 identifier 提取函数，默认取 IP */
  identifier?: (c: Context<{ Bindings: Env }>) => string;
}

// ── 工具函数 ──────────────────────────────────────────────────────

/** 获取客户端 IP（Cloudflare 优先） */
function getClientIP(c: Context<{ Bindings: Env }>): string {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// ── 核心限流逻辑（D1 原子操作）────────────────────────────────────

function rateLimit(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  const {
    key,
    maxRequests,
    windowSeconds,
    lockoutSeconds,
    identifier = getClientIP,
  } = options;

  return async (c, next) => {
    const id = identifier(c);
    const rlKey = `rl:${id}:${key}`;
    const db = c.env.DB;

    const now = new Date().toISOString();

    // 使用 batch 实现原子操作：清理过期 + 查询当前记录
    const results = await db.batch([
      // 1. 清理过期的计数器
      db.prepare(
        `DELETE FROM rate_limit_counters WHERE window_end < ?1`
      ).bind(now),
      // 2. 查询当前记录
      db.prepare(
        `SELECT count, window_end, locked_until FROM rate_limit_counters WHERE key = ?1`
      ).bind(rlKey),
    ]);

    const queryResult = results[1];
    const rows = queryResult.results as {
      count: number;
      window_end: string;
      locked_until: string | null;
    }[];
    const row = rows.length > 0 ? rows[0] : null;

    // 检查是否处于锁定状态
    if (lockoutSeconds && row?.locked_until && row.locked_until > now) {
      const retryAfter = Math.ceil(
        (new Date(row.locked_until).getTime() - Date.now()) / 1000
      );
      c.header("Retry-After", String(retryAfter));
      c.status(429);
      return c.json({
        error: "Too many requests, please try again later",
        retryAfter,
      });
    }

    const currentCount = row?.count ?? 0;

    if (currentCount >= maxRequests) {
      // 超限 → 可选锁定
      if (lockoutSeconds) {
        const lockedUntil = new Date(
          Date.now() + lockoutSeconds * 1000
        ).toISOString();
        await db
          .prepare(
            `UPDATE rate_limit_counters SET locked_until = ?1 WHERE key = ?2`
          )
          .bind(lockedUntil, rlKey)
          .run();
      }
      c.header("Retry-After", String(lockoutSeconds ?? windowSeconds));
      c.status(429);
      return c.json({
        error: "Too many requests, please try again later",
      });
    }

    // 原子递增计数（使用 INSERT OR UPDATE）
    const windowEnd = new Date(
      Date.now() + windowSeconds * 1000
    ).toISOString();

    await db
      .prepare(
        `INSERT INTO rate_limit_counters (key, count, window_end)
         VALUES (?1, 1, ?2)
         ON CONFLICT(key) DO UPDATE SET
           count = count + 1,
           window_end = CASE
             WHEN window_end < ?3 THEN ?2
             ELSE window_end
           END`
      )
      .bind(rlKey, windowEnd, now)
      .run();

    const newCount = currentCount + 1;

    // 设置限流响应头
    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header(
      "X-RateLimit-Remaining",
      String(Math.max(0, maxRequests - newCount))
    );

    await next();
  };
}

// ── 预配置限流器 ──────────────────────────────────────────────────

/** IP 级别认证限流：10 次 / 5 分钟 */
export const authLimiter = rateLimit({
  key: "auth",
  maxRequests: 10,
  windowSeconds: 5 * 60,
  lockoutSeconds: 15 * 60,
});

/**
 * IP + 账号双维度认证失败限流
 * 用于登录失败场景，需要路由层自行拼接 identifier
 */
export const authFailureLimiter = rateLimit({
  key: "auth-fail",
  maxRequests: 5,
  windowSeconds: 10 * 60,
  lockoutSeconds: 30 * 60,
});

/** 注册频率限流：5 次 / 小时（IP 级别） */
export const registerIPGuard = rateLimit({
  key: "register",
  maxRequests: 5,
  windowSeconds: 60 * 60,
});

/** 通用 API 限流：100 次 / 分钟 */
export const generalRateLimit = rateLimit({
  key: "general",
  maxRequests: 100,
  windowSeconds: 60,
});

export { rateLimit, getClientIP };
