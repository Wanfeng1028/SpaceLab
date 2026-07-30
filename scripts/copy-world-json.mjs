const fs = require('fs');
const path = require('path');

const src = 'e:/code/javascript/project/SpaceLab/src/app/shared/three/globe-stream/map/world.json';
const dest = 'e:/code/javascript/project/SpaceLab/public/three/globe-stream/map/world.json';

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('Copied successfully');
