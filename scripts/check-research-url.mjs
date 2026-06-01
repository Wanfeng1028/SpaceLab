import https from 'https';

const url = 'https://ai-bot.cn/ai-research/';

https.get(url, { headers: { 'User-Agent': 'SpaceLabBot/1.0' } }, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Data length: ${data.length}`);
    const matches = data.match(/class="list-title"/g);
    if (matches) {
      console.log(`Found ${matches.length} list-title items`);
    } else {
      console.log('No list-title items found');
    }
  });
}).on('error', console.error);
