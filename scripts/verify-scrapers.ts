import { parseSporterHtml } from '../functions/src/scrapers/sporterAdapter';
import { extractDrNutritionHandle, extractPriceNumber } from '../functions/src/scrapers/utils';

console.log('=== TEST 1: SPORTER STRIKETHROUGH ELIMINATION ===');
const sporterSampleHtml = `
  <html>
    <head><title>Korean Ginseng 500mg - Sporter UAE</title></head>
    <body>
      <h1 class="page-title">Korean Ginseng 500mg</h1>
      <div class="product-info-price">
        <span class="old-price"><span class="price">AED 77.25</span></span>
        <span class="special-price"><span class="price" data-price-type="finalPrice">AED 57.94</span></span>
      </div>
      <div class="swatch-attribute-flavor">
        <div class="swatch-option" data-option-label="Original">Original</div>
      </div>
    </body>
  </html>
`;

const sporterResult = parseSporterHtml(sporterSampleHtml, 'https://www.sporter.com/en-ae/korean-ginseng');
console.log('Sporter active priceAED:', sporterResult.priceAED);
console.log('Sporter originalPriceAED:', sporterResult.originalPriceAED);
console.log('Sporter discountPercent:', sporterResult.discountPercent);

if (sporterResult.priceAED === 57.94 && sporterResult.originalPriceAED === 77.25 && sporterResult.discountPercent === 25) {
  console.log('>>> TEST 1 PASSED: Sporter active discounted price isolated perfectly!');
} else {
  console.error('>>> TEST 1 FAILED:', sporterResult);
  process.exit(1);
}

console.log('\n=== TEST 2: DR NUTRITION HANDLE & PRICE PARSING ===');
const url1 = 'https://www.drnutrition.com/en-ae/products/gold-standard-100-whey';
const url2 = 'https://www.drnutrition.com/en-ae/product/cellucor-c4-original?variant=123';
const handle1 = extractDrNutritionHandle(url1);
const handle2 = extractDrNutritionHandle(url2);

console.log('Handle 1:', handle1);
console.log('Handle 2:', handle2);

if (handle1 === 'gold-standard-100-whey' && handle2 === 'cellucor-c4-original') {
  console.log('>>> TEST 2 PASSED: Handle extractor works accurately!');
} else {
  console.error('>>> TEST 2 FAILED');
  process.exit(1);
}

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
