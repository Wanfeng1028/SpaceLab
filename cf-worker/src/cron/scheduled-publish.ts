/**
 * scheduled-publish.ts
 * 定时发布文章：将 status='scheduled' 且 scheduled_at <= now() 的文章发布
 */

export async function runScheduledPublish(env: Env): Promise<void> {
  const now = new Date().toISOString();

  try {
    const result = await env.DB.prepare(
      `UPDATE posts
       SET status = 'published', published_at = ?, updated_at = ?
       WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?
         AND deleted_at IS NULL`
    )
      .bind(now, now, now)
      .run();

    const count = result.meta.changes;
    if (count > 0) {
      console.log(`[scheduled-publish] Published ${count} article(s)`);
      // 文章发布后失效 RSS 缓存
      await env.CACHE.delete("rss:feed:xml");
    }
  } catch (err) {
    console.error("[scheduled-publish] Error:", err);
  }
}
