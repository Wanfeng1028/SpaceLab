/**
 * sync-lab-resources.mjs
 * Fetches AI tools and projects from ai-bot.cn and updates src/content/lab/
 *
 * Data source: https://ai-bot.cn/ai-tools/ and https://ai-bot.cn/ai-research/
 * Both pages share the same "latest items" feed on page 1.
 * We fetch page 2+ from each to get category-specific items.
 *
 * Date: 从 time 元素的相对时间（如 "3小时前"）估算
 * Category: 由来源页面决定（ai-tools → AI工具, ai-research → AI研究）
 *
 * Usage: node scripts/sync-lab-resources.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const LAB_DIR = path.join(ROOT, 'src', 'content', 'lab');
const TOOLS_FILE = path.join(LAB_DIR, 'ai-tools.json');
const PROJECTS_FILE = path.join(LAB_DIR, 'ai-projects.json');
const SOURCE_FILE = path.join(LAB_DIR, 'source.json');

const USER_AGENT = 'SpaceLabBot/1.0 (+https://github.com/Wanfeng1028/SpaceLab)';
const MAX_ITEMS = 200;
const CONTENT_START_DATE = '2026-05-25';
const TODAY = new Date().toISOString().slice(0, 10);

// ── Relative time → ISO date ──────────────────────────────────────────
function relativeTimeToDate(label) {
  if (!label) return null;
  const now = new Date();

  const minM = label.match(/(\d+)\s*分钟前/);
  if (minM) return new Date(now.getTime() - parseInt(minM[1]) * 60_000).toISOString().slice(0, 10);

  const hourM = label.match(/(\d+)\s*小时前/);
  if (hourM)
    return new Date(now.getTime() - parseInt(hourM[1]) * 3_600_000).toISOString().slice(0, 10);

  const dayM = label.match(/(\d+)\s*天前/);
  if (dayM)
    return new Date(now.getTime() - parseInt(dayM[1]) * 86_400_000).toISOString().slice(0, 10);

  const weekM = label.match(/(\d+)\s*周前/);
  if (weekM)
    return new Date(now.getTime() - parseInt(weekM[1]) * 604_800_000).toISOString().slice(0, 10);

  const monthM = label.match(/(\d+)\s*个月前/);
  if (monthM)
    return new Date(now.getTime() - parseInt(monthM[1]) * 2_592_000_000).toISOString().slice(0, 10);

  return null;
}

// ── Stable ID ─────────────────────────────────────────────────────────
function generateId(title, url) {
  return createHash('md5').update(`${title}|${url}`).digest('hex').slice(0, 12);
}

// ── Tags ──────────────────────────────────────────────────────────────
function extractTags(title, desc) {
  const tags = [];
  const t = `${title} ${desc}`;
  const pats = [
    [/开源|open.?source/i, '开源'],
    [/agent|智能体/i, 'Agent'],
    [/模型|model/i, '模型'],
    [/框架|framework/i, '框架'],
    [/图像|image/i, '图像'],
    [/视频|video/i, '视频'],
    [/编程|代码|code/i, '编程'],
    [/办公|文档/i, '办公'],
    [/claude|anthropic/i, 'Claude'],
    [/gemini|google/i, 'Google'],
    [/qwen|通义/i, '通义千问'],
    [/deepseek/i, 'DeepSeek'],
  ];
  for (const [re, tag] of pats) {
    if (re.test(t) && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 5) break;
  }
  return tags;
}

// ── Category from title keywords ──────────────────────────────────────
function autoCategory(title, desc) {
  const t = `${title} ${desc}`.toLowerCase();
  if (/框架|framework/.test(t)) return '框架';
  if (/模型|model/.test(t)) return '模型';
  if (/agent|智能体/.test(t)) return 'Agent';
  if (/图像|image/.test(t)) return '图像';
  if (/视频|video/.test(t)) return '视频';
  if (/编程|代码|code/.test(t)) return '编程';
  if (/办公|文档/.test(t)) return '办公';
  return '';
}

// ── Parse a list page ─────────────────────────────────────────────────
function parseListPage(html, defaultCategory) {
  const h = html.replace(/>\s+</g, '><').replace(/\s+/g, ' ');
  const items = [];

  // Match: <h2><a href="URL" title="NAME – DESC" class="list-title...">...</a></h2>
  // or: <h2><a href="URL" title="NAME – DESC" class="list-title text-lg...">...</a></h2>
  // followed by list-desc and list-footer with <time>
  const titleRe =
    /<h2><a\s+href="([^"]+)"[^>]*?title="([^"]*)"[^>]*?class="list-title[^"]*"[^>]*?>([\s\S]*?)<\/a\s*><\/h2>/g;
  let m;
  while ((m = titleRe.exec(h)) !== null) {
    const url = m[1].trim();
    const titleAttr = m[2].replace(/&#8211;/g, '–').replace(/&amp;/g, '&');
    const innerText = m[3]
      .replace(/<[^>]+>/g, '')
      .replace(/&#8211;/g, '–')
      .trim();

    // Parse "NAME – DESC" from title attribute (split on em-dash only, not hyphen)
    const parts = titleAttr.split(/\s*–\s*/);
    const name = parts[0]?.trim() || innerText.split(/\s*–\s*/)[0]?.trim() || '';
    const desc = parts.slice(1).join(' – ').trim() || '';

    if (!name || name.length < 2) continue;
    if (/^(首页|登录|注册|关于|免费|会员|充值|推荐)/i.test(name)) continue;

    // Find description from list-desc div
    const afterBlock = h.slice(m.index, m.index + 1500);
    const descMatch = afterBlock.match(/<div class="list-desc[^"]*">[^<]*<div[^>]*>(.*?)<\/div>/);
    const fullDesc = descMatch
      ? descMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      : desc;

    // Find time label
    const timeMatch = afterBlock.match(/<time[^>]*>([^<]+)<\/time>/);
    const timeLabel = timeMatch ? timeMatch[1].trim() : '';
    const date = relativeTimeToDate(timeLabel) || TODAY;

    let fullUrl = url;
    if (url.startsWith('/')) fullUrl = `https://ai-bot.cn${url}`;

    const tags = extractTags(name, fullDesc);
    const cat = defaultCategory;

    items.push({
      id: generateId(name, fullUrl),
      title: name.slice(0, 100),
      summary: (fullDesc || name).slice(0, 200),
      category: cat,
      tags,
      url: fullUrl,
      source: 'ai-bot.cn',
      date,
      publishedAt: '',
      fetchedAt: new Date().toISOString(),
    });
  }

  return items;
}

