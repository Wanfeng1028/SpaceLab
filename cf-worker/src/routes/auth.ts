/**
 * 认证路由 — 对齐 Go 版路由注册
 * 导出 Hono 路由器，供 index.ts 挂载
 */
import { Hono } from "hono";
import type { AuthVariables } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import { authLimiter, authFailureLimiter } from "../middleware/rate-limit";
import * as authService from "../services/auth.service";
import * as oauthService from "../services/oauth.service";

type AppContext = { Bindings: Env; Variables: AuthVariables };

const auth = new Hono<AppContext>();

/** 获取客户端 IP（Cloudflare 优先） */
function getClientIP(c: any): string {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// ── 工具函数 ──────────────────────────────────────────────────────

/** 从 User-Agent 提取简单设备信息 */
function parseDeviceInfo(ua: string): string {
  const lower = ua.toLowerCase();
  if (lower.includes("iphone")) return "iPhone";
  if (lower.includes("ipad")) return "iPad";
  if (lower.includes("android")) return "Android";
  if (lower.includes("windows")) return "Windows PC";
  if (lower.includes("macintosh") || lower.includes("mac os")) return "Mac";
  if (lower.includes("linux")) return "Linux PC";
  return "Unknown";
}

/** 统一错误处理：service 层抛出 { status, message } */
function handleError(c: any, err: unknown) {
  if (err && typeof err === "object" && "status" in err && "message" in err) {
    const e = err as { status: number; message: string };
    return c.json({ error: e.message }, e.status);
  }
  console.error("Unexpected error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
}

// ── 公开路由 ──────────────────────────────────────────────────────

/** POST /register — 注册 */
auth.post("/register", authLimiter, async (c) => {
  let input: { email: string; password: string; username: string };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request parameters" }, 400);
  }
  if (!input.email || !input.password || !input.username) {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  // 密码强度校验
  const pwdErr = authService.validatePasswordStrength(input.password);
  if (pwdErr) return c.json({ error: pwdErr }, 400);

  try {
    const response = await authService.register(c.env, input);

    // 记录注册成功日志
    const ip = getClientIP(c);
    const ua = c.req.header("User-Agent") || "";
    await authService.recordLoginLog(c.env, "00000000-0000-0000-0000-000000000000", input.email, ip, ua, parseDeviceInfo(ua), true, "");

    return c.json(response, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

/** POST /login — 登录 */
auth.post("/login", authFailureLimiter, async (c) => {
  let input: { email: string; password: string };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request parameters" }, 400);
  }
  if (!input.email || !input.password) {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  const ip = getClientIP(c);
  const ua = c.req.header("User-Agent") || "";
  const deviceInfo = parseDeviceInfo(ua);

  try {
    const response = await authService.login(c.env, input);

    // 记录登录成功日志
    await authService.recordLoginLog(c.env, response.user.id, input.email, ip, ua, deviceInfo, true, "");

    return c.json(response, 200);
  } catch (err) {
    // 记录登录失败日志
    await authService.recordLoginLog(c.env, "", input.email, ip, ua, deviceInfo, false, "Invalid email or password");
    return handleError(c, err);
  }
});

/** POST /refresh — 刷新令牌 */
auth.post("/refresh", authLimiter, async (c) => {
  let input: { refresh_token: string };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "refresh_token is required" }, 400);
  }
  if (!input.refresh_token) {
    return c.json({ error: "refresh_token is required" }, 400);
  }

  try {
    const response = await authService.refreshToken(c.env, input.refresh_token);
    return c.json(response, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

/** GET /registration-open — 查询注册开放状态 */
auth.get("/registration-open", async (c) => {
  const open = await authService.isRegistrationOpen(c.env);
  return c.json({ registration_open: open });
});

/** POST /request-password-reset — 请求密码重置 */
auth.post("/request-password-reset", authLimiter, async (c) => {
  let input: { email: string };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request parameters" }, 400);
  }
  if (!input.email) {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  try {
    await authService.requestPasswordReset(c.env, input.email);
    return c.json({ message: "If the email exists, a reset link has been sent" }, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

/** POST /reset-password — 重置密码 */
auth.post("/reset-password", authLimiter, async (c) => {
  let input: { token: string; new_password: string };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request parameters" }, 400);
  }
  if (!input.token || !input.new_password) {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  // 密码强度校验
  const pwdErr = authService.validatePasswordStrength(input.new_password);
  if (pwdErr) return c.json({ error: pwdErr }, 400);

  try {
    await authService.resetPassword(c.env, input.token, input.new_password);
    return c.json({ message: "Password reset successfully" }, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

/** POST /verify-email — 验证邮箱（POST body） */
auth.post("/verify-email", async (c) => {
  let input: { token: string };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "token is required" }, 400);
  }
  if (!input?.token) {
    return c.json({ error: "token is required" }, 400);
  }

  try {
    await authService.verifyEmail(c.env, input.token);
    return c.json({ message: "Email verified successfully" }, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

/** GET /verify-email — 验证邮箱（GET query，邮件链接点击） */
auth.get("/verify-email", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "token is required" }, 400);
  }

  try {
    await authService.verifyEmail(c.env, token);
    return c.json({ message: "Email verified successfully" }, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// ── OAuth 路由 ────────────────────────────────────────────────────

/** GET /:provider — OAuth 发起（302 重定向） */
auth.get("/:provider", async (c) => {
  const provider = c.req.param("provider");

  if (!oauthService.isEnabled(c.env, provider)) {
    return c.json(
      { error: `${provider} 登录未配置，请联系管理员` },
      503
    );
  }

  try {
    const authURL = oauthService.getAuthURL(c.env, provider);
    return c.redirect(authURL, 302);
  } catch (err) {
    return c.json({ error: "生成授权链接失败" }, 500);
  }
});

/** GET /:provider/callback — OAuth 回调（302 重定向前端） */
auth.get("/:provider/callback", async (c) => {
  const provider = c.req.param("provider");
  const code = c.req.query("code");
  const errorParam = c.req.query("error");
  const callbackBaseURL = (c.env.SITE_URL || "http://localhost:4200").replace(/\/$/, "");

  if (errorParam) {
    return c.redirect(`${callbackBaseURL}/auth/callback?error=${errorParam}`, 302);
  }
  if (!code) {
    return c.redirect(`${callbackBaseURL}/auth/callback?error=missing_code`, 302);
  }

  try {
    const result = await oauthService.handleCallback(c.env, provider, code);
    const redirectURL =
      `${callbackBaseURL}/auth/callback` +
      `#token=${result.token}` +
      `&refresh_token=${result.refresh_token}` +
      `&expires_at=${result.expires_at}`;
    return c.redirect(redirectURL, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return c.redirect(`${callbackBaseURL}/auth/callback?error=${encodeURIComponent(msg)}`, 302);
  }
});

// ── 需要认证的路由 ────────────────────────────────────────────────

/** POST /logout — 登出 */
auth.post("/logout", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const authHeader = c.req.header("Authorization") || "";
  const tokenString = authHeader.replace(/^Bearer\s+/i, "");

  if (tokenString && tokenString !== authHeader) {
    await authService.logout(c.env, userId, tokenString);
  }

  // 记录登出日志
  const ip = getClientIP(c);
  const ua = c.req.header("User-Agent") || "";
  await authService.recordLoginLog(c.env, userId, "", ip, ua, parseDeviceInfo(ua), true, "logout");

  return c.json({ message: "Logged out successfully" }, 200);
});

/** GET /me — 获取当前用户 */
auth.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  try {
    const user = await authService.getMe(c.env, userId);
    return c.json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      avatar_url: user.avatar_url,
      email_verified_at: user.email_verified_at,
      created_at: user.created_at,
    }, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

/** PUT /profile — 更新资料 */
auth.put("/profile", authMiddleware, async (c) => {
  const userId = c.get("userId");
  let input: { username?: string; avatar_url?: string };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  try {
    await authService.updateProfile(c.env, userId, input);
    return c.json({ message: "Profile updated successfully" }, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

/** PUT /password — 修改密码 */
auth.put("/password", authMiddleware, async (c) => {
  const userId = c.get("userId");
  let input: { old_password: string; new_password: string };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request parameters" }, 400);
  }
  if (!input.old_password || !input.new_password) {
    return c.json({ error: "Invalid request parameters" }, 400);
  }

  // 新密码强度
  const pwdErr = authService.validatePasswordStrength(input.new_password);
  if (pwdErr) return c.json({ error: pwdErr }, 400);

  try {
    await authService.updatePassword(c.env, userId, input);
    return c.json({ message: "Password updated successfully" }, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

/** POST /resend-verification — 重发验证邮件 */
auth.post("/resend-verification", authMiddleware, authLimiter, async (c) => {
  const userId = c.get("userId");
  try {
    await authService.resendVerification(c.env, userId);
    return c.json({ message: "Verification email sent" }, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export { auth as authRoutes };
