import fs from 'node:fs';

function parseListPage(htmlFile) {
  const raw = fs.readFileSync(htmlFile, 'utf-8');
  const h = raw.replace(/>\s+</g, '><').replace(/\s+/g, ' ');

  const items = [];

  // Match full list-item blocks: from list-item to closing div
  // Pattern: each item is <div class="list-item card">...</div></div></div>
  // We need to find list-title links and their surrounding context

  const titleRe =
    /<h2><a\s+href="([^"]+)"[^>]*title="([^"]*)"[^>]*class="list-title[^"]*"[^>]*>(.*?)<\/a\s*><\/h2>/g;
  let m;
  while ((m = titleRe.exec(h)) !== null) {
    const url = m[1].trim();
    const titleAttr = m[2];
    const innerHtml = m[3];

    // Clean inner HTML
    let text = innerHtml
      .replace(/<[^>]+>/g, '')
      .replace(/&#8211;/g, '–')
      .trim();

    // Parse title attribute which has "NAME – DESCRIPTION"
    const parts = titleAttr.split(/\s*[–\-]\s*/);
    const name = parts[0]?.trim() || text.split(/\s*[–\-]\s*/)[0]?.trim() || '';
    const desc = parts.slice(1).join(' – ').trim() || '';

    if (!name || name.length < 2) continue;

    // Find the description in the nearby list-desc div
    const afterTitle = h.slice(m.index, m.index + 1000);
    const descMatch = afterTitle.match(/<div class="list-desc[^"]*">[^<]*<div[^>]*>(.*?)<\/div>/);
    const fullDesc = descMatch
      ? descMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      : desc;

    // Find category in footer
    const catMatch = afterTitle.match(/分类[^<]*<a[^>]*>([^<]+)<\/a>/);
    const category = catMatch ? catMatch[1].trim() : '';

    // Find time
    const timeMatch = afterTitle.match(/<time[^>]*>([^<]+)<\/time>/);
    const timeLabel = timeMatch ? timeMatch[1].trim() : '';

    let fullUrl = url;
    if (url.startsWith('/')) fullUrl = `https://ai-bot.cn${url}`;

    items.push({ name, desc: fullDesc || desc, url: fullUrl, category, timeLabel });
  }

  return items;
}

const tools = parseListPage('temp-ai-tools.html');
const research = parseListPage('temp-ai-research.html');

console.log(`\n=== AI Tools (${tools.length}) ===`);
tools.slice(0, 5).forEach((t, i) => {
  console.log(`  ${i + 1}. [${t.category}] ${t.name} | ${t.desc.slice(0, 50)} | ${t.timeLabel}`);
});

console.log(`\n=== AI Research (${research.length}) ===`);
research.slice(0, 5).forEach((t, i) => {
  console.log(`  ${i + 1}. [${t.category}] ${t.name} | ${t.desc.slice(0, 50)} | ${t.timeLabel}`);
});

// Check if they share items
const toolUrls = new Set(tools.map((t) => t.url));
const researchUrls = new Set(research.map((t) => t.url));
const shared = tools.filter((t) => researchUrls.has(t.url));
console.log(
  `\nShared items: ${shared.length} / tools: ${tools.length} / research: ${research.length}`,
);

// Check categories
const toolCats = tools.map((t) => t.category);
const researchCats = research.map((t) => t.category);
console.log('Tool categories:', [...new Set(toolCats)]);
console.log('Research categories:', [...new Set(researchCats)]);

fs.writeFileSync('temp-parsed-tools.json', JSON.stringify(tools, null, 2));
fs.writeFileSync('temp-parsed-research.json', JSON.stringify(research, null, 2));
