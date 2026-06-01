import https from 'https';

const url = 'https://ai-bot.cn/ai-research/';

https.get(url, { headers: { 'User-Agent': 'SpaceLabBot/1.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Look for h2 tags with links
    const h2Matches = data.match(/<h2>.*?<\/h2>/g);
    if (h2Matches) {
      console.log('Found h2 tags:');
      h2Matches.slice(0, 5).forEach(m => console.log(m));
    }
    
    // Look for any class patterns
    const classMatches = data.match(/class="[^"]*list[^"]*"/g);
    if (classMatches) {
      console.log('\nFound list classes:');
      [...new Set(classMatches)].forEach(m => console.log(m));
    }
  });
}).on('error', console.error);
