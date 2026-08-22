const https = require('https');

// Try via Jina Reader which renders pages server-side
function fetchViaJina(productUrl) {
  const jinaUrl = `https://r.jina.ai/${productUrl}`;
  const parsed = new URL(jinaUrl);
  
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/plain, */*',
      'X-With-Images-Summary': 'true',
      'X-No-Cache': 'true',
      'X-Return-Format': 'markdown',
    },
    timeout: 15000
  };

  console.log('Fetching via Jina:', jinaUrl.substring(0, 100));
  const req = https.request(options, (res) => {
    console.log('Jina STATUS:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Jina response length:', data.length);
      if (data.length < 200) {
        console.log('Jina response:', data);
        return;
      }
      // Look for price patterns
      const lines = data.split('\n').slice(0, 80);
      console.log('JINA CONTENT (first 80 lines):');
      lines.forEach(l => console.log(l));
    });
  });
  req.on('error', e => console.error('Jina error:', e.message));
  req.setTimeout(15000, () => { req.destroy(); console.log('Jina timed out'); });
  req.end();
}

// Try the Microlink API
function fetchViaMicrolink(productUrl) {
  const mlUrl = `https://api.microlink.io/?url=${encodeURIComponent(productUrl)}&prerender=false`;
  const parsed = new URL(mlUrl);
  
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    timeout: 12000
  };
  
  console.log('\nFetching via Microlink...');
  const req = https.request(options, (res) => {
    console.log('Microlink STATUS:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('Microlink status:', json.status);
        const d = json.data;
        if (d) {
          console.log('Title:', d.title);
          console.log('Description:', (d.description || '').substring(0, 200));
          console.log('Publisher:', d.publisher);
          console.log('Image:', d.image ? d.image.url : 'none');
          console.log('URL:', d.url);
        }
      } catch(e) {
        console.log('Microlink parse error:', e.message);
        console.log('Raw:', data.substring(0, 500));
      }
    });
  });
  req.on('error', e => console.error('Microlink error:', e.message));
  req.setTimeout(12000, () => { req.destroy(); console.log('Microlink timed out'); });
  req.end();
}

const testUrl = 'https://drnutrition.com/en-ae/applied-nutrition-bcaa-amino-hydrate-32-serving-green-apple';
fetchViaJina(testUrl);
setTimeout(() => fetchViaMicrolink(testUrl), 1000);
