/**
 * sync-lab-tools.ts
 * 移植 scripts/sync-lab-resources.mjs：从 ai-bot.cn 抓取 AI 工具/研究数据写入 D1
 */

const USER_AGENT = "SpaceLabBot/1.0 (+https://github.com/Wanfeng1028/SpaceLab)";
const TODAY = new Date().toISOString().slice(0, 10);

function relativeTimeToDate(label: string): string | null {
  if (!label) return null;
  const now = new Date();
  const minM = label.match(/(\d+)\s*分钟前/);
  if (minM) return new Date(now.getTime() - parseInt(minM[1]) * 60_000).toISOString().slice(0, 10);
  const hourM = label.match(/(\d+)\s*小时前/);
  if (hourM) return new Date(now.getTime() - parseInt(hourM[1]) * 3_600_000).toISOString().slice(0, 10);
  const dayM = label.match(/(\d+)\s*天前/);
  if (dayM) return new Date(now.getTime() - parseInt(dayM[1]) * 86_400_000).toISOString().slice(0, 10);
  const weekM = label.match(/(\d+)\s*周前/);
  if (weekM) return new Date(now.getTime() - parseInt(weekM[1]) * 604_800_000).toISOString().slice(0, 10);
  const monthM = label.match(/(\d+)\s*个月前/);
  if (monthM) return new Date(now.getTime() - parseInt(monthM[1]) * 2_592_000_000).toISOString().slice(0, 10);
  const yearM = label.match(/(\d+)\s*年前/);
  if (yearM) return new Date(now.getTime() - parseInt(yearM[1]) * 31_536_000_000).toISOString().slice(0, 10);
  return null;
}

function extractTags(title: string, desc: string): string[] {
  const tags: string[] = [];
  const t = `${title} ${desc}`;
  const pats: [RegExp, string][] = [
    [/开源|open.?source/i, "开源"],
    [/agent|智能体/i, "Agent"],
    [/模型|model/i, "模型"],
    [/框架|framework/i, "框架"],
    [/图像|image/i, "图像"],
    [/视频|video/i, "视频"],
    [/编程|代码|code/i, "编程"],
    [/办公|文档/i, "办公"],
    [/claude|anthropic/i, "Claude"],
    [/gemini|google/i, "Google"],
    [/qwen|通义/i, "通义千问"],
    [/deepseek/i, "DeepSeek"],
  ];
  for (const [re, tag] of pats) {
    if (re.test(t) && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 5) break;
  }
  return tags;
}

interface ParsedTool {
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  tags: string[];
  publishedAt: string;
}

function parseListPage(html: string, defaultCategory: string): ParsedTool[] {
  const h = html.replace(/>\s+</g, "><").replace(/\s+/g, " ");
  const items: ParsedTool[] = [];
  const titleRe =
    /<h2><a\s+href="([^"]+)"[^>]*?title="([^"]*)"[^>]*?class="list-title[^"]*"[^>]*?>([\s\S]*?)<\/a\s*><\/h2>/g;
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(h)) !== null) {
    const url = m[1].trim();
    const titleAttr = m[2].replace(/&#8211;/g, "–").replace(/&amp;/g, "&");
    const innerText = m[3].replace(/<[^>]+>/g, "").replace(/&#8211;/g, "–").trim();
    const parts = titleAttr.split(/\s*–\s*/);
    const name = parts[0]?.trim() || innerText.split(/\s*–\s*/)[0]?.trim() || "";
    const desc = parts.slice(1).join(" – ").trim() || "";
    if (!name || name.length < 2) continue;
    if (/^(首页|登录|注册|关于|免费|会员|充值|推荐)/i.test(name)) continue;

    const afterBlock = h.slice(m.index, m.index + 1500);
    const descMatch = afterBlock.match(/<div class="list-desc[^"]*">[^<]*<div[^>]*>(.*?)<\/div>/);
    const fullDesc = descMatch
      ? descMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : desc;
    const timeMatch = afterBlock.match(/<time[^>]*>([^<]+)<\/time>/);
    const timeLabel = timeMatch ? timeMatch[1].trim() : "";
    const date = relativeTimeToDate(timeLabel) || TODAY;
    let fullUrl = url;
    if (url.startsWith("/")) fullUrl = `https://ai-bot.cn${url}`;

    items.push({
      title: name.slice(0, 100),
      summary: (fullDesc || name).slice(0, 200),
      category: defaultCategory,
      source: "ai-bot.cn",
      url: fullUrl,
      tags: extractTags(name, fullDesc),
      publishedAt: date,
    });
  }
  return items;
}

async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

export async function runSyncLabTools(env: Env): Promise<void> {
  try {
    const categories = [
      { baseUrl: "https://ai-bot.cn/ai-tools/", cat: "AI工具" },
      { baseUrl: "https://ai-bot.cn/ai-research/", cat: "AI研究" },
    ];

    const allItems: ParsedTool[] = [];
    for (const category of categories) {
      let pageNum = 1;
      let hasItems = true;
      while (hasItems) {
        const url = pageNum === 1 ? category.baseUrl : `${category.baseUrl}page/${pageNum}/`;
        try {
          console.log(`[sync-lab-tools] Fetching ${category.cat}-p${pageNum}...`);
          const html = await fetchPage(url);
          const items = parseListPage(html, category.cat);
          console.log(`[sync-lab-tools]   ${items.length} items parsed`);
          if (items.length === 0) {
            hasItems = false;
          } else {
            allItems.push(...items);
            pageNum++;
          }
        } catch (err) {
          console.error(`[sync-lab-tools]   Error:`, err);
          hasItems = false;
        }
      }
    }

    // 按 URL 去重
    const byUrl = new Map<string, ParsedTool>();
    for (const item of allItems) {
      if (!byUrl.has(item.url)) byUrl.set(item.url, item);
    }
    const unique = Array.from(byUrl.values());
    console.log(`[sync-lab-tools] Total unique items: ${unique.length}`);

    if (unique.length === 0) return;

    const now = new Date().toISOString();
    let upserted = 0;

    for (const item of unique) {
      // 按 url 查找已有记录
      const existing = await env.DB.prepare(
        "SELECT id FROM ai_tools WHERE url = ?"
      ).bind(item.url).first();

      if (existing) {
        await env.DB.prepare(
          `UPDATE ai_tools SET title=?, summary=?, category=?, source=?, tags=?,
           published_at=?, fetched_at=?, updated_at=? WHERE url=?`
        ).bind(
          item.title, item.summary, item.category, item.source,
          JSON.stringify(item.tags), item.publishedAt, now, now, item.url
        ).run();
      } else {
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO ai_tools (id, title, summary, category, source, url, tags,
           published_at, fetched_at, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          id, item.title, item.summary, item.category, item.source, item.url,
          JSON.stringify(item.tags), item.publishedAt, now, now, now
        ).run();
      }
      upserted++;
    }

    console.log(`[sync-lab-tools] Upserted ${upserted} items`);
  } catch (err) {
    console.error("[sync-lab-tools] Error:", err);
  }
}
