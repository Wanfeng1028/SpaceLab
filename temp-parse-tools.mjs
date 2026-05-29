import fs from 'node:fs';

function parseAiBotListPage(htmlFile, label) {
  const raw = fs.readFileSync(htmlFile, 'utf-8');
  const h = raw.replace(/>\s+</g, '><').replace(/\s+/g, ' ');

  // Strategy: look for list-title links with title attribute
  // Pattern: <a href="URL" target="_blank" title="TOOL_NAME – DESCRIPTION" class="list-title ...">TEXT</a>
  const re = /<a\s+href="(https:\/\/ai-bot\.cn\/[^"]+)"\s+target="_blank"\s+title="([^"]+)"\s+class="list-title[^"]*"[^>]*>[^<]*<\/a>/g;

  const items = [];
  let m;
  while ((m = re.exec(h)) !== null) {
    const url = m[1];
    const titleAttr = m[2];
    // Parse title: "NAME – DESCRIPTION" or "NAME - DESCRIPTION"
    const parts = titleAttr.split(/\s*[–\-]\s*/);
    const name = parts[0]?.trim() || '';
    const desc = parts.slice(1).join(' – ').trim() || '';

    // Skip navigation-like items
    if (/^(首页|登录|注册|关于我们|免责声明|最新AI项目|AI应用商店)/.test(name)) continue;

    items.push({ name, desc, url });
  }

  console.log(`\n=== ${label} (${items.length} items) ===`);
  for (const item of items.slice(0, 15)) {
    console.log(`  ${item.name} | ${item.desc.slice(0, 60)}`);
    console.log(`    ${item.url}`);
  }
  if (items.length > 15) console.log(`  ... and ${items.length - 15} more`);

  return items;
}

const tools = parseAiBotListPage('temp-ai-tools.html', 'AI Tools');
const research = parseAiBotListPage('temp-ai-research.html', 'AI Research');

fs.writeFileSync('temp-parsed-tools.json', JSON.stringify(tools, null, 2));
fs.writeFileSync('temp-parsed-research.json', JSON.stringify(research, null, 2));
