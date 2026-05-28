/**
 * new-post.mjs
 * Usage: npm run new:post "文章标题"
 */
import fs from 'node:fs';
import path from 'node:path';

const title = process.argv[2];
if (!title) {
  console.error('❌ 请提供文章标题: npm run new:post "文章标题"');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const slug = title
  .toLowerCase()
  .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || 'untitled';

const fileName = `${date}-${slug}.md`;
const postsDir = path.resolve(import.meta.dirname, '..', 'src', 'content', 'posts');
const filePath = path.join(postsDir, fileName);

if (fs.existsSync(filePath)) {
  console.error(`❌ 文件已存在: ${filePath}`);
  process.exit(1);
}

const template = `---
title: "${title}"
slug: "${slug}"
date: "${date}"
category: ""
tags: []
cover: ""
summary: ""
published: false
---

在此开始写作...
`;

fs.writeFileSync(filePath, template, 'utf-8');
console.log(`✅ 已创建: src/content/posts/${fileName}`);
console.log(`   slug: ${slug}`);
console.log(`   published: false — 编辑完成后改为 true`);
