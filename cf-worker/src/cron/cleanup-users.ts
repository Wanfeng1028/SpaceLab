/**
 * cleanup-users.ts
 * 清理未验证用户：删除注册后超过 N 天仍未验证邮箱的账号及关联数据
 */

export async function runCleanupUsers(env: Env): Promise<void> {
  // 从环境变量读取保留天数，默认 7 天
  const days = parseInt(env.UNVERIFIED_USER_RETENTION_DAYS || "7") || 7;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 查询待删除用户 ID
    const { results: users } = await env.DB.prepare(
      `SELECT id FROM users
       WHERE status = 'pending_verify'
         AND email_verified_at IS NULL
         AND created_at < ?`
    )
      .bind(cutoff)
      .all<{ id: string }>();

    if (users.length === 0) {
      console.log("[cleanup-users] No unverified users to clean up");
      return;
    }

    const userIds = users.map((u) => u.id);
    const placeholders = userIds.map(() => "?").join(",");

    // 事务内级联删除关联数据
    // D1 支持 batch，按顺序执行以保证外键约束
    const statements: D1PreparedStatement[] = [
      // 1. email_verification_tokens
      env.DB.prepare(
        `DELETE FROM email_verification_tokens WHERE user_id IN (${placeholders})`
      ).bind(...userIds),
      // 2. password_reset_tokens
      env.DB.prepare(
        `DELETE FROM password_reset_tokens WHERE user_id IN (${placeholders})`
      ).bind(...userIds),
      // 3. login_logs
      env.DB.prepare(
        `DELETE FROM login_logs WHERE user_id IN (${placeholders})`
      ).bind(...userIds),
      // 4. risk_events
      env.DB.prepare(
        `DELETE FROM risk_events WHERE user_id IN (${placeholders})`
      ).bind(...userIds),
      // 5. comments
      env.DB.prepare(
        `DELETE FROM comments WHERE user_id IN (${placeholders})`
      ).bind(...userIds),
      // 6. comment_reports (关联到该用户的评论)
      env.DB.prepare(
        `DELETE FROM comment_reports WHERE reporter_id IN (${placeholders})`
      ).bind(...userIds),
      // 7. 删除用户本身
      env.DB.prepare(
        `DELETE FROM users WHERE id IN (${placeholders})`
      ).bind(...userIds),
    ];

    await env.DB.batch(statements);

    console.log(`[cleanup-users] Cleaned up ${users.length} unverified user(s)`);
  } catch (err) {
    console.error("[cleanup-users] Error:", err);
  }
}
