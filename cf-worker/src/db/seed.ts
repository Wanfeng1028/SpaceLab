/**
 * 种子数据脚本 - 创建默认管理员用户
 * 使用方式: npx tsx src/db/seed.ts
 * 需要设置环境变量 CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_API_TOKEN
 * 或通过 wrangler 本地开发环境运行
 */

// 简易种子脚本：直接通过 D1 REST API 或本地 SQLite 执行
// 这里提供一个可在 wrangler dev 环境中通过 HTTP 调用的版本

const ADMIN_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@spacelab.com",
  username: "admin",
  role: "admin",
  status: "active",
  password: "Admin@123456",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function seed(db: D1Database) {
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(ADMIN_USER.password);

  // 检查管理员是否已存在
  const existing = await db
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(ADMIN_USER.email)
    .first();

  if (existing) {
    console.log("Admin user already exists, skipping...");
    return;
  }

  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, username, role, status, avatar_url, oauth_provider, oauth_id, login_fail_count, comment_approved_count, newsletter_opt_in, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      ADMIN_USER.id,
      ADMIN_USER.email,
      passwordHash,
      ADMIN_USER.username,
      ADMIN_USER.role,
      ADMIN_USER.status,
      "",
      "",
      "",
      0,
      0,
      0,
      now,
      now
    )
    .run();

  console.log("Admin user created successfully!");
  console.log(`  Email: ${ADMIN_USER.email}`);
  console.log(`  Password: ${ADMIN_USER.password}`);
  console.log(`  ID: ${ADMIN_USER.id}`);
}

// 支持通过 wrangler 本地环境运行
// 用法: npx tsx src/db/seed.ts
// 注意: 此脚本需要连接到 D1 数据库实例
// 在开发环境中，建议通过 Hono 路由或 wrangler 直接执行

// 导出供其他模块使用
export { seed, hashPassword, ADMIN_USER };
