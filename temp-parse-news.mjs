import fs from 'node:fs';
const raw = fs.readFileSync('temp-daily-news.html', 'utf-8');

// Normalize: collapse all whitespace between tags
const h = raw.replace(/>\s+</g, '><').replace(/\s+/g, ' ');

// Find all news-date positions
const datePattern = /class="news-date">(\d+)月(\d+)·[^<]+/g;
const dateEntries = [];
let dm;
while ((dm = datePattern.exec(h)) !== null) {
  dateEntries.push({
    month: dm[1].padStart(2, '0'),
    day: dm[2].padStart(2, '0'),
    pos: dm.index,
    endPos: dm.index + dm[0].length,
  });
}

console.log(`Found ${dateEntries.length} date sections`);

const results = [];

for (let i = 0; i < dateEntries.length; i++) {
  const entry = dateEntries[i];
  const dateStr = `2026-${entry.month}-${entry.day}`;
  const nextPos = i + 1 < dateEntries.length ? dateEntries[i + 1].pos : h.length;
  const section = h.slice(entry.endPos, nextPos);

  // Pattern: <h2><a href="URL" ... class="external">TITLE</a></h2><p ...>SUMMARY<span ...>来源：SRC</span></p>
  const re =
    /<h2><a[^>]*href="([^"]+)"[^>]*class="external"[^>]*>([^<]+)<\/a><\/h2><p[^>]*>(.*?)<\/p>/g;
  let m;
  while ((m = re.exec(section)) !== null) {
    const url = m[1].trim();
    const title = m[2].trim();
    const pContent = m[3];
    const srcMatch = pContent.match(/来源[：:]([^<]+)/);
    const source = srcMatch ? srcMatch[1].trim() : '';
    const summary = pContent
      .replace(/<span[^>]*>.*?<\/span>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    results.push({ date: dateStr, title, summary, source, url });
  }
}

const filtered = results.filter((r) => r.date >= '2026-05-25');
console.log(`Total: ${results.length}, >=2026-05-25: ${filtered.length}\n`);

// Group by date
const byDate = {};
for (const r of filtered) {
  (byDate[r.date] ??= []).push(r);
}
for (const [date, items] of Object.entries(byDate).sort()) {
  console.log(`\n${date} (${items.length} items):`);
  for (const r of items) {
    console.log(`  ${r.source || '(无来源)'} | ${r.title}`);
    console.log(`    ${r.url}`);
  }
}

fs.writeFileSync('temp-parsed-news.json', JSON.stringify(filtered, null, 2), 'utf-8');
