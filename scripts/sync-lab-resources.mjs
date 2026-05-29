/**
 * sync-lab-resources.mjs
 * Fetches AI tools and projects from ai-bot.cn and updates src/content/lab/
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
const MAX_ITEMS = 100;
const REQUEST_DELAY_MS = 2000;

/**
 * Sources configuration
 */
const SOURCES = [
  {
    key: 'ai-tools',
    name: 'AI 工具',
    url: 'https://ai-bot.cn/ai-tools/',
    targetFile: TOOLS_FILE,
  },
  {
    key: 'ai-projects',
    name: 'AI 项目和框架',
    url: 'https://ai-bot.cn/ai-research/',
    targetFile: PROJECTS_FILE,
  },
];

/**
 * Generate a stable ID from title + url
 */
function generateId(title, url) {
  const input = `${title}|${url}`;
  return createHash('md5').update(input).digest('hex').slice(0, 12);
}

/**
 * Truncate summary to 80-140 chars
 */
function truncateSummary(summary, minLen = 80, maxLen = 140) {
  if (!summary) return '';
  const cleaned = summary.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned.length < minLen ? cleaned : cleaned;
  return cleaned.slice(0, maxLen - 3).trim() + '...';
}

/**
 * Extract tags from title and summary
 */
function extractTags(title, summary) {
  const tags = [];
  const text = `${title} ${summary}`;

  const tagPatterns = [
    { pattern: /开源|open.?source/i, tag: '开源' },
    { pattern: /agent|智能体/i, tag: 'Agent' },
    { pattern: /模型|model/i, tag: '模型' },
    { pattern: /框架|framework/i, tag: '框架' },
    { pattern: /工具|tool/i, tag: '工具' },
    { pattern: /图像|image|画图|绘图/i, tag: '图像' },
    { pattern: /视频|video/i, tag: '视频' },
    { pattern: /编程|代码|coding|code/i, tag: '编程' },
    { pattern: /办公|文档|office/i, tag: '办公' },
    { pattern: /gpt|openai/i, tag: 'OpenAI' },
    { pattern: /claude|anthropic/i, tag: 'Claude' },
    { pattern: /gemini|google/i, tag: 'Google' },
    { pattern: /llama|meta/i, tag: 'Meta' },
    { pattern: /qwen|通义/i, tag: '通义千问' },
    { pattern: /deepseek|深度求索/i, tag: 'DeepSeek' },
    { pattern: /机器人|robot/i, tag: '机器人' },
    { pattern: /VLA|具身/i, tag: 'VLA' },
  ];

  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(text) && !tags.includes(tag)) {
      tags.push(tag);
    }
    if (tags.length >= 5) break;
  }

  return tags;
}

/**
 * Categorize resource based on title and summary
 */
function categorizeResource(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();

  if (text.includes('agent') || text.includes('智能体')) return 'Agent';
  if (text.includes('框架') || text.includes('framework')) return '框架';
  if (text.includes('模型') || text.includes('model')) return '模型';
  if (text.includes('开源') || text.includes('open source')) return '开源';
  if (text.includes('图像') || text.includes('image') || text.includes('画图')) return '图像';
  if (text.includes('视频') || text.includes('video')) return '视频';
  if (text.includes('办公') || text.includes('文档')) return '办公';
  if (text.includes('编程') || text.includes('代码') || text.includes('code')) return '编程';
  if (text.includes('平台') || text.includes('platform')) return 'AI项目';

  return 'AI工具';
}

/**
 * Load existing JSON data safely
 */
function loadExisting(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.warn(`⚠️ Failed to load ${path.basename(filePath)}:`, error.message);
  }
  return [];
}

/**
 * Save JSON data
 */
function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Check if data has changed
 */
function hasChanged(oldData, newData) {
  if (oldData.length !== newData.length) return true;

  const oldMap = new Map(oldData.map((item) => [item.id, item]));
  for (const item of newData) {
    const old = oldMap.get(item.id);
    if (!old) return true;
    if (old.title !== item.title || old.summary !== item.summary) return true;
  }
  return false;
}

/**
 * Deduplicate by title + url
 */
