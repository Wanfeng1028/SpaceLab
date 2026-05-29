import fs from 'node:fs';

const raw = fs.readFileSync('temp-ai-tools.html', 'utf-8');
const h = raw.replace(/>\s+</g, '><').replace(/\s+/g, ' ');

const titleRe =
  /<h2><a\s+href="([^"]+)"[^>]*?title="([^"]*)"[^>]*?class="list-title[^"]*"[^>]*?>([\s\S]*?)<\/a\s*><\/h2>/g;
let m;
let count = 0;
while ((m = titleRe.exec(h)) !== null) {
  count++;
  const url = m[1].trim();
  const titleAttr = m[2].replace(/&#8211;/g, '–').replace(/&amp;/g, '&');
  const innerText = m[3]
    .replace(/<[^>]+>/g, '')
    .replace(/&#8211;/g, '–')
    .trim();

  const parts = titleAttr.split(/\s*[–\-]\s*/);
  const name = parts[0]?.trim() || '';
  const desc = parts.slice(1).join(' – ').trim() || '';

  const afterBlock = h.slice(m.index, m.index + 1500);
  const descMatch = afterBlock.match(/<div class="list-desc[^"]*">[^<]*<div[^>]*>(.*?)<\/div>/);
  const fullDesc = descMatch
    ? descMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : desc;

  const timeMatch = afterBlock.match(/<time[^>]*>([^<]+)<\/time>/);
  const timeLabel = timeMatch ? timeMatch[1].trim() : '';

  // Test autoCategory
  const t = `${name} ${fullDesc}`.toLowerCase();
  const cats = [];
  if (/框架|framework/.test(t)) cats.push('框架');
  if (/模型|model/.test(t)) cats.push('模型');
  if (/agent|智能体/.test(t)) cats.push('Agent');

  console.log(`\n#${count}: ${name.slice(0, 40)}`);
  console.log(`  desc: ${fullDesc.slice(0, 60)}`);
  console.log(`  time: ${timeLabel}`);
  console.log(`  autoCat: ${cats.join(',') || '(none)'}`);
}
console.log(`\nTotal: ${count}`);
