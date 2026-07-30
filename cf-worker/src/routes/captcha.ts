/**
 * 验证码路由 — 对齐 Go 版 handler/captcha/captcha.go
 *
 * CF 端使用 Cloudflare Turnstile 替代图形验证码。
 */
import { Hono } from "hono";
import { error } from "../utils/response";

type Variables = Record<string, never>;
const captcha = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── GET /new — 返回 Turnstile 配置 ────────────────────────────────────────
// Go 版: { captcha_id: "xxx" }
// CF 版额外返回 type/site_key 让前端知道使用 Turnstile 模式

captcha.get("/new", (c) => {
  return c.json({
    captcha_id: "turnstile",
    type: "turnstile",
    site_key: c.env.TURNSTILE_SITE_KEY || "",
  });
});

// ── GET /image/:id — 图形验证码降级（不可用） ──────────────────────────────

captcha.get("/image/:id", (c) => {
  return c.json(
    error("Graphical captcha is not available. Please use Cloudflare Turnstile instead."),
    404
  );
});

// ── POST /verify — 验证 Turnstile token ───────────────────────────────────
// Go 版: { success: true/false }

captcha.post("/verify", async (c) => {
  const body = await c.req.json<{ token?: string }>();

  if (!body.token) {
    return c.json(error("token is required"), 400);
  }

  const secret = c.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // 未配置 secret 时跳过验证（开发环境）
    console.warn("TURNSTILE_SECRET_KEY not configured, skipping verification");
    return c.json({ success: true });
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", body.token);

    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const result = (await resp.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!result.success) {
      console.warn("Turnstile verification failed:", result["error-codes"]);
    }

    return c.json({ success: result.success });
  } catch (e) {
    console.error("Failed to verify turnstile token:", e);
    return c.json(error("Failed to verify captcha"), 500);
  }
});

export { captcha as captchaRoutes };
