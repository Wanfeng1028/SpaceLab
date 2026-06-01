import https from 'https';

const url = 'https://ai-bot.cn/daily-ai-news/';

https.get(url, { headers: { 'User-Agent': 'SpaceLabBot/1.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = data.match(/class="news-date">[^<]*/g);
    if (matches) {
      console.log('Found date labels:');
      matches.slice(0, 20).forEach(m => console.log(m));
    }
  });
}).on('error', console.error);
