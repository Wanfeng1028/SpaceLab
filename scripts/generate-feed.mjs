/**
 * generate-feed.mjs — prebuild 阶段生成 RSS feed
 * 输出到 public/feed.xml，ng build 自动拷贝到 dist
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE_URL = 'https://wanfeng1028.github.io/SpaceLab';
const NOW = new Date().toUTCString();

function main() {
  const posts = [];

  const genPath = resolve(ROOT, 'src', 'generated', 'content.generated.ts');
  if (existsSync(genPath)) {
    try {
      const content = readFileSync(genPath, 'utf-8');
      const start = content.indexOf('export const POSTS');
      if (start >= 0) {
        const end = content.indexOf('];', start);
        const block = content.slice(start, end + 2);
        // Match slug, title, date, summary for each post
        const slugs = [...block.matchAll(/"slug":\s*"([^"]+)"/g)].map(m => m[1]);
        const titles = [...block.matchAll(/"title":\s*"([^"]+)"/g)].map(m => m[1]);
        const dates = [...block.matchAll(/"date":\s*"([^"]+)"/g)].map(m => m[1]);
        const summaries = [...block.matchAll(/"summary":\s*"([^"]+)"/g)].map(m => m[1]);

        for (let i = 0; i < slugs.length; i++) {
          posts.push({
            slug: slugs[i],
            title: titles[i] || '',
            date: dates[i] || '',
            summary: summaries[i] || '',
          });
        }
      }
    } catch (e) {
      console.warn('⚠️  feed parse warning:', e.message);
    }
  }

  // Sort by date descending
  posts.sort((a, b) => b.date.localeCompare(a.date));

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n';
  xml += '  <channel>\n';
  xml += `    <title>TesoroHome</title>\n`;
  xml += `    <link>${BASE_URL}</link>\n`;
  xml += `    <description>A personal digital space for code, science visualization and WebGL experiments.</description>\n`;
  xml += `    <language>zh-CN</language>\n`;
  xml += `    <lastBuildDate>${NOW}</lastBuildDate>\n`;
  xml += `    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>\n`;

  for (const post of posts) {
    const pubDate = new Date(post.date).toUTCString();
    xml += '    <item>\n';
    xml += `      <title><![CDATA[${post.title}]]></title>\n`;
    xml += `      <link>${BASE_URL}/blog/${post.slug}</link>\n`;
    xml += `      <guid isPermaLink="true">${BASE_URL}/blog/${post.slug}</guid>\n`;
    xml += `      <pubDate>${pubDate}</pubDate>\n`;
    if (post.summary) {
      xml += `      <description><![CDATA[${post.summary}]]></description>\n`;
    }
    xml += '    </item>\n';
  }

  xml += '  </channel>\n';
  xml += '</rss>\n';

  const outPath = resolve(ROOT, 'public', 'feed.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`✅ feed.xml — ${posts.length} posts`);
}

main();
