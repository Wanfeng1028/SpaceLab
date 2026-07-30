import type { MiddlewareHandler } from "hono";

/**
 * CORS 中间件 — 对齐 Go 版 security.go 的 CORS 逻辑
 *
 * 从 ALLOWED_ORIGINS 环境变量（逗号分隔）读取白名单，
 * 精确匹配 Origin，支持 credentials，设置 Vary: Origin。
 */
export function corsMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const origin = c.req.header("Origin") ?? "";

    // 解析白名单
    const raw = c.env.ALLOWED_ORIGINS ?? "";
    const allowedOrigins = raw
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : ["http://localhost:4200"];

    const isAllowed = allowedOrigins.includes(origin);

    // 告知 CDN/Proxy 缓存需根据 Origin 区分响应
    c.header("Vary", "Origin");

    if (isAllowed && origin) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Credentials", "true");
    }

    c.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    c.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Authorization, X-CSRF-Token"
    );
    c.header("Access-Control-Max-Age", "86400");

    // 预检请求直接返回
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  };
}
