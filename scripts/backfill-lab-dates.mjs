/**
 * backfill-lab-dates.mjs
 * One-time backfill: fetches detail pages for existing lab items to fill in
 * real publishedAt / modifiedAt dates from ai-bot.cn meta tags.
 *
 * Uses concurrent fetching (default 5 parallel) for speed.
 * Saves progress after each batch so it can be resumed if interrupted.
 *
 * Usage:
 *   node scripts/backfill-lab-dates.mjs                    # default: 5 concurrent, batch 100
 *   node scripts/backfill-lab-dates.mjs --concurrency 10   # more parallel
 *   node scripts/backfill-lab-dates.mjs --batch 200        # bigger save interval
 *   node scripts/backfill-lab-dates.mjs --dry-run          # show stats only
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LAB_DIR = path.join(ROOT, 'src', 'content', 'lab');
const TOOLS_FILE = path.join(LAB_DIR, 'ai-tools.json');
const PROJECTS_FILE = path.join(LAB_DIR, 'ai-projects.json');

const USER_AGENT = 'SpaceLabBot/1.0 (+https://github.com/Wanfeng1028/SpaceLab)';

// ── Args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i !== -1 ? parseInt(args[i + 1]) || def : def;
};
const CONCURRENCY = getArg('--concurrency', 5);
const BATCH_SIZE = getArg('--batch', 100);

// ── Fetch detail dates ────────────────────────────────────────────────
async function fetchDetailDates(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' },
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const pubMatch = html.match(/article:published_time["']\s+content=["']([^"']+)["']/);
    const modMatch = html.match(/article:modified_time["']\s+content=["']([^"']+)["']/);
    const publishedAt = pubMatch ? pubMatch[1] : '';
    const modifiedAt = modMatch ? modMatch[1] : '';
    if (!publishedAt && !modifiedAt) return null;
    return { publishedAt, modifiedAt: modifiedAt || publishedAt };
  } catch {
    return null;
  }
}

// ── Concurrent pool ───────────────────────────────────────────────────
async function poolMap(items, fn, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// ── Process one file ──────────────────────────────────────────────────
async function backfillFile(filePath, label) {
  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const needBackfill = items.filter((i) => !i.publishedAt && i.url);

  console.log(`\n📂 ${label}: ${items.length} total, ${needBackfill.length} need backfill`);

  if (dryRun || needBackfill.length === 0) return;

  const urlToItem = new Map(needBackfill.map((i) => [i.url, i]));
  const urls = [...urlToItem.keys()];
  let filled = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batchUrls = urls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE);
    console.log(`   Batch ${batchNum}/${totalBatches}: ${batchUrls.length} items (${i + batchUrls.length}/${urls.length})...`);

    await poolMap(batchUrls, async (url) => {
      const item = urlToItem.get(url);
      const dates = await fetchDetailDates(url);
      if (dates) {
        item.publishedAt = dates.publishedAt;
        item.date = (dates.modifiedAt || dates.publishedAt).slice(0, 10);
        filled++;
      } else {
        failed++;
      }
    }, CONCURRENCY);

    // Save progress after each batch
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
    console.log(`   💾 Saved: ${filled} filled, ${failed} failed`);
  }

  // Final sort by date descending
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`   ✅ ${label} done: ${filled} filled, ${failed} failed, sorted by date`);
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Backfill lab dates from detail pages');
  console.log(`   Concurrency: ${CONCURRENCY}, Batch: ${BATCH_SIZE}`);
  if (dryRun) console.log('   ⚠️ DRY RUN — no changes will be made');

  await backfillFile(TOOLS_FILE, 'AI Tools');
  await backfillFile(PROJECTS_FILE, 'AI Projects');

  console.log('\n🎉 Backfill complete!');
}

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
