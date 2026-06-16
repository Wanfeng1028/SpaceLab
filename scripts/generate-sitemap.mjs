/**
 * generate-sitemap.mjs — prebuild 阶段生成 sitemap.xml
 * 输出到 public/sitemap.xml，ng build 会自动拷贝到 dist
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE_URL = 'https://wanfeng1028.github.io/SpaceLab';

const STATIC_ROUTES = [
  { path: '', priority: 1.0, changefreq: 'daily' },
  { path: 'blog', priority: 0.9, changefreq: 'daily' },
  { path: 'projects', priority: 0.8, changefreq: 'weekly' },
  { path: 'lab', priority: 0.7, changefreq: 'weekly' },
  { path: 'ai-frontline', priority: 0.8, changefreq: 'daily' },
  { path: 'about', priority: 0.6, changefreq: 'monthly' },
  { path: 'archive', priority: 0.5, changefreq: 'weekly' },
];

function main() {
  const posts = [];
  const projects = [];

  const genPath = resolve(ROOT, 'src', 'generated', 'content.generated.ts');
  if (existsSync(genPath)) {
    try {
      const content = readFileSync(genPath, 'utf-8');

      // POSTS
      const postStart = content.indexOf('export const POSTS');
      if (postStart >= 0) {
        const postEnd = content.indexOf('];', postStart);
        const block = postStart >= 0 && postEnd > postStart ? content.slice(postStart, postEnd + 2) : '';
        for (const m of block.matchAll(/"slug":\s*"([^"]+)"/g)) {
          if (!posts.find(p => p.slug === m[1])) posts.push({ slug: m[1], priority: 0.7, changefreq: 'monthly' });
        }
      }

      // PROJECTS
      const projStart = content.indexOf('export const PROJECTS');
      if (projStart >= 0) {
        const projEnd = content.indexOf('];', projStart);
        const block = projStart >= 0 && projEnd > projStart ? content.slice(projStart, projEnd + 2) : '';
        for (const m of block.matchAll(/"id":\s*"([^"]+)"/g)) {
          if (!projects.find(p => p.slug === m[1])) projects.push({ slug: m[1], priority: 0.6, changefreq: 'weekly' });
        }
      }
    } catch (e) {
      console.warn('⚠️  sitemap parse warning:', e.message);
    }
  }

  const now = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const r of STATIC_ROUTES) {
    xml += `  <url>\n    <loc>${BASE_URL}/${r.path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>\n`;
  }
  for (const p of posts) {
    xml += `  <url>\n    <loc>${BASE_URL}/blog/${p.slug}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority.toFixed(1)}</priority>\n  </url>\n`;
  }
  for (const p of projects) {
    xml += `  <url>\n    <loc>${BASE_URL}/projects/${p.slug}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority.toFixed(1)}</priority>\n  </url>\n`;
  }
  xml += '</urlset>\n';

  const outPath = resolve(ROOT, 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`✅ sitemap.xml — ${posts.length} posts, ${projects.length} projects`);
}

main();
