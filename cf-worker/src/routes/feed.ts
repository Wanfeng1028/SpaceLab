/**
 * feed.ts
 * RSS Feed 动态生成路由：GET /feed, GET /feed.xml
 */
import { Hono } from "hono";

const feed = new Hono<{ Bindings: Env }>();

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822Date(iso: string): string {
  const d = new Date(iso);
  return d.toUTCString();
}

async function buildFeedXml(
  env: Env,
  category?: string,
  tag?: string
): Promise<string> {
  const siteUrl = env.SITE_URL || "https://wanfeng1028.github.io/SpaceLab";
  const now = new Date().toUTCString();

  // 构建查询条件
  const conditions: string[] = [
    "p.status = 'published'",
    "p.deleted_at IS NULL",
  ];
  const params: unknown[] = [];

  if (category) {
    conditions.push("p.category = ?");
    params.push(category);
  }

  // tags 是 JSON 数组字符串，用 LIKE 做简单匹配
  if (tag) {
    conditions.push("p.tags LIKE ?");
    params.push(`%"${tag}"%`);
  }

  const whereClause = conditions.join(" AND ");

  const rows = await env.DB.prepare(
    `SELECT slug, title, summary, published_at, cover_url, category, tags
     FROM posts p
     WHERE ${whereClause}
     ORDER BY p.published_at DESC
     LIMIT 20`
  )
    .bind(...params)
    .all<{
      slug: string;
      title: string;
      summary: string;
      published_at: string;
      cover_url: string;
      category: string;
      tags: string;
    }>();

  const items = rows.results
    .map((row) => {
      const link = `${siteUrl}/blog/${row.slug}`;
      const pubDate = row.published_at ? toRfc822Date(row.published_at) : "";
      const desc = row.summary || "";
      const cat = row.category ? `<category>${escapeXml(row.category)}</category>` : "";

      return `    <item>
      <title><![CDATA[${row.title}]]></title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
      <description><![CDATA[${desc}]]></description>
      ${cat}
    </item>`;
    })
    .join("\n");

  const feedUrl = `${siteUrl}/feed.xml`;
  const filterInfo = category ? ` (${category})` : tag ? ` (tag: ${tag})` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>TesoroHome${escapeXml(filterInfo)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>A personal digital space for code, science visualization and WebGL experiments.</description>
    <language>zh-CN</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

// GET /feed 和 /feed.xml
feed.get("/", async (c) => {
  const category = c.req.query("category") || undefined;
  const tag = c.req.query("tag") || undefined;

  // 无过滤条件时尝试 KV 缓存
  const cacheKey = "rss:feed:xml";
  if (!category && !tag) {
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  const xml = await buildFeedXml(c.env, category, tag);

  // 仅无过滤条件时写入缓存，TTL 1 小时
  if (!category && !tag) {
    await c.env.CACHE.put(cacheKey, xml, { expirationTtl: 3600 });
  }

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

export default feed;
