import https from 'https';

const url = 'https://ai-bot.cn/ai-research/';

https.get(url, { headers: { 'User-Agent': 'SpaceLabBot/1.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const h = data.replace(/>\s+</g, '><').replace(/\s+/g, ' ');
    const titleRe = /<h2><a\s+href="([^"]+)"[^>]*?title="([^"]*)"[^>]*?class="list-title[^"]*"[^>]*?>([\s\S]*?)<\/a\s*><\/h2>/g;
    let m;
    let count = 0;
    while ((m = titleRe.exec(h)) !== null) {
      count++;
      if (count <= 3) {
        console.log(`Match ${count}:`);
        console.log(`  URL: ${m[1]}`);
        console.log(`  Title: ${m[2]}`);
      }
    }
    console.log(`\nTotal matches: ${count}`);
  });
}).on('error', console.error);
