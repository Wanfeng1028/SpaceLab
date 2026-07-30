import type { MiddlewareHandler } from "hono";

/**
 * 安全头中间件 — 对齐 Go 版 security.go + security_extra.go
 *
 * 包含：X-Frame-Options、X-Content-Type-Options、HSTS、CSP、
 * Referrer-Policy、Permissions-Policy，以及清除 Server / X-Powered-By。
 */
export function securityHeaders(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    // ── 基础安全头 ──────────────────────────────────────────
    c.header("X-Frame-Options", "DENY");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );

    // ── Referrer & Permissions ──────────────────────────────
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()"
    );

    // ── CSP（根据环境区分） ─────────────────────────────────
    const env = c.env.ENVIRONMENT ?? "development";
    if (env === "production" || env === "prod") {
      c.header(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self'",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; ")
      );
    } else {
      // 开发环境宽松 CSP（允许 localhost、开发工具和 HMR worker）
      c.header(
        "Content-Security-Policy",
        [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
          "worker-src 'self' blob:",
          "img-src 'self' data: https: http:",
          "connect-src 'self' http://localhost:* ws://localhost:*",
          "frame-ancestors 'none'",
        ].join("; ")
      );
    }

    // ── 清除暴露服务器信息的头 ──────────────────────────────
    c.header("X-Powered-By", "");
    c.header("Server", "");

    await next();
  };
}
