/**
 * daily-stats.ts
 * 移植 scripts/generate-daily-stats.mjs：从 D1 查询统计数据存入 KV
 */

export async function runDailyStats(env: Env): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const cacheKey = `stats:daily:${date}`;

    // 检查今天是否已生成
    const existing = await env.CACHE.get(cacheKey);
    if (existing) {
      console.log(`[daily-stats] Stats for ${date} already exist, skipping`);
      return;
    }

    // 并行查询各表计数
    const [postsRes, projectsRes, aiNewsRes, aiToolsRes, commentsRes, usersRes] =
      await Promise.all([
        env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM posts WHERE status='published' AND deleted_at IS NULL"
        ).first<{ cnt: number }>(),
        env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM projects WHERE status='published' AND deleted_at IS NULL"
        ).first<{ cnt: number }>(),
        env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM ai_news WHERE status='published'"
        ).first<{ cnt: number }>(),
        env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM ai_tools"
        ).first<{ cnt: number }>(),
        env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM comments WHERE status='approved' AND deleted_at IS NULL"
        ).first<{ cnt: number }>(),
        env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM users WHERE status='active'"
        ).first<{ cnt: number }>(),
      ]);

    const stats = {
      date,
      generatedAt: new Date().toISOString(),
      posts: postsRes?.cnt ?? 0,
      projects: projectsRes?.cnt ?? 0,
      aiNews: aiNewsRes?.cnt ?? 0,
      aiTools: aiToolsRes?.cnt ?? 0,
      comments: commentsRes?.cnt ?? 0,
      users: usersRes?.cnt ?? 0,
    };

    // 存入 KV，TTL 48 小时（保留两天内的统计）
    await env.CACHE.put(cacheKey, JSON.stringify(stats), {
      expirationTtl: 48 * 3600,
    });

    console.log(`[daily-stats] Stats for ${date} cached:`, JSON.stringify(stats));
  } catch (err) {
    console.error("[daily-stats] Error:", err);
  }
}
