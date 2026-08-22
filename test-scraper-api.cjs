// Test if ScraperAPI key works
const https = require('https');
const http = require('http');

const SCRAPER_KEY = "a67220b28858f356c2b0f0ea7878c6f8";
const testUrl = "https://drnutrition.com/en-ae/applied-nutrition-bcaa-amino-hydrate-32-serving-green-apple";

function testScraperApi(renderMode) {
  const apiUrl = `http://api.scraperapi.com?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(testUrl)}${renderMode ? '&render=true&country_code=ae' : ''}`;
  const parsed = new URL(apiUrl);
  const start = Date.now();
  
  const opts = {
    hostname: parsed.hostname,
    port: 80,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: { 'Accept': 'text/html,*/*', 'User-Agent': 'Mozilla/5.0' },
    timeout: 30000
  };
  
  console.log(`\nTesting ScraperAPI ${renderMode ? '(render=true)' : '(basic)'}: ${apiUrl.substring(0, 100)}...`);
  
  const req = http.request(opts, (res) => {
    let data = '';
    console.log(`Status: ${res.statusCode} (${Date.now() - start}ms)`);
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log(`Response length: ${data.length}`);
      if (data.length > 100) {
        const hasNextData = data.includes('__NEXT_DATA__');
        const hasMagento = data.includes('x-magento-init');
        const hasJson = data.includes('application/ld+json');
        const hasCF = data.includes('cf-wrapper') || data.includes('cloudflare');
        const hasPrice = data.match(/AED\s*([\d.]+)/i);
        const hasTitle = data.match(/<h1[^>]*>([^<]+)/i);
        console.log(`  Has __NEXT_DATA__: ${hasNextData}`);
        console.log(`  Has Magento: ${hasMagento}`);
        console.log(`  Has JSON-LD: ${hasJson}`);
        console.log(`  Has CF block: ${hasCF}`);
        console.log(`  AED price: ${hasPrice ? hasPrice[0] : 'not found'}`);
        console.log(`  H1 title: ${hasTitle ? hasTitle[1].substring(0, 100) : 'not found'}`);
        if (hasNextData) {
          const idx = data.indexOf('__NEXT_DATA__');
          const start2 = data.lastIndexOf('<script', idx);
          const end2 = data.indexOf('</script>', idx) + 9;
          if (start2 > -1 && end2 > start2) {
            const scriptContent = data.substring(start2, end2);
            const jsonStart = scriptContent.indexOf('>') + 1;
            const jsonEnd = scriptContent.lastIndexOf('<');
            const jsonStr = scriptContent.substring(jsonStart, jsonEnd).trim();
            try {
              const nd = JSON.parse(jsonStr);
              const pp = nd && nd.props && nd.props.pageProps;
              const prod = pp && (pp.product || pp.productData);
              if (prod) {
                console.log(`  PRODUCT: title=${prod.name || prod.title}, price=${prod.final_price || prod.price}`);
              }
            } catch(e) {}
          }
        }
      } else if (data.startsWith('{"')) {
        try {
          const json = JSON.parse(data);
          console.log('Error response:', json);
        } catch(e) { console.log('Response:', data); }
      }
    });
  });
  req.on('error', e => console.error('Error:', e.message));
  req.setTimeout(30000, () => { req.destroy(); console.log('Timed out'); });
  req.end();
}

// Test basic first
testScraperApi(false);
// Then render=true 
setTimeout(() => testScraperApi(true), 2000);
