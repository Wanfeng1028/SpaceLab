/**
 * generate-daily-stats.mjs
 *
 * 每日统计生成脚本
 * 读取项目内容数据，生成当日统计条目追加到 docs/daily-log.md
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GENERATED_PATH = join(ROOT, 'src/generated/content.generated.ts');
const AI_SOURCE_PATH = join(ROOT, 'src/content/ai-frontline/source.json');
const LOG_PATH = join(ROOT, 'docs/daily-log.md');

// ── 读取 content.generated.ts 中的数量 ──────────────────────────────

function countExportedItems(content, exportName) {
  // 匹配 export const XXX: Type = [
  const regex = new RegExp(`export const ${exportName}[^=]*=\\s*\\[`, 'g');
  const match = regex.exec(content);
  if (!match) return 0;

  // 从匹配位置开始计算数组元素数量
  const startIdx = match.index + match[0].length;
  let depth = 1;
  let count = 0;
  let inString = false;
  let stringChar = '';

  for (let i = startIdx; i < content.length && depth > 0; i++) {
    const ch = content[i];

    // 处理字符串
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = true;
      stringChar = ch;
    } else if (inString && ch === stringChar && content[i - 1] !== '\\') {
      inString = false;
    }

    if (inString) continue;

    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) break;
    }
    // 计数顶层对象 (以 { 开始)
    else if (ch === '{' && depth === 1) {
      count++;
    }
  }

  return count;
}

function getContentStats() {
  try {
    const content = readFileSync(GENERATED_PATH, 'utf-8');
    return {
      posts: countExportedItems(content, 'POSTS'),
      projects: countExportedItems(content, 'PROJECTS'),
      aiNews: countExportedItems(content, 'AI_FRONTLINE_NEWS'),
      gallery: countExportedItems(content, 'GALLERY'),
      labTools: countExportedItems(content, 'LAB_AI_TOOLS'),
      labProjects: countExportedItems(content, 'LAB_AI_PROJECTS'),
    };
  } catch (err) {
    console.error('Failed to read content.generated.ts:', err.message);
    return { posts: 0, projects: 0, aiNews: 0, gallery: 0, labTools: 0, labProjects: 0 };
  }
}

// ── 读取 AI 前线同步时间 ─────────────────────────────────────────────

function getAiSyncTime() {
  try {
    const source = JSON.parse(readFileSync(AI_SOURCE_PATH, 'utf-8'));
    return source.lastFetchedAt || 'N/A';
  } catch {
    return 'N/A';
  }
}

// ── 生成当日统计条目 ─────────────────────────────────────────────────

function generateEntry() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toISOString().split('T')[1].split('.')[0];

  const stats = getContentStats();
  const aiSync = getAiSyncTime();

  return `
## ${date}

> 🕐 Generated at ${time} UTC

| Category | Count |
|----------|-------|
| 📝 Posts | ${stats.posts} |
| 🚀 Projects | ${stats.projects} |
| 🤖 AI News | ${stats.aiNews} |
| 🖼️ Gallery | ${stats.gallery} |
| 🔧 Lab Tools | ${stats.labTools} |
| 🧪 Lab Projects | ${stats.labProjects} |

**Content Sync Status:**
- AI Frontline Last Sync: ${aiSync}
- Build Mode: GitHub Pages (Static)

**Analytics:**
- PV/UV: Not available (no analytics backend)
- Data Source: Content as Code (Markdown + JSON)

---
`;
}

// ── 主逻辑 ───────────────────────────────────────────────────────────

function main() {
  // 确保 docs 目录存在
  const docsDir = join(ROOT, 'docs');
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
  }

  // 如果日志文件不存在，创建并添加头部
  if (!existsSync(LOG_PATH)) {
    const header = `# 📊 SpaceLab Daily Stats

> Auto-generated daily statistics log
> Updated by GitHub Actions

---

`;
    writeFileSync(LOG_PATH, header, 'utf-8');
  }

  // 检查今天是否已经记录过
  const today = new Date().toISOString().split('T')[0];
  const existing = readFileSync(LOG_PATH, 'utf-8');
  if (existing.includes(`## ${today}`)) {
    console.log(`Stats for ${today} already exists, skipping.`);
    return;
  }

  // 追加当日统计
  const entry = generateEntry();
  appendFileSync(LOG_PATH, entry, 'utf-8');
  console.log(`✅ Daily stats for ${today} appended to docs/daily-log.md`);
}

main();
