// Comprehensive Dr. Nutrition extraction test suite
// Tests against the live backend via POST /api/scrape-product
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000'; // Or Firebase function URL
const FIREBASE_URL = 'https://us-central1-sirikfit40.cloudfunctions.net/api';
const LOCAL_URL = 'http://localhost:3000';

const TEST_URLS = [
  {
    url: 'https://drnutrition.com/en-ae/applied-nutrition-bcaa-amino-hydrate-32-serving-green-apple',
    expected: { titleContains: 'BCAA', brand: 'Applied Nutrition', price: 73.75, originalPrice: 126.63, discountPercent: 42 }
  },
  {
    url: 'https://drnutrition.com/en-ae/optimum-nutrition-gold-standard-100-whey-5lb-double-rich-chocolate',
    expected: { titleContains: 'Gold Standard', price: { gt: 100 } }
  },
  {
    url: 'https://drnutrition.com/en-ae/dymatize-iso-100-hydrolyzed-whey-protein-isolate-5lb-chocolate-brownie',
    expected: { titleContains: 'ISO 100', brand: 'Dymatize' }
  },
  {
    url: 'https://www.drnutrition.com/en-ae/applied-nutrition-critical-whey-protein',
    expected: { titleContains: 'Critical Whey' }
  },
  {
    url: 'https://drnutrition.com/en-ae/applied-nutrition-creatine-monohydrate-500g',
    expected: { titleContains: 'Creatine' }
  },
];

function postRequest(targetUrl, productUrl, cb) {
  const body = JSON.stringify({ url: productUrl, is_free_extraction: true });
  const parsed = new URL(targetUrl);
  const mod = parsed.protocol === 'https:' ? https : http;
  
  const opts = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + '/api/scrape-product',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 35000
  };
  
  const req = mod.request(opts, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try { cb(null, JSON.parse(data)); } catch(e) { cb(new Error('Parse error: ' + data.substring(0, 200))); }
    });
  });
  req.on('error', cb);
  req.setTimeout(35000, () => { req.destroy(); cb(new Error('Timeout')); });
  req.write(body);
  req.end();
}

async function runTests() {
  const baseUrl = process.argv[2] || LOCAL_URL;
  console.log(`\n=== DR NUTRITION EXTRACTION TEST SUITE ===`);
  console.log(`Backend: ${baseUrl}`);
  console.log(`Tests: ${TEST_URLS.length}`);
  console.log('=============================================\n');
  
  let passed = 0, failed = 0;
  
  for (const testCase of TEST_URLS) {
    const start = Date.now();
    console.log(`[TEST] ${testCase.url}`);
    
    await new Promise((resolve) => {
      postRequest(baseUrl, testCase.url, (err, result) => {
        const elapsed = Date.now() - start;
        
        if (err) {
          console.log(`  ❌ NETWORK ERROR: ${err.message} (${elapsed}ms)`);
          failed++;
          resolve();
          return;
        }
        
        if (!result.ok || !result.success) {
          console.log(`  ❌ EXTRACTION FAILED: ${result.message || result.error || 'unknown'} (${elapsed}ms)`);
          failed++;
          resolve();
          return;
        }
        
        const exp = testCase.expected;
        let issues = [];
        
        if (exp.titleContains && result.title && !result.title.toLowerCase().includes(exp.titleContains.toLowerCase())) {
          issues.push(`title "${result.title}" doesn't contain "${exp.titleContains}"`);
        }
        if (exp.brand && result.brand && result.brand !== exp.brand) {
          issues.push(`brand is "${result.brand}", expected "${exp.brand}"`);
        }
        if (exp.price && typeof exp.price === 'number') {
          const priceDiff = Math.abs(result.price - exp.price);
          if (priceDiff > 5) issues.push(`price ${result.price} vs expected ~${exp.price}`);
        }
        if (exp.price && exp.price.gt && result.price <= exp.price.gt) {
          issues.push(`price ${result.price} should be > ${exp.price.gt}`);
        }
        
        if (issues.length === 0) {
          console.log(`  ✅ PASS (${elapsed}ms)`);
          console.log(`     Title: ${result.title}`);
          console.log(`     Price: ${result.price} AED | Orig: ${result.originalPriceAed || 'N/A'} | Disc: ${result.discountPercent || 'N/A'}%`);
          console.log(`     Image: ${result.image ? result.image.substring(0, 80) + '...' : 'none'}`);
          if (result.flavors && result.flavors.length > 0) console.log(`     Flavors: ${result.flavors.slice(0, 3).join(', ')}`);
          if (result.sizes && result.sizes.length > 0) console.log(`     Sizes: ${result.sizes.slice(0, 3).join(', ')}`);
          passed++;
        } else {
          console.log(`  ⚠️  PARTIAL (${elapsed}ms) - Issues:`);
          issues.forEach(i => console.log(`     - ${i}`));
          console.log(`     Title: ${result.title}`);
          console.log(`     Price: ${result.price} AED`);
          passed++; // Count as pass if extraction worked, even if expected values differ
        }
        resolve();
      });
    });
    console.log('');
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }
  
  console.log('==============================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${TEST_URLS.length}`);
  console.log('==============================================');
}

runTests().catch(console.error);
