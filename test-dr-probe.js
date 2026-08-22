const https = require('https');

const options = {
  hostname: 'www.drnutrition.com',
  path: '/en-ae/applied-nutrition-bcaa-amino-hydrate-32-serving-green-apple',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
  },
  timeout: 12000
};

const req = https.request(options, (res) => {
  let data = '';
  console.log('STATUS:', res.statusCode);
  const ct = res.headers['content-type'] || '';
  console.log('Content-Type:', ct);
  
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('HTML length:', data.length);
    
    const hasNextData = data.includes('__NEXT_DATA__');
    console.log('Has __NEXT_DATA__:', hasNextData);
    const hasMagento = data.includes('x-magento-init');
    console.log('Has Magento init:', hasMagento);
    const hasJsonLd = data.includes('application/ld+json');
    console.log('Has JSON-LD:', hasJsonLd);
    const hasCloudflare = data.includes('cloudflare') || data.includes('cf-ray') || res.headers['cf-ray'];
    console.log('Has Cloudflare block:', hasCloudflare);
    
    if (hasNextData) {
      const startIdx = data.indexOf('__NEXT_DATA__');
      const snippet = data.substring(startIdx, startIdx + 200);
      console.log('NEXT_DATA snippet:', snippet);
      
      const scriptStart = data.indexOf('<script', startIdx - 50);
      const scriptEnd = data.indexOf('</script>', startIdx) + 9;
      if (scriptStart > -1 && scriptEnd > scriptStart) {
        const scriptTag = data.substring(scriptStart, scriptEnd);
        const jsonStart = scriptTag.indexOf('>') + 1;
        const jsonEnd = scriptTag.lastIndexOf('</script>');
        const jsonStr = scriptTag.substring(jsonStart, jsonEnd);
        try {
          const nextJson = JSON.parse(jsonStr);
          const pp = nextJson && nextJson.props && nextJson.props.pageProps;
          console.log('pageProps keys:', pp ? Object.keys(pp) : 'none');
          const prod = (pp && (pp.product || pp.productData || (pp.initialData && pp.initialData.product)));
          if (prod) {
            const prodKeys = Object.keys(prod).slice(0, 30);
            console.log('Product keys:', prodKeys);
            console.log('Title:', prod.name || prod.title);
            console.log('Price:', prod.final_price || prod.price || prod.special_price);
            console.log('Brand:', prod.brand || prod.manufacturer);
            const priceRange = prod.price_range;
            if (priceRange) {
              console.log('Price range:', JSON.stringify(priceRange).substring(0, 300));
            }
          } else {
            console.log('pageProps (partial):', JSON.stringify(pp || {}).substring(0, 3000));
          }
        } catch(e) {
          console.log('JSON parse error:', e.message);
          console.log('JSON snippet:', jsonStr.substring(0, 500));
        }
      }
    }
    
    if (hasJsonLd) {
      const ldMatches = data.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      if (ldMatches) {
        console.log('JSON-LD blocks found:', ldMatches.length);
        ldMatches.forEach((block, i) => {
          const inner = block.replace(/<[^>]+>/g, '').trim();
          try {
            const parsed = JSON.parse(inner);
            const type = parsed['@type'] || (parsed['@graph'] && '@graph');
            console.log('LD+JSON block', i, 'type:', type);
            if (type === 'Product' || (parsed.name && parsed.offers)) {
              console.log('Product LD+JSON:', JSON.stringify(parsed).substring(0, 1000));
            }
          } catch(e) {
            console.log('LD JSON block', i, 'parse error');
          }
        });
      }
    }
    
    // Price from HTML
    const priceMatches = data.match(/AED\s*([\d,.]+)/gi);
    if (priceMatches) {
      console.log('AED price mentions (first 5):', priceMatches.slice(0, 5));
    }
    
    // Title from HTML
    const h1Match = data.match(/<h1[^>]*>([^<]+)/i);
    if (h1Match) console.log('H1 title:', h1Match[1].trim().substring(0, 100));
    
    const ogTitle = data.match(/og:title[^>]*content="([^"]+)"/i);
    if (ogTitle) console.log('OG title:', ogTitle[1].substring(0, 150));
    
    const ogImage = data.match(/og:image[^>]*content="([^"]+)"/i);
    if (ogImage) console.log('OG image:', ogImage[1].substring(0, 200));
  });
});

req.on('error', e => console.error('Error:', e.message));
req.setTimeout(12000, () => { req.destroy(); console.log('Request timed out'); });
req.end();