// ── Merge: fresh corrects dates for matched items ─────────────────────
function mergeResources(existing, fresh) {
  const keyOf = (n) => `${n.title}|${n.url}`;
  const freshByKey = new Map();
  for (const item of fresh) {
    const key = keyOf(item);
    if (!freshByKey.has(key)) freshByKey.set(key, item);
  }

  const seen = new Map();

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

  for (const item of fresh) {
    const key = keyOf(item);
    if (!seen.has(key)) seen.set(key, item);
  }

  return Array.from(seen.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// ── Fetch page ────────────────────────────────────────────────────────
async function fetchPage(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Lab resources sync\n');

  const existingTools = loadJson(TOOLS_FILE);
  const existingProjects = loadJson(PROJECTS_FILE);
  console.log(`📂 Existing: ${existingTools.length} tools, ${existingProjects.length} projects`);

  // Fetch all pages from each category
  const categories = [
    { baseUrl: 'https://ai-bot.cn/ai-tools/', cat: 'AI工具', label: 'tools' },
    { baseUrl: 'https://ai-bot.cn/ai-research/', cat: 'AI研究', label: 'research' },
  ];

  const allFresh = [];
  for (const category of categories) {
    let pageNum = 1;
    let hasItems = true;
    
    while (hasItems) {
      const url = pageNum === 1 ? category.baseUrl : `${category.baseUrl}page/${pageNum}/`;
      try {
        console.log(`📡 Fetching ${category.label}-p${pageNum}...`);
        const html = await fetchPage(url);
        const items = parseListPage(html, category.cat);
        console.log(`   ${items.length} items parsed`);
        
        if (items.length === 0) {
          hasItems = false;
          console.log(`   No more items on page ${pageNum}`);
        } else {
          allFresh.push(...items);
          pageNum++;
          await new Promise((r) => setTimeout(r, 1000)); // rate limit
        }
      } catch (err) {
        console.error(`   ❌ ${category.label}-p${pageNum}: ${err.message}`);
        hasItems = false;
      }
    }
  }

  // Deduplicate fresh by URL
  const freshByUrl = new Map();
  for (const item of allFresh) {
    if (!freshByUrl.has(item.url)) freshByUrl.set(item.url, item);
  }
  const fresh = Array.from(freshByUrl.values());
  console.log(`\n📊 Total unique fresh items: ${fresh.length}`);

  if (fresh.length === 0) {
    console.log('⚠️ No items fetched. Keeping existing data.');
    process.exit(0);
  }

  // Split by category
  const freshTools = fresh.filter((i) => i.category === 'AI工具');
  const freshProjects = fresh.filter((i) => i.category === 'AI研究');
  console.log(`   ${freshTools.length} tools, ${freshProjects.length} projects`);

  // Merge each
  const mergedTools = mergeResources(existingTools, freshTools);
  const mergedProjects = mergeResources(existingProjects, freshProjects);
  console.log(`🧹 Merged: ${mergedTools.length} tools, ${mergedProjects.length} projects`);

  // Save
  saveJson(TOOLS_FILE, mergedTools);
  saveJson(PROJECTS_FILE, mergedProjects);
  saveJson(SOURCE_FILE, {
    sources: [
      { key: 'ai-tools', name: 'AI 工具', url: 'https://ai-bot.cn/ai-tools/' },
      { key: 'ai-projects', name: 'AI 项目和框架', url: 'https://ai-bot.cn/ai-research/' },
    ],
    lastFetchedAt: new Date().toISOString(),
    contentStartDate: CONTENT_START_DATE,
    notice: '内容来源于 ai-bot.cn 公开信息聚合，仅作学习与资源导航使用，保留原文链接。',
  });

  const hasNew =
    mergedTools.length !== existingTools.length ||
    mergedProjects.length !== existingProjects.length;
  console.log(`\n💾 Saved: ${mergedTools.length} tools, ${mergedProjects.length} projects`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${hasNew}\n`);
  }
}

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

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
