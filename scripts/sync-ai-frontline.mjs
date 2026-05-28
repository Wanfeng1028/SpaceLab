/**
 * sync-ai-frontline.mjs
 * Fetches AI news from ai-bot.cn and updates src/content/ai-frontline/news.json
 *
 * Usage: node scripts/sync-ai-frontline.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NEWS_FILE = path.join(ROOT, 'src', 'content', 'ai-frontline', 'news.json');
const SOURCE_FILE = path.join(ROOT, 'src', 'content', 'ai-frontline', 'source.json');

// User-Agent for respectful crawling
const USER_AGENT = 'SpaceLabBot/1.0 (+https://github.com/Wanfeng1028/SpaceLab)';

// Maximum news items to keep
const MAX_NEWS_ITEMS = 200;
const MAX_DAYS_OLD = 30;

/**
 * Generate a stable ID from date and title
 */
function generateId(date, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${date}-${slug}`;
}

/**
 * Categorize news based on title and content
 */
function categorizeNews(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();

  if (
    text.includes('融资') ||
    text.includes('投资') ||
    text.includes('估值') ||
    text.includes('funding')
  ) {
    return 'funding';
  }
  if (text.includes('开源') || text.includes('open source') || text.includes('github')) {
    return 'opensource';
  }
  if (text.includes('agent') || text.includes('智能体')) {
    return 'agent';
  }
  if (
    text.includes('模型') ||
    text.includes('model') ||
    text.includes('gpt') ||
    text.includes('llama') ||
    text.includes('claude') ||
    text.includes('gemini')
  ) {
    return 'model';
  }
  if (
    text.includes('工具') ||
    text.includes('tool') ||
    text.includes('sdk') ||
    text.includes('api') ||
    text.includes('平台')
  ) {
    return 'tool';
  }
  if (
    text.includes('产品') ||
    text.includes('product') ||
    text.includes('发布') ||
    text.includes('launch')
  ) {
    return 'product';
  }
  return 'industry';
}

/**
 * Extract tags from title and summary
 */
function extractTags(title, summary) {
  const tags = [];
  const text = `${title} ${summary}`.toLowerCase();

  const tagPatterns = [
    { pattern: /gpt[-\s]?[45]/i, tag: 'GPT' },
    { pattern: /claude/i, tag: 'Claude' },
    { pattern: /gemini/i, tag: 'Gemini' },
    { pattern: /llama/i, tag: 'Llama' },
    { pattern: /openai/i, tag: 'OpenAI' },
    { pattern: /anthropic/i, tag: 'Anthropic' },
    { pattern: /google/i, tag: 'Google' },
    { pattern: /meta/i, tag: 'Meta' },
    { pattern: /microsoft/i, tag: 'Microsoft' },
    { pattern: /nvidia/i, tag: 'NVIDIA' },
    { pattern: /字节跳动|doubao/i, tag: '字节跳动' },
    { pattern: /融资|funding/i, tag: '融资' },
    { pattern: /开源|open.?source/i, tag: '开源' },
    { pattern: /agent/i, tag: 'Agent' },
    { pattern: /视频生成|video/i, tag: '视频生成' },
    { pattern: /图像生成|image/i, tag: '图像生成' },
    { pattern: /代码|coding/i, tag: '代码' },
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
 * Truncate summary to max length
 */
function truncateSummary(summary, maxLength = 140) {
  if (!summary) return '';
  const cleaned = summary.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Load existing news data
 */
function loadExistingNews() {
  try {
    if (fs.existsSync(NEWS_FILE)) {
      const data = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf-8'));
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.warn('⚠️ Failed to load existing news:', error.message);
  }
  return [];
}

/**
 * Save news data
 */
function saveNews(news) {
  fs.mkdirSync(path.dirname(NEWS_FILE), { recursive: true });
  fs.writeFileSync(NEWS_FILE, JSON.stringify(news, null, 2), 'utf-8');
}

/**
 * Save source info
 */
function saveSource(source) {
  fs.mkdirSync(path.dirname(SOURCE_FILE), { recursive: true });
  fs.writeFileSync(SOURCE_FILE, JSON.stringify(source, null, 2), 'utf-8');
}

/**
 * Check if news data has changed
 */
function hasNewsChanged(oldNews, newNews) {
  if (oldNews.length !== newNews.length) return true;

  const oldIds = new Set(oldNews.map((n) => n.id));
  const newIds = new Set(newNews.map((n) => n.id));

  // Check for new items
  for (const id of newIds) {
    if (!oldIds.has(id)) return true;
  }

  // Check for modified items
  const oldMap = new Map(oldNews.map((n) => [n.id, n]));
  for (const item of newNews) {
    const oldItem = oldMap.get(item.id);
    if (!oldItem) return true;
    if (oldItem.title !== item.title || oldItem.summary !== item.summary) {
      return true;
    }
  }

  return false;
}

/**
 * Deduplicate and clean news
 */
function cleanNews(news) {
  const seen = new Map();

  for (const item of news) {
    const key = `${item.title}|${item.url}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  // Sort by date descending, then by fetchedAt
  const sorted = Array.from(seen.values()).sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.fetchedAt.localeCompare(a.fetchedAt);
  });

  // Filter old items
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_DAYS_OLD);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const filtered = sorted.filter((item) => item.date >= cutoffStr);

  // Limit count
  return filtered.slice(0, MAX_NEWS_ITEMS);
}

