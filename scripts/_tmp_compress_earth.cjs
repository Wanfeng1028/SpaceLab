const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const src = path.join(__dirname, '../public/three/globe-stream/image/Earth_DiffuseMap_2.jpg');
const dir = path.dirname(src);

async function convert() {
  const t0 = Date.now();
  await sharp(src).resize({ width: 512, withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(dir, 'earth-512.webp'));
  console.log(`earth-512.webp done (${Date.now() - t0}ms)`);

  const t1 = Date.now();
  await sharp(src).resize({ width: 1024, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, 'earth-1k.webp'));
  console.log(`earth-1k.webp done (${Date.now() - t1}ms)`);

  const t2 = Date.now();
  await sharp(src).resize({ width: 2048, withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(dir, 'earth-2k.webp'));
  console.log(`earth-2k.webp done (${Date.now() - t2}ms)`);

  // 验证文件大小
  const files = ['earth-512.webp', 'earth-1k.webp', 'earth-2k.webp'];
  console.log('\n--- 文件大小 ---');
  for (const f of files) {
    const stat = fs.statSync(path.join(dir, f));
    const kb = (stat.size / 1024).toFixed(1);
    console.log(`${f}: ${kb} KB`);
  }
  console.log('\nAll done!');
}
convert().catch(console.error);
