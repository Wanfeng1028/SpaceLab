/**
 * sync-ai-frontline.mjs
 * Fetches AI news from ai-bot.cn/daily-ai-news/ and updates src/content/ai-frontline/news.json
 *
 * Data source: https://ai-bot.cn/daily-ai-news/ (唯一来源)
 * Date: 从页面的日期分组（如 "5月29·周五"）解析真实日期，不用 fetchedAt
 * Source: 从 "来源：XXX" 文本提取
 *
 * Usage: node scripts/sync-ai-frontline.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NEWS_FILE = path.join(ROOT, 'src', 'content', 'ai-frontline', 'news.json');
const SOURCE_FILE = path.join(ROOT, 'src', 'content', 'ai-frontline', 'source.json');

const USER_AGENT = 'SpaceLabBot/1.0 (+https://github.com/Wanfeng1028/SpaceLab)';
const MAX_NEWS_ITEMS = 300;
const CONTENT_START_DATE = '2026-05-25';
const CURRENT_YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().slice(0, 10); // "2026-05-29"

// ── Date label → ISO date ──────────────────────────────────────────────
const MONTH_MAP = {
  '1月': '01',
  '2月': '02',
  '3月': '03',
  '4月': '04',
  '5月': '05',
  '6月': '06',
  '7月': '07',
  '8月': '08',
  '9月': '09',
  '10月': '10',
  '11月': '11',
  '12月': '12',
};

function parseDateLabel(label) {
  // "5月29·周五" → "2026-05-29"
  const m = label.match(/(\d+)月(\d+)/);
  if (!m) return null;
  const month = MONTH_MAP[m[1] + '月'];
  if (!month) return null;
  
  const day = m[2].padStart(2, '0');
  const currentYear = CURRENT_YEAR;
  
  // Try current year first
  let dateStr = `${currentYear}-${month}-${day}`;
  const parsedDate = new Date(dateStr);
  const today = new Date(TODAY);
  
  // If the parsed date is in the future, use previous year
  if (parsedDate > today) {
    dateStr = `${currentYear - 1}-${month}-${day}`;
  }
  
  return dateStr;
}

// ── Stable ID from date + title ─────────────────────────────────────────
function generateId(date, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${date}-${slug}`;
}

// ── Categorize by keywords ─────────────────────────────────────────────
function categorizeNews(title, summary) {
  const t = `${title} ${summary}`.toLowerCase();
  if (/融资|投资|估值|funding/.test(t)) return 'funding';
  if (/开源|open.?source/.test(t)) return 'opensource';
  if (/agent|智能体/.test(t)) return 'agent';
  if (/模型|model|gpt|llama|claude|gemini/.test(t)) return 'model';
  if (/工具|tool|sdk|api|平台/.test(t)) return 'tool';
  if (/产品|product|发布|launch/.test(t)) return 'product';
  return 'industry';
}

// ── Extract tags ───────────────────────────────────────────────────────
function extractTags(title, summary) {
  const tags = [];
  const t = `${title} ${summary}`.toLowerCase();
  const pats = [
    [/claude/i, 'Claude'],
    [/gemini/i, 'Gemini'],
    [/openai/i, 'OpenAI'],
    [/anthropic/i, 'Anthropic'],
    [/deepseek/i, 'DeepSeek'],
    [/qwen|通义/i, '通义千问'],
    [/融资/, '融资'],
    [/开源/, '开源'],
    [/agent/i, 'Agent'],
    [/视频|video/i, '视频'],
    [/图像|image/i, '图像'],
  ];
  for (const [re, tag] of pats) {
    if (re.test(t) && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 5) break;
  }
  return tags;
}

// ── Parse HTML page ────────────────────────────────────────────────────
function parseDailyNews(html) {
  // Normalize whitespace between tags so regex works across lines
  const h = html.replace(/>\s+</g, '><').replace(/\s+/g, ' ');

  // Find all date-group positions
  const dateRe = /class="news-date">(\d+)月(\d+)·[^<]+/g;
  const dateEntries = [];
  let dm;
  while ((dm = dateRe.exec(h)) !== null) {
    dateEntries.push({
      date: parseDateLabel(dm[0].replace('class="news-date">', '')),
      pos: dm.index,
      endPos: dm.index + dm[0].length,
    });
  }

  const results = [];

  for (let i = 0; i < dateEntries.length; i++) {
    const { date, endPos } = dateEntries[i];
    if (!date) continue;
    const nextPos = i + 1 < dateEntries.length ? dateEntries[i + 1].pos : h.length;
    const section = h.slice(endPos, nextPos);

    // <h2><a href="URL" ... class="external">TITLE</a></h2><p>SUMMARY<span>来源：SRC</span></p>
    const itemRe = /<h2><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a\s*><\/h2><p[^>]*>(.*?)<\/p>/g;
    let im;
    while ((im = itemRe.exec(section)) !== null) {
      const url = im[1].trim();
      const title = im[2].trim();
      const pContent = im[3];

      const srcMatch = pContent.match(/来源[：:]([^<\s]+)/);
      const source = srcMatch ? srcMatch[1].trim() : '';

      const summary = pContent
        .replace(/<span[^>]*>.*?<\/span\s*>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);

      results.push({
        id: generateId(date, title),
        date,
        title,
        summary: summary || title,
        source,
        url,
        category: categorizeNews(title, summary),
        tags: extractTags(title, summary),
        fetchedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

// ── Load / Save ────────────────────────────────────────────────────────
function loadJson(file) {
  try {
    if (fs.existsSync(file)) {
      const d = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return Array.isArray(d) ? d : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Merge: fresh page data corrects dates/sources for matched items ────
function mergeNews(existing, fresh) {
  const keyOf = (n) => `${n.title}|${n.url}`;
  const freshByKey = new Map();
  for (const item of fresh) {
    const key = keyOf(item);
    if (!freshByKey.has(key)) freshByKey.set(key, item);
  }

  const seen = new Map();

  // Existing items — update date/source from fresh page data when matched
  for (const item of existing) {
    const key = keyOf(item);
    const freshItem = freshByKey.get(key);
    if (freshItem) {
      seen.set(key, {
        ...item,
        date: freshItem.date,
        source: freshItem.source || item.source,
        fetchedAt: freshItem.fetchedAt,
      });
    } else if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  // Fresh items not in existing — add new
  for (const item of fresh) {
    const key = keyOf(item);
    if (!seen.has(key)) seen.set(key, item);
  }

  return Array.from(seen.values()).sort(
    (a, b) =>
      b.date.localeCompare(a.date) || (b.fetchedAt || '').localeCompare(a.fetchedAt || ''),
  );
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 AI Frontline sync\n');

  const existing = loadJson(NEWS_FILE);
  console.log(`📂 Existing: ${existing.length} items`);

  // Fetch
  console.log('📡 Fetching ai-bot.cn/daily-ai-news/ ...');
  let fresh = [];
  try {
    const resp = await fetch('https://ai-bot.cn/daily-ai-news/', {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    console.log(`📄 Fetched ${(html.length / 1024).toFixed(0)} KB`);
    fresh = parseDailyNews(html);
    console.log(`📊 Parsed ${fresh.length} items from page`);
  } catch (err) {
    console.error('❌ Fetch failed:', err.message);
    console.log('⚠️ Keeping existing data unchanged.');
    process.exit(0);
  }

  if (fresh.length === 0) {
    console.log('⚠️ No items parsed. Keeping existing data.');
    process.exit(0);
  }

  // Merge
  const merged = mergeNews(existing, fresh);
  console.log(`🧹 Merged: ${merged.length} items (was ${existing.length})`);

  // Check for changes
  const oldIds = new Set(existing.map((n) => n.id));
  const newIds = new Set(merged.map((n) => n.id));
  const hasNew = merged.some((n) => !oldIds.has(n.id));

  // Save
  saveJson(NEWS_FILE, merged);
  saveJson(SOURCE_FILE, {
    name: '每日AI快讯',
    url: 'https://ai-bot.cn/daily-ai-news/',
    description: '每日 AI 资讯聚合来源，仅做标题、摘要和原文链接展示。',
    lastFetchedAt: new Date().toISOString(),
    contentStartDate: CONTENT_START_DATE,
    notice: '内容来源于 ai-bot.cn 公开信息聚合，保留原文链接与来源标注。',
  });

  if (hasNew) {
    const added = merged.filter((n) => !oldIds.has(n.id));
    console.log(`\n💾 Saved ${merged.length} items (+${added.length} new)`);
  } else {
    console.log(`\n✅ No new items. File updated with ${merged.length} items.`);
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${hasNew}\n`);
  }
}

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
