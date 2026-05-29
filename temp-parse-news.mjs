import fs from 'node:fs';
const h = fs.readFileSync('temp-daily-news.html', 'utf-8');

// Split by news-list sections
const sections = h.split(/<div class="news-list">/);
const year = 2026;
const dateMap = {
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

const results = [];

for (const section of sections) {
  const dateMatch = section.match(/news-date">(\d+)月(\d+)·[^<]+/);
  if (!dateMatch) continue;

  const month = dateMap[dateMatch[1] + '月'];
  const day = dateMatch[2].padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // Extract items
  const items = [
    ...section.matchAll(
      /<h2>\s*<a[^>]*href="([^"]+)"[^>]*class="external"[^>]*>([^<]+)<\/a>\s*<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/g,
    ),
  ];

  for (const item of items) {
    const url = item[1].trim();
    const title = item[2].trim();
    const pContent = item[3].trim();

    // Extract source from <span class="news-time">
    const sourceMatch = pContent.match(/来源[：:]([^<]+)/);
    const source = sourceMatch ? sourceMatch[1].trim() : '';

    // Extract summary (text before source span)
    const summary = pContent
      .replace(/<span[^>]*news-time[^>]*>[\s\S]*?<\/span>/, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    results.push({ date: dateStr, title, summary, source, url });
  }
}

// Only keep >= 2026-05-25
const filtered = results.filter((r) => r.date >= '2026-05-25');
console.log(`Total items: ${results.length}, after filter (>=2026-05-25): ${filtered.length}\n`);

for (const r of filtered) {
  console.log(`${r.date} | ${r.source || '(无来源)'} | ${r.title}`);
  if (r.summary && r.summary !== r.title) {
    console.log(`  摘要: ${r.summary.slice(0, 80)}...`);
  }
  console.log(`  链接: ${r.url}`);
  console.log();
}

// Save as JSON for reference
fs.writeFileSync('temp-parsed-news.json', JSON.stringify(filtered, null, 2), 'utf-8');
