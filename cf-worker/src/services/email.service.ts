/**
 * 邮件服务 — 通过 Resend API 发送邮件
 * 对齐 Go 版 utils/resend_service.go
 */

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

async function sendEmail(
  env: Env,
  payload: ResendEmailPayload
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn("Resend API key not configured, skipping email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend API error (${res.status}): ${body}`);
    throw new Error("Failed to send email");
  }
}

/** 发送邮箱验证邮件 */
export async function sendVerificationEmail(
  env: Env,
  to: string,
  token: string
): Promise<void> {
  const siteUrl = env.SITE_URL || "https://spacelab.example.com";
  const verifyUrl = `${siteUrl}/auth/verify-email?token=${token}`;

  await sendEmail(env, {
    from: env.RESEND_FROM || "noreply@spacelab.example.com",
    to: [to],
    subject: "验证您的邮箱 — SpaceLab",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>欢迎加入 SpaceLab！</h2>
        <p>请点击下方按钮验证您的邮箱地址：</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:6px;margin:16px 0;">
          验证邮箱
        </a>
        <p style="color:#666;font-size:13px;">
          此链接 24 小时内有效。如果您没有注册账号，请忽略此邮件。
        </p>
      </div>
    `,
  });
}

/** 发送密码重置邮件 */
export async function sendPasswordResetEmail(
  env: Env,
  to: string,
  token: string
): Promise<void> {
  const siteUrl = env.SITE_URL || "https://spacelab.example.com";
  const resetUrl = `${siteUrl}/auth/reset-password?token=${token}`;

  await sendEmail(env, {
    from: env.RESEND_FROM || "noreply@spacelab.example.com",
    to: [to],
    subject: "重置您的密码 — SpaceLab",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>密码重置请求</h2>
        <p>我们收到了您的密码重置请求，请点击下方按钮设置新密码：</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:6px;margin:16px 0;">
          重置密码
        </a>
        <p style="color:#666;font-size:13px;">
          此链接 1 小时内有效。如果您没有请求重置密码，请忽略此邮件。
        </p>
      </div>
    `,
  });
}

/** 发送欢迎邮件 */
export async function sendWelcomeEmail(
  env: Env,
  to: string,
  username: string
): Promise<void> {
  const siteUrl = env.SITE_URL || "https://spacelab.example.com";

  await sendEmail(env, {
    from: env.RESEND_FROM || "noreply@spacelab.example.com",
    to: [to],
    subject: `欢迎，${username}！— SpaceLab`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>你好，${username}！🚀</h2>
        <p>感谢您注册 SpaceLab，您的账号已准备就绪。</p>
        <p>现在您可以：</p>
        <ul>
          <li>浏览文章和项目</li>
          <li>发表评论和互动</li>
          <li>探索更多功能</li>
        </ul>
        <a href="${siteUrl}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:6px;margin:16px 0;">
          开始探索
        </a>
      </div>
    `,
  });
}
