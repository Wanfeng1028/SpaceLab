import fs from 'node:fs';

function parseListPage(htmlFile, label) {
  const raw = fs.readFileSync(htmlFile, 'utf-8');

  // Normalize whitespace
  const h = raw.replace(/>\s+</g, '><').replace(/\s+/g, ' ');

  // Find all list-title links
  // Pattern: ... class="list-title ..." ... >[<span...>badge</span>]NAME &#8211; DESC</a>
  const re = /<a[^>]*href="([^"]+)"[^>]*class="list-title[^"]*"[^>]*>(.*?)<\/a\s*>/g;

  const items = [];
  let m;
  while ((m = re.exec(h)) !== null) {
    const url = m[1].trim();
    let inner = m[2];

    // Remove badge spans
    inner = inner.replace(/<span[^>]*>.*?<\/span\s*>/g, '');

    // Clean HTML entities
    inner = inner
      .replace(/&#8211;/g, '–')
      .replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, '');

    const text = inner.replace(/\s+/g, ' ').trim();

    // Split by – or -
    const parts = text.split(/\s*[–\-]\s*/);
    const name = parts[0]?.trim() || '';
    const desc = parts.slice(1).join(' – ').trim() || '';

    if (!name || name.length < 2) continue;
    if (/^(首页|登录|注册|关于我们|免责声明|最新AI项目|AI应用商店|全部|推荐|免费)/.test(name))
      continue;

    let fullUrl = url;
    if (url.startsWith('/')) fullUrl = `https://ai-bot.cn${url}`;

    items.push({ name, desc, url: fullUrl });
  }

  // Also find <time> elements for relative times
  const timeRe = /<time[^>]*>([^<]+)<\/time>/g;
  const times = [];
  let tm;
  while ((tm = timeRe.exec(h)) !== null) {
    times.push(tm[1].trim());
  }

  console.log(`\n=== ${label} ===`);
  console.log(`Items: ${items.length}, Times: ${times.length}`);
  items.slice(0, 5).forEach((item, i) => {
    console.log(`  #${i + 1}: ${item.name} | ${item.desc.slice(0, 60)}`);
    console.log(`    ${item.url}`);
    if (times[i]) console.log(`    time: ${times[i]}`);
  });
  if (items.length > 5) console.log(`  ... and ${items.length - 5} more`);

  return items;
}

const tools = parseListPage('temp-ai-tools.html', 'AI Tools');
const research = parseListPage('temp-ai-research.html', 'AI Research');

fs.writeFileSync('temp-parsed-tools.json', JSON.stringify(tools, null, 2));
fs.writeFileSync('temp-parsed-research.json', JSON.stringify(research, null, 2));
