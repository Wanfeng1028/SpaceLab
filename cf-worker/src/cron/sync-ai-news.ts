/**
 * sync-ai-news.ts
 * 移植 scripts/sync-ai-frontline.mjs：从 ai-bot.cn/daily-ai-news/ 抓取 AI 新闻写入 D1
 */

const USER_AGENT = "SpaceLabBot/1.0 (+https://github.com/Wanfeng1028/SpaceLab)";
const CURRENT_YEAR = new Date().getUTCFullYear();
const TODAY = new Date().toISOString().slice(0, 10);

const MONTH_MAP: Record<string, string> = {
  "1月": "01", "2月": "02", "3月": "03", "4月": "04",
  "5月": "05", "6月": "06", "7月": "07", "8月": "08",
  "9月": "09", "10月": "10", "11月": "11", "12月": "12",
};

function parseDateLabel(label: string): string | null {
  const m = label.match(/(\d+)月(\d+)/);
  if (!m) return null;
  const month = MONTH_MAP[m[1] + "月"];
  if (!month) return null;
  const day = m[2].padStart(2, "0");
  let dateStr = `${CURRENT_YEAR}-${month}-${day}`;
  if (new Date(dateStr) > new Date(TODAY)) {
    dateStr = `${CURRENT_YEAR - 1}-${month}-${day}`;
  }
  return dateStr;
}

function generateSlug(date: string, title: string): string {
  return `${date}-${title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)}`;
}

function categorizeNews(title: string, summary: string): string {
  const t = `${title} ${summary}`.toLowerCase();
  if (/融资|投资|估值|funding/.test(t)) return "funding";
  if (/开源|open.?source/.test(t)) return "opensource";
  if (/agent|智能体/.test(t)) return "agent";
  if (/模型|model|gpt|llama|claude|gemini/.test(t)) return "model";
  if (/工具|tool|sdk|api|平台/.test(t)) return "tool";
  if (/产品|product|发布|launch/.test(t)) return "product";
  return "industry";
}

function extractTags(title: string, summary: string): string[] {
  const tags: string[] = [];
  const t = `${title} ${summary}`.toLowerCase();
  const pats: [RegExp, string][] = [
    [/claude/i, "Claude"],
    [/gemini/i, "Gemini"],
    [/openai/i, "OpenAI"],
    [/anthropic/i, "Anthropic"],
    [/deepseek/i, "DeepSeek"],
    [/qwen|通义/i, "通义千问"],
    [/融资/, "融资"],
    [/开源/, "开源"],
    [/agent/i, "Agent"],
    [/视频|video/i, "视频"],
    [/图像|image/i, "图像"],
  ];
  for (const [re, tag] of pats) {
    if (re.test(t) && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 5) break;
  }
  return tags;
}

interface ParsedNews {
  slug: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  category: string;
  tags: string[];
  publishedAt: string;
}

function parseDailyNews(html: string): ParsedNews[] {
  const h = html.replace(/>\s+</g, "><").replace(/\s+/g, " ");
  const dateRe = /class="news-date">(\d+)月(\d+)·[^<]+/g;
  const dateEntries: { date: string | null; pos: number; endPos: number }[] = [];
  let dm: RegExpExecArray | null;
  while ((dm = dateRe.exec(h)) !== null) {
    dateEntries.push({
      date: parseDateLabel(dm[0].replace('class="news-date">', "")),
      pos: dm.index,
      endPos: dm.index + dm[0].length,
    });
  }

  const results: ParsedNews[] = [];
  for (let i = 0; i < dateEntries.length; i++) {
    const { date, endPos } = dateEntries[i];
    if (!date) continue;
    const nextPos = i + 1 < dateEntries.length ? dateEntries[i + 1].pos : h.length;
    const section = h.slice(endPos, nextPos);

    const itemRe = /<h2><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a\s*><\/h2><p[^>]*>(.*?)<\/p>/g;
    let im: RegExpExecArray | null;
    while ((im = itemRe.exec(section)) !== null) {
      const url = im[1].trim();
      const title = im[2].trim();
      const pContent = im[3];
      const srcMatch = pContent.match(/来源[：:]([^<\s]+)/);
      const source = srcMatch ? srcMatch[1].trim() : "";
      const summary = pContent
        .replace(/<span[^>]*>.*?<\/span\s*>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      results.push({
        slug: generateSlug(date, title),
        title,
        summary: summary || title,
        sourceName: source,
        sourceUrl: url,
        category: categorizeNews(title, summary),
        tags: extractTags(title, summary),
        publishedAt: date,
      });
    }
  }
  return results;
}

export async function runSyncAiNews(env: Env): Promise<void> {
  try {
    console.log("[sync-ai-news] Fetching ai-bot.cn/daily-ai-news/ ...");
    const resp = await fetch("https://ai-bot.cn/daily-ai-news/", {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    console.log(`[sync-ai-news] Fetched ${(html.length / 1024).toFixed(0)} KB`);

    const items = parseDailyNews(html);
    console.log(`[sync-ai-news] Parsed ${items.length} items`);
    if (items.length === 0) return;

    const now = new Date().toISOString();
    let upserted = 0;

    // Upsert: 按 slug 去重
    for (const item of items) {
      const existing = await env.DB.prepare(
        "SELECT id FROM ai_news WHERE slug = ?"
      ).bind(item.slug).first();

      if (existing) {
        // 更新已有记录
        await env.DB.prepare(
          `UPDATE ai_news SET title=?, summary=?, source_name=?, source_url=?,
           category=?, tags=?, published_at=?, updated_at=?
           WHERE slug=?`
        ).bind(
          item.title, item.summary, item.sourceName, item.sourceUrl,
          item.category, JSON.stringify(item.tags), item.publishedAt, now,
          item.slug
        ).run();
      } else {
        // 插入新记录
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO ai_news (id, slug, title, summary, content, source_name, source_url,
           category, tags, image_url, status, published_at, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          id, item.slug, item.title, item.summary, "", item.sourceName, item.sourceUrl,
          item.category, JSON.stringify(item.tags), "", "published", item.publishedAt, now, now
        ).run();
      }
      upserted++;
    }

    console.log(`[sync-ai-news] Upserted ${upserted} items`);
  } catch (err) {
    console.error("[sync-ai-news] Error:", err);
  }
}
