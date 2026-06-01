/**
 * build-lab-tools-pages.mjs
 * Splits src/content/lab/ai-tools.json into paginated JSON files
 * Output: public/content/lab/ai-tools/
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_FILE = path.join(ROOT, 'src', 'content', 'lab', 'ai-tools.json');
const OUTPUT_DIR = path.join(ROOT, 'public', 'content', 'lab', 'ai-tools');

const PAGE_SIZE = 60;

// Read source JSON
const aiTools = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));
const total = aiTools.length;
const totalPages = Math.ceil(total / PAGE_SIZE);

console.log(`Processing ${total} AI tools into ${totalPages} pages (page size: ${PAGE_SIZE})`);

// Clear output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Generate index.json
const indexData = {
  total,
  pageSize: PAGE_SIZE,
  pages: totalPages,
  updatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'index.json'),
  JSON.stringify(indexData, null, 2),
  'utf-8',
);
console.log('✅ Generated index.json');

// Generate page-N.json files
for (let page = 1; page <= totalPages; page++) {
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageData = aiTools.slice(start, end);

  // Add page number to each item for reference
  const pageDataWithPageNum = pageData.map((item) => ({
    ...item,
    _page: page,
  }));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `page-${page}.json`),
    JSON.stringify(pageDataWithPageNum, null, 2),
    'utf-8',
  );
}
console.log(`✅ Generated ${totalPages} page files (page-1.json to page-${totalPages}.json)`);

// Generate search-index.json (lightweight fields only)
const searchIndex = aiTools.map((item, index) => ({
  id: item.id,
  title: item.title,
  summary: item.summary,
  category: item.category,
  tags: item.tags,
  url: item.url,
  source: item.source,
  date: item.date,
  page: Math.floor(index / PAGE_SIZE) + 1,
}));

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'search-index.json'),
  JSON.stringify(searchIndex, null, 2),
  'utf-8',
);
console.log('✅ Generated search-index.json');

console.log(`\nAll files generated in: ${OUTPUT_DIR}`);