/**
 * Parse HTML and extract news items
 * Note: This is a simplified parser. For production, consider using cheerio or similar.
 */
async function fetchAndParseNews() {
  console.log('📡 Fetching AI news from ai-bot.cn...');

  try {
    const response = await fetch('https://ai-bot.cn/daily-ai-news/', {
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
    console.log(`📄 Fetched ${html.length} bytes`);

    // Parse HTML to extract news
    // This is a simplified parser - in production, use a proper HTML parser
    const newsItems = [];

    // Try to extract news items using regex patterns
    // Pattern for date groups: <h2>2026-05-29</h2> or similar
    const datePattern = /<h[23][^>]*>(\d{4}-\d{2}-\d{2})[^<]*<\/h[23]>/gi;
    const dates = [];
    let match;

    while ((match = datePattern.exec(html)) !== null) {
      dates.push({ date: match[1], index: match.index });
    }

    // Pattern for news items - looking for links with titles
    // Adjust these patterns based on actual page structure
    const itemPattern = /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;

    // Simple extraction - look for news-like patterns
    const linkPattern = /<a\s+[^>]*href="(https?:\/\/[^"]+)"[^>]*>\s*([^<]{10,100})\s*<\/a>/gi;
    const links = [];

    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();

      // Skip navigation and non-news links
      if (url.includes('ai-bot.cn') && !url.includes('daily-ai-news')) continue;
      if (title.length < 10) continue;
      if (url.includes('javascript:') || url.startsWith('#')) continue;

      links.push({ url, title });
    }

    // Process extracted links as news items
    const today = new Date().toISOString().slice(0, 10);

    for (const link of links.slice(0, 50)) {
      const { url, title } = link;

      // Try to find associated summary (simplified)
      const summary = ''; // Would need more complex parsing

      const newsItem = {
        id: generateId(today, title),
        date: today,
        title: title,
        summary: truncateSummary(summary || title),
        source: 'AI工具集',
        url: url,
        category: categorizeNews(title, summary),
        tags: extractTags(title, summary),
        fetchedAt: new Date().toISOString(),
      };

      newsItems.push(newsItem);
    }

    console.log(`📊 Extracted ${newsItems.length} news items`);
    return newsItems;
  } catch (error) {
    console.error('❌ Failed to fetch news:', error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting AI Frontline sync...\n');

  // Load existing news
  const existingNews = loadExistingNews();
  console.log(`📂 Loaded ${existingNews.length} existing news items`);

  // Fetch new news
  const newNews = await fetchAndParseNews();

  if (!newNews || newNews.length === 0) {
    console.log('\n⚠️ No news fetched. Keeping existing data.');

    // Update source timestamp even if no news fetched
    const source = {
      name: 'AI工具集 每日AI快讯',
      url: 'https://ai-bot.cn/daily-ai-news/',
      description: '每日 AI 资讯聚合来源，仅做标题、摘要和原文链接展示。',
      lastFetchedAt: new Date().toISOString(),
      notice: '内容来源于公开网络信息聚合，保留原文链接与来源标注。',
    };
    saveSource(source);
    console.log('📝 Updated source timestamp');

    process.exit(0);
  }

  // Clean and deduplicate
  const cleanedNews = cleanNews([...newNews, ...existingNews]);
  console.log(`🧹 Cleaned to ${cleanedNews.length} items`);

  // Check for changes
  const hasChanged = hasNewsChanged(existingNews, cleanedNews);

  if (!hasChanged) {
    console.log('\n✅ No changes detected. Skipping update.');

    // Update source timestamp
    const source = {
      name: 'AI工具集 每日AI快讯',
      url: 'https://ai-bot.cn/daily-ai-news/',
      description: '每日 AI 资讯聚合来源，仅做标题、摘要和原文链接展示。',
      lastFetchedAt: new Date().toISOString(),
      notice: '内容来源于公开网络信息聚合，保留原文链接与来源标注。',
    };
    saveSource(source);
    console.log('📝 Updated source timestamp');

    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'changed=false\n');
    }

    process.exit(0);
  }

  // Save news
  saveNews(cleanedNews);
  console.log(`\n💾 Saved ${cleanedNews.length} news items to news.json`);

  // Save source info
  const source = {
    name: 'AI工具集 每日AI快讯',
    url: 'https://ai-bot.cn/daily-ai-news/',
    description: '每日 AI 资讯聚合来源，仅做标题、摘要和原文链接展示。',
    lastFetchedAt: new Date().toISOString(),
    notice: '内容来源于公开网络信息聚合，保留原文链接与来源标注。',
  };
  saveSource(source);
  console.log('📝 Saved source info to source.json');

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'changed=true\n');
  }

  console.log('\n✅ Sync complete!');
}

// Run
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
