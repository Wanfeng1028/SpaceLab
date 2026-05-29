/**
 * check-ids.mjs
 * 检查 news.json 中的 ID 是否符合 date-slug 规则
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NEWS_FILE = path.join(ROOT, 'src', 'content', 'ai-frontline', 'news.json');

function checkIds() {
  const news = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf-8'));
  console.log(`Checking ${news.length} items...\n`);

  let mismatched = 0;
  for (const item of news) {
    const id = item.id;
    const date = item.date;
    if (!id.startsWith(date)) {
      console.log(`❌ ID mismatch: id=${id}, date=${date}`);
      mismatched++;
    }
  }

  if (mismatched === 0) {
    console.log('✅ All IDs match their date field.');
  } else {
    console.log(`\n⚠️  Found ${mismatched} mismatched IDs.`);
  }
}

checkIds();
