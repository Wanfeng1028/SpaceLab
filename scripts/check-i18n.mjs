/**
 * check-i18n.mjs
 * Validates translation file completeness:
 *  - Keys in zh-CN but not en-US (and vice versa)
 *  - Empty string values
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const I18N_DIR = path.join(ROOT, 'src', 'content', 'i18n');

const zhPath = path.join(I18N_DIR, 'zh-CN.json');
const enPath = path.join(I18N_DIR, 'en-US.json');

if (!fs.existsSync(zhPath) || !fs.existsSync(enPath)) {
  console.error('❌ Translation files not found in src/content/i18n/');
  process.exit(1);
}

const zhData = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

const zhKeys = flatten(zhData);
const enKeys = flatten(enData);

const zhSet = new Set(Object.keys(zhKeys));
const enSet = new Set(Object.keys(enKeys));

const missingInEn = [...zhSet].filter((k) => !enSet.has(k));
const missingInZh = [...enSet].filter((k) => !zhSet.has(k));
const emptyInZh = Object.entries(zhKeys)
  .filter(([, v]) => v === '')
  .map(([k]) => k);
const emptyInEn = Object.entries(enKeys)
  .filter(([, v]) => v === '')
  .map(([k]) => k);

let hasIssues = false;

if (missingInEn.length > 0) {
  hasIssues = true;
  console.warn(`\n⚠️  zh-CN has ${missingInEn.length} key(s) missing in en-US:`);
  missingInEn.forEach((k) => console.warn(`   - ${k}`));
}

if (missingInZh.length > 0) {
  hasIssues = true;
  console.warn(`\n⚠️  en-US has ${missingInZh.length} key(s) missing in zh-CN:`);
  missingInZh.forEach((k) => console.warn(`   - ${k}`));
}

if (emptyInZh.length > 0) {
  hasIssues = true;
  console.warn(`\n⚠️  zh-CN has ${emptyInZh.length} empty value(s):`);
  emptyInZh.forEach((k) => console.warn(`   - ${k}`));
}

if (emptyInEn.length > 0) {
  hasIssues = true;
  console.warn(`\n⚠️  en-US has ${emptyInEn.length} empty value(s):`);
  emptyInEn.forEach((k) => console.warn(`   - ${k}`));
}

if (!hasIssues) {
  console.log(`✅ i18n OK — ${zhSet.size} keys in sync across zh-CN and en-US`);
} else {
  console.log(`\n📊 Total: zh-CN=${zhSet.size} keys, en-US=${enSet.size} keys`);
  process.exit(1);
}
