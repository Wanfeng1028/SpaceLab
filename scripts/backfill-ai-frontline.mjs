/**
 * backfill-ai-frontline.mjs
 * 修复 AI Frontline news.json 中的 ID，确保 ID 使用真实内容日期
 *
 * ID 规则：id = `${date}-${slug(title)}`
 *
 * Usage: node scripts/backfill-ai-frontline.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NEWS_FILE = path.join(ROOT, 'src', 'content', 'ai-frontline', 'news.json');

function generateId(date, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${date}-${slug}`;
}

function fixIds(items) {
  return items.map((item) => {
    const newId = generateId(item.date, item.title);
    if (newId !== item.id) {
      console.log(`🔧 Fixed: ${item.id} → ${newId} (date=${item.date})`);
      return { ...item, id: newId };
    }
    return item;
  });
}

function main() {
  console.log('🔧 AI Frontline ID backfill\n');

  const news = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf-8'));
  console.log(`📂 Loaded ${news.length} items`);

  const fixed = fixIds(news);
  const changedCount = fixed.filter((item, i) => item.id !== news[i].id).length;

  if (changedCount === 0) {
    console.log('\n✅ No IDs needed fixing.');
    return;
  }

  fs.writeFileSync(NEWS_FILE, JSON.stringify(fixed, null, 2), 'utf-8');
  console.log(`\n💾 Saved ${fixed.length} items (${changedCount} IDs fixed)`);
}

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
