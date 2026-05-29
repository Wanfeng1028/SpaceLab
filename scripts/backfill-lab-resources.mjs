/**
 * backfill-lab-resources.mjs
 * 清理 Lab 数据中的模拟数据，保留从 2026-05-25 起的真实 AI-bot 数据
 *
 * 模拟数据特征：
 * 1. ID 以 t28_、t27_、t26_、t25_ 开头（工具）
 * 2. ID 以 p28_、p27_、p26_、p25_ 开头（项目）
 * 3. fetchedAt 为固定时间（如 2026-05-28T12:00:00Z）
 * 4. summary 过于简短或类似模拟文本
 *
 * 真实数据特征：
 * - ID 为哈希值（如 7b9348e67941）或日期+slug（如 2026-05-29-anthropic-claude-opus-4-8）
 * - source 为 "ai-bot.cn"
 * - url 包含 ai-bot.cn 域名
 *
 * Usage: node scripts/backfill-lab-resources.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TOOLS_FILE = path.join(ROOT, 'src', 'content', 'lab', 'ai-tools.json');
const PROJECTS_FILE = path.join(ROOT, 'src', 'content', 'lab', 'ai-projects.json');

const CONTENT_START_DATE = '2026-05-25';

function isSimulated(item) {
  // 模拟 ID 模式
  if (/^[tp]2[5-9]_\d+$/.test(item.id)) return true;
  // 固定 fetchedAt 时间（非 ISO 格式）
  if (item.fetchedAt && item.fetchedAt.includes('T12:00:00Z')) return true;
  // 简短 summary 且无描述性内容
  if (
    item.summary &&
    item.summary.length < 30 &&
    !item.summary.includes('是') &&
    !item.summary.includes('为')
  )
    return true;
  // url 不包含 ai-bot.cn
  if (item.url && !item.url.includes('ai-bot.cn')) return true;
  return false;
}

function filterRealItems(items) {
  const real = [];
  for (const item of items) {
    if (!isSimulated(item)) {
      // 确保 date 在 CONTENT_START_DATE 之后
      const itemDate = item.date || item.publishedAt?.slice(0, 10) || item.fetchedAt?.slice(0, 10);
      if (itemDate && itemDate >= CONTENT_START_DATE) {
        real.push(item);
      }
    }
  }
  return real;
}

function loadJson(file) {
  try {
    if (fs.existsSync(file)) {
      const d = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return Array.isArray(d) ? d : [];
    }
  } catch (e) {
    console.error(`Failed to load ${file}:`, e.message);
  }
  return [];
}

function saveJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function main() {
  console.log('🧹 Lab backfill: cleaning simulated data...\n');

  // Tools
  const tools = loadJson(TOOLS_FILE);
  console.log(`📂 Tools before: ${tools.length} items`);
  const realTools = filterRealItems(tools);
  console.log(
    `✅ Tools after: ${realTools.length} items (removed ${tools.length - realTools.length} simulated)`,
  );
  saveJson(TOOLS_FILE, realTools);

  // Projects
  const projects = loadJson(PROJECTS_FILE);
  console.log(`📂 Projects before: ${projects.length} items`);
  const realProjects = filterRealItems(projects);
  console.log(
    `✅ Projects after: ${realProjects.length} items (removed ${projects.length - realProjects.length} simulated)`,
  );
  saveJson(PROJECTS_FILE, realProjects);

  console.log('\n✅ Lab data cleaned successfully.');
  console.log(`   Tools: ${realTools.length} items`);
  console.log(`   Projects: ${realProjects.length} items`);
}

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