function deduplicate(items) {
  const seen = new Map();
  for (const item of items) {
    const key = `${item.title}|${item.url}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

/**
 * Parse HTML and extract resource entries
 */
function parseResourcesFromHtml(html, sourceKey) {
  const items = [];
  const now = new Date().toISOString();

  // Strategy 1: Look for article/card patterns with links
  // ai-bot.cn typically uses patterns like:
  // <a href="/a/xxx/"> <h3>Title</h3> <p>desc</p> </a>
  // or card-based layouts with images and text

  // Pattern: links with href containing /a/ (article pages)
  const linkBlocks = [];
  // Match blocks that contain a link and surrounding text
  const blockPattern = /<a[^>]*href="([^"]*(?:\/a\/|ai-bot\.cn\/a\/)[^"]*)"[^>]*>[\s\S]*?<\/a>/gi;
  let match;

  while ((match = blockPattern.exec(html)) !== null) {
    const block = match[0];
    const url = match[1];

    // Extract title from h2/h3/h4 or strong or the link text itself
    const titleMatch = block.match(/<h[234][^>]*>([^<]+)<\/h[234]>/i);
    const strongMatch = block.match(/<strong[^>]*>([^<]+)<\/strong>/i);
    const linkTextMatch = block.match(/>([^<]{5,100})<\//);

    let title = '';
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else if (strongMatch) {
      title = strongMatch[1].trim();
    } else if (linkTextMatch) {
      title = linkTextMatch[1].replace(/\s+/g, ' ').trim();
    }

    if (!title || title.length < 3) continue;

    // Skip navigation-like links
    if (/^(首页|登录|注册|关于|联系|更多|返回)/.test(title)) continue;

    // Try to extract description from nearby p tags
    const descMatch = block.match(/<p[^>]*>([^<]{10,200})<\/p>/i);
    let summary = descMatch ? descMatch[1].replace(/\s+/g, ' ').trim() : '';

    // Normalize URL
    let fullUrl = url;
    if (url.startsWith('/')) {
      fullUrl = `https://ai-bot.cn${url}`;
    }

    const id = generateId(title, fullUrl);
    const tags = extractTags(title, summary);
    const category = categorizeResource(title, summary);

    linkBlocks.push({
      id,
      title: title.slice(0, 100),
      summary: truncateSummary(summary),
      category,
      source: '',
      url: fullUrl,
      tags,
      publishedAt: '',
      fetchedAt: now,
    });
  }

  // Strategy 2: Look for list items or card structures
  if (linkBlocks.length < 5) {
    // Fallback: broader pattern for any meaningful links
    const broadPattern = /<a[^>]*href="(https?:\/\/ai-bot\.cn\/[^"]+)"[^>]*>([^<]{8,80})<\/a>/gi;
    while ((match = broadPattern.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].replace(/\s+/g, ' ').trim();

      if (title.length < 5) continue;
      if (/^(首页|登录|注册|关于|联系|更多|返回|导航)/.test(title)) continue;
      if (url.includes('login') || url.includes('signup') || url.includes('tag/')) continue;

      const id = generateId(title, url);
      const tags = extractTags(title, '');
      const category = categorizeResource(title, '');

      linkBlocks.push({
        id,
        title: title.slice(0, 100),
        summary: truncateSummary(title),
        category,
        source: '',
        url,
        tags,
        publishedAt: '',
        fetchedAt: now,
      });
    }
  }

  return deduplicate(linkBlocks).slice(0, MAX_ITEMS);
}

/**
 * Fetch and parse a single source
 */
async function fetchSource(source) {
  console.log(`📡 Fetching ${source.name} from ${source.url}...`);

  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`📄 Fetched ${(html.length / 1024).toFixed(1)} KB from ${source.url}`);

    const items = parseResourcesFromHtml(html, source.key);
    console.log(`📊 Extracted ${items.length} items from ${source.name}`);

    return items;
  } catch (error) {
    console.error(`❌ Failed to fetch ${source.name}:`, error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Lab resources sync...\n');

  const fetchedAt = new Date().toISOString();
  let totalChanged = false;

  for (const source of SOURCES) {
    const existing = loadExisting(source.targetFile);
    console.log(
      `📂 Loaded ${existing.length} existing items from ${path.basename(source.targetFile)}`,
    );

    const newItems = await fetchSource(source);

    if (!newItems || newItems.length === 0) {
      console.log(`⚠️ No items fetched from ${source.name}. Keeping existing data.\n`);

      // Delay between requests
      if (SOURCES.indexOf(source) < SOURCES.length - 1) {
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
      }
      continue;
    }

    // Merge: new items + existing items, deduplicate, limit
    const merged = deduplicate([...newItems, ...existing]).slice(0, MAX_ITEMS);

    if (hasChanged(existing, merged)) {
      saveJson(source.targetFile, merged);
      console.log(`💾 Saved ${merged.length} items to ${path.basename(source.targetFile)}`);
      totalChanged = true;
    } else {
      console.log(`✅ No changes in ${path.basename(source.targetFile)}. Skipping write.`);
    }

    // Delay between requests
    if (SOURCES.indexOf(source) < SOURCES.length - 1) {
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  // Update source.json
  const sourceInfo = {
    sources: SOURCES.map((s) => ({
      key: s.key,
      name: s.name,
      url: s.url,
      targetFile: s.targetFile.replace(ROOT.replace(/\\/g, '/') + '/', ''),
    })),
    lastFetchedAt: fetchedAt,
    notice: '内容来源于公开网络信息聚合，仅作学习与资源导航使用，保留原文链接与来源标注。',
  };
  saveJson(SOURCE_FILE, sourceInfo);
  console.log('📝 Updated source.json');

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${totalChanged}\n`);
  }

  if (totalChanged) {
    console.log('\n✅ Sync complete! Changes detected and saved.');
  } else {
    console.log('\n✅ Sync complete! No changes detected.');
  }
}

// Run
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
