const https = require('https');

function fetchUrl(url, redirectCount) {
  if (redirectCount > 5) { console.log('Too many redirects'); return; }
  
  const parsed = new URL(url);
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    },
    timeout: 15000
  };

  const req = https.request(options, (res) => {
    console.log('URL:', url);
    console.log('STATUS:', res.statusCode);
    
    if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
      const newUrl = res.headers.location.startsWith('http') 
        ? res.headers.location 
        : `https://${parsed.hostname}${res.headers.location}`;
      console.log('Redirect to:', newUrl);
      fetchUrl(newUrl, (redirectCount || 0) + 1);
      return;
    }
    
    const ct = res.headers['content-type'] || '';
    console.log('Content-Type:', ct);
    console.log('CF-Ray:', res.headers['cf-ray'] || 'none');
    
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('HTML length:', data.length);
      
      if (data.length < 1000) {
        console.log('Full response:', data);
        return;
      }
      
      const hasNextData = data.includes('__NEXT_DATA__');
      console.log('Has __NEXT_DATA__:', hasNextData);
      const hasMagento = data.includes('x-magento-init') || data.includes('Magento_');
      console.log('Has Magento:', hasMagento);
      const hasJsonLd = data.includes('application/ld+json');
      console.log('Has JSON-LD:', hasJsonLd);
      const hasReact = data.includes('__reactFiber') || data.includes('_app') || data.includes('react-dom');
      console.log('Has React:', hasReact);
      const hasNextJs = data.includes('/_next/') || data.includes('__next');
      console.log('Has Next.js:', hasNextJs);
      const isChallenge = data.includes('Checking your browser') || data.includes('cf-challenge') || data.includes('Please wait while we check');
      console.log('Is CF Challenge:', isChallenge);
      
      if (hasJsonLd) {
        const blocks = data.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
        console.log('JSON-LD blocks:', blocks.length);
        blocks.forEach((block, i) => {
          const inner = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
          try {
            const parsed = JSON.parse(inner);
            const t = parsed['@type'];
            console.log('Block', i, 'type:', t);
            if (t === 'Product' || parsed.offers) {
              console.log('PRODUCT LD+JSON:', JSON.stringify(parsed).substring(0, 2000));
            }
          } catch(e) { console.log('Block', i, 'parse error'); }
        });
      }
      
      if (hasNextData) {
        const idx = data.indexOf('__NEXT_DATA__');
        const start = data.lastIndexOf('<script', idx);
        const end = data.indexOf('</script>', idx) + 9;
        if (start > -1 && end > start) {
          const scriptContent = data.substring(start, end);
          const jsonStart = scriptContent.indexOf('>') + 1;
          const jsonEnd = scriptContent.lastIndexOf('<');
          const jsonStr = scriptContent.substring(jsonStart, jsonEnd).trim();
          try {
            const nd = JSON.parse(jsonStr);
            const pp = nd && nd.props && nd.props.pageProps;
            console.log('pageProps keys:', pp ? Object.keys(pp) : 'none');
            const prod = pp && (pp.product || pp.productData || (pp.initialData && pp.initialData.product));
            if (prod) {
              console.log('PRODUCT FOUND! Keys:', Object.keys(prod).slice(0, 30));
              console.log('Title:', prod.name || prod.title);
              console.log('Final Price:', prod.final_price);
              console.log('Regular Price:', prod.regular_price);
              console.log('Special Price:', prod.special_price);
              console.log('Price Range:', JSON.stringify(prod.price_range || {}).substring(0, 200));
              console.log('Brand:', prod.brand || prod.manufacturer || prod.brand_name);
              if (prod.media_gallery) {
                console.log('Media gallery count:', prod.media_gallery.length);
                console.log('First image:', JSON.stringify(prod.media_gallery[0]).substring(0, 200));
              }
              if (prod.configurable_options) {
                console.log('Options:', JSON.stringify(prod.configurable_options).substring(0, 1000));
              }
            } else {
              const ppStr = JSON.stringify(pp || {});
              console.log('pageProps length:', ppStr.length);
              console.log('pageProps first 5000 chars:', ppStr.substring(0, 5000));
            }
          } catch(e) {
            console.log('NEXT_DATA parse error:', e.message);
          }
        }
      }
      
      if (hasMagento) {
        const magIdx = data.indexOf('x-magento-init');
        const magSnippet = data.substring(Math.max(0, magIdx - 100), magIdx + 500);
        console.log('Magento init snippet:', magSnippet.substring(0, 300));
      }
      
      const h1 = data.match(/<h1[^>]*class=[^>]*>([^<]*)</i);
      if (h1) console.log('H1:', h1[1].trim().substring(0, 150));
      
      const ogTitle = data.match(/property="og:title"[^>]*content="([^"]+)"/i) ||
                      data.match(/content="([^"]+)"[^>]*property="og:title"/i);
      if (ogTitle) console.log('OG Title:', ogTitle[1].substring(0, 200));
      
      const ogImage = data.match(/property="og:image"[^>]*content="([^"]+)"/i) ||
                      data.match(/content="([^"]+)"[^>]*property="og:image"/i);
      if (ogImage) console.log('OG Image:', ogImage[1].substring(0, 200));
      
      const aedPrices = data.match(/AED\s*([\d,]+\.?\d*)/gi);
      if (aedPrices) console.log('AED mentions (first 10):', aedPrices.slice(0, 10));
      
      console.log('Body start:', data.substring(data.indexOf('<body') > -1 ? data.indexOf('<body') : 0, data.indexOf('<body') + 300).substring(0, 300));
    });
  });

  req.on('error', e => console.error('Error:', e.message));
  req.setTimeout(15000, () => { req.destroy(); console.log('Timed out'); });
  req.end();
}

fetchUrl('https://drnutrition.com/en-ae/applied-nutrition-bcaa-amino-hydrate-32-serving-green-apple', 0);
