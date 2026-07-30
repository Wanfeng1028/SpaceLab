import type { MiddlewareHandler } from "hono";
import type { AuthVariables } from "./auth";

/**
 * 角色权限中间件 — 对齐 Go 版 RequireRole
 *
 * 工厂函数：requireRole("admin", "editor")
 * 从 context variable 读取 role，检查是否在允许列表中。
 */
export function requireRole(
  ...roles: string[]
): MiddlewareHandler<{ Bindings: Env; Variables: AuthVariables }> {
  return async (c, next) => {
    const role = c.get("role");

    if (!role) {
      c.status(401);
      return c.json({ error: "User role not found" });
    }

    if (!roles.includes(role)) {
      c.status(403);
      return c.json({ error: "Insufficient permissions" });
    }

    await next();
  };
}
