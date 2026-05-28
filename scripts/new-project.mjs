/**
 * new-project.mjs
 * Usage: npm run new:project "项目名称"
 */
import fs from 'node:fs';
import path from 'node:path';

const name = process.argv[2];
if (!name) {
  console.error('❌ 请提供项目名称: npm run new:project "项目名称"');
  process.exit(1);
}

const slug =
  name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';

const projectsPath = path.resolve(
  import.meta.dirname,
  '..',
  'src',
  'content',
  'projects',
  'projects.json',
);
const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));

if (projects.some((p) => p.slug === slug)) {
  console.error(`❌ 项目 slug 已存在: ${slug}`);
  process.exit(1);
}

projects.push({
  name,
  slug,
  description: '',
  tags: [],
  status: 'Draft',
  cover: '',
  github: '',
  demo: '',
  featured: false,
  icon: '📦',
  accentColor: '#607d8b',
  category: 'Web',
});

fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2) + '\n', 'utf-8');
console.log(`✅ 已追加项目: ${name} (slug: ${slug})`);
console.log(`   状态: Draft — 编辑 src/content/projects/projects.json 完善信息`);
