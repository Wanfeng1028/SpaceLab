import fs from 'node:fs';

// Analyze the structure of ai-bot list pages
const h = fs.readFileSync('temp-ai-tools.html', 'utf-8');
const norm = h.replace(/>\s+</g, '><').replace(/\s+/g, ' ');

// Find all class names that contain "list" or "card" or "item"
const classRe = /class="([^"]*(?:list|card|item|post|entry|tool|product)[^"]*)"/gi;
const classes = new Set();
let m;
while ((m = classRe.exec(norm)) !== null) {
  classes.add(m[1]);
}
console.log('=== Classes with list/card/item/tool/product ===');
for (const c of classes) console.log(' ', c);

// Find the main content container — look for common patterns
const contentMarkers = ['main-content', 'content-area', 'post-list', 'tool-list', 'resource-list'];
for (const marker of contentMarkers) {
  const idx = norm.indexOf(marker);
  if (idx >= 0) {
    console.log(`\n=== Found "${marker}" at pos ${idx} ===`);
    console.log(norm.slice(Math.max(0, idx - 100), idx + 300));
  }
}

// Count occurrences of different link patterns
const patterns = [
  ['list-title', /class="list-title/g],
  ['post-title', /class="post-title/g],
  ['entry-title', /class="entry-title/g],
  ['tool-name', /class="tool-name/g],
  ['card-title', /class="card-title/g],
  ['/ai-tools/ links', /href="[^"]*\/ai-tools\/[^"]*"/g],
  ['/ai-research/ links', /href="[^"]*\/ai-research\/[^"]*"/g],
];

console.log('\n=== Pattern counts ===');
for (const [label, re] of patterns) {
  const count = (norm.match(re) || []).length;
  console.log(`  ${label}: ${count}`);
}

// Find the "hot" or "latest" section that has the actual tool listings
// Look for sections with many list-title items
const listTitlePositions = [];
const ltRe = /class="list-title[^"]*"/g;
while ((m = ltRe.exec(norm)) !== null) {
  listTitlePositions.push(m.index);
}
console.log(`\n=== list-title positions (${listTitlePositions.length}) ===`);
console.log('Positions:', listTitlePositions);

// Look at the broader context around the first few list-title items
for (const pos of listTitlePositions.slice(0, 3)) {
  const start = Math.max(0, pos - 200);
  const end = Math.min(norm.length, pos + 400);
  console.log(`\n--- Context at pos ${pos} ---`);
  console.log(norm.slice(start, end));
}
