const sharp = require('sharp');
const path = require('path');
const src = path.join(__dirname, '../public/three/globe-stream/image/Earth_DiffuseMap_2.jpg');
const dir = path.dirname(src);

async function convert() {
  const t0 = Date.now();
  await sharp(src).resize(512, -1, { withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(dir, 'earth-512.webp'));
  console.log(`earth-512.webp done (${Date.now() - t0}ms)`);

  const t1 = Date.now();
  await sharp(src).resize(1024, -1, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, 'earth-1k.webp'));
  console.log(`earth-1k.webp done (${Date.now() - t1}ms)`);

  const t2 = Date.now();
  await sharp(src).resize(2048, -1, { withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(dir, 'earth-2k.webp'));
  console.log(`earth-2k.webp done (${Date.now() - t2}ms)`);

  console.log('All done!');
}
convert().catch(console.error);
