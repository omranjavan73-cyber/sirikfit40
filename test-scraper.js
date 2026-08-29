const fetch = globalThis.fetch;

async function run() {
  const targetSlug = 'olimp-creatine-monohydrate-550g-bb-32l-jug';
  
  // Test 1: Algolia / Search / Backend APIs
  const apis = [
    `https://www.drnutrition.com/api/products/${targetSlug}`,
    `https://www.drnutrition.com/en-ae/api/products/${targetSlug}`,
    `https://www.drnutrition.com/api/product/${targetSlug}`,
    `https://www.drnutrition.com/_next/data`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.drnutrition.com/en-ae/' + targetSlug)}`,
    `https://corsproxy.io/?url=${encodeURIComponent('https://www.drnutrition.com/en-ae/' + targetSlug)}`,
    `https://proxy.cors.sh/https://www.drnutrition.com/en-ae/${targetSlug}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://www.drnutrition.com/en-ae/' + targetSlug)}`
  ];

  for (const api of apis) {
    try {
      console.log('Testing:', api.slice(0, 80));
      const res = await fetch(api, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        }
      });
      console.log('-> Status:', res.status);
      if (res.ok) {
        const txt = await res.text();
        console.log('-> Length:', txt.length, 'Snippet:', txt.slice(0, 200));
      }
    } catch (e) {
      console.log('-> Error:', e.message);
    }
  }
}

run();

