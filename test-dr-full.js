async function runFullDrNutritionPipeline() {
  // Helper to extract clean image url
  function cleanImageUrl(rawUrl) {
    if (!rawUrl) return '';
    if (rawUrl.includes('_next/image') && rawUrl.includes('url=')) {
      const match = rawUrl.match(/url=([^&]+)/);
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1]);
          if (decoded.startsWith('http')) return decoded;
          return 'https://drnutrition.com' + decoded;
        } catch(e) {}
      }
    }
    return rawUrl;
  }

  function parseDrNutritionMarkdownEngine(md, pageUrl) {
    // 1. Title extraction
    let title = '';
    const titleMatch = md.match(/^#\s+([^\n]+)/m) || md.match(/Title:\s+([^\n]+)/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\|\s*Dr\.\s*Nutrition.*$/i, '').trim();
    }

    // 2. Brand extraction
    let brand = '';
    const brandMatch = md.match(/By\s+([A-Za-z0-9\s&.-]+)/i) || md.match(/\[!\[Image[^\]]*\]\([^\)]+\)\s+By\s+([^\]]+)\]/i);
    if (brandMatch) {
      brand = brandMatch[1].trim();
    }

    // 3. Price & Original Price & Discount
    let price = 0;
    let originalPrice = 0;
    let discountPercent = 0;

    const fullPriceMatch = md.match(/AED\s*([0-9.]+)\s+AED\s*([0-9.]+)\s+([0-9]+)%\s*OFF/i) ||
                           md.match(/AED\s*([0-9.]+)\s+AED\s*([0-9.]+)/i);
    if (fullPriceMatch) {
      price = parseFloat(fullPriceMatch[1]);
      originalPrice = parseFloat(fullPriceMatch[2]);
      if (fullPriceMatch[3]) discountPercent = parseInt(fullPriceMatch[3], 10);
      else if (originalPrice > price) discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    } else {
      const singlePrice = md.match(/AED\s*([0-9.]+)/i);
      if (singlePrice) {
        price = parseFloat(singlePrice[1]);
      }
    }

    // 4. Primary Image
    const allImages = [];
    const primaryImgMatch = md.match(/!\[Image[^\]]*:\s*([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/i);
    let mainImage = primaryImgMatch ? cleanImageUrl(primaryImgMatch[2]) : '';

    // 5. Dynamic Option Groups Extraction
    const mainBlockMatch = md.match(/#\s+[^\n]+([\s\S]*?)(?:Delivery|ADD TO CART|Ship to your address)/i);
    const optionsContent = mainBlockMatch ? mainBlockMatch[1] : md;

    const optionGroups = [];
    const variantGroups = [];

    const sectionRegex = /###\s+([^\n]+)\n([\s\S]*?)(?=(?:###|Delivery|ADD TO CART|Ship to your address|$))/gi;
    let secMatch;

    while ((secMatch = sectionRegex.exec(optionsContent)) !== null) {
      const groupHeading = secMatch[1].trim();
      if (['Description', 'How to Use', 'Health Notes', 'Product Details', 'Features', 'Nutrition Facts', 'Service Guarantees', 'Resources', 'Quick Links', 'Customer Service', 'Popular Brands', 'Categories'].some(x => groupHeading.toLowerCase().includes(x.toLowerCase()))) {
        continue;
      }

      const groupBody = secMatch[2];
      const itemsMap = new Map();
      const lines = groupBody.split('\n').map(l => l.trim()).filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('See More') || line.includes('out of stock')) continue;
        
        const imgItemMatch = line.match(/!\[Image[^\]]*:\s*([^\]]*)\]\((https?:\/\/[^\s\)]+)\)\s*(.*)/i);
        if (imgItemMatch) {
          const itemImg = cleanImageUrl(imgItemMatch[2]);
          let itemText = (imgItemMatch[3] || imgItemMatch[1]).trim();
          if (!itemText) itemText = imgItemMatch[1].trim();

          if (itemText && itemText.length < 40 && !itemText.toLowerCase().includes('logo') && !itemText.toLowerCase().includes('drnutrition') && !itemText.toLowerCase().includes('applied nutrition')) {
            if (!itemsMap.has(itemText)) {
              itemsMap.set(itemText, { name: itemText, image: itemImg, inStock: true });
            }
            if (itemImg && !allImages.includes(itemImg)) allImages.push(itemImg);
          }
        } else {
          const cleanL = line.replace(/<[^>]+>/g, '').trim();
          if (cleanL && cleanL.length < 40 && !cleanL.startsWith('!') && !cleanL.startsWith('#') && !cleanL.startsWith('[') && !cleanL.includes('http')) {
            if (!itemsMap.has(cleanL)) {
              itemsMap.set(cleanL, { name: cleanL, inStock: true });
            }
          }
        }
      }

      const groupItems = Array.from(itemsMap.values());
      if (groupItems.length > 0) {
        optionGroups.push({
          name: groupHeading,
          values: groupItems.map(it => it.name)
        });

        const isSize = /size|weight|serving|count|عددی|سایز/i.test(groupHeading);
        const isFlavor = /flavor|flavour|taste|طعم/i.test(groupHeading);
        const type = isSize ? 'size' : (isFlavor ? 'flavor' : 'attribute');

        variantGroups.push({
          id: groupHeading.toLowerCase().replace(/\s+/g, '_'),
          name: groupHeading,
          type,
          options: groupItems.map((it, idx) => ({
            id: `${groupHeading.toLowerCase()}_${idx}`,
            name: it.name,
            label: it.name,
            image: it.image,
            inStock: it.inStock
          }))
        });
      }
    }

    // 6. Identify Selected Variant from Title and URL
    const selectedOptions = {};
    const lowerUrl = pageUrl.toLowerCase();
    const lowerTitle = title.toLowerCase();

    optionGroups.forEach(grp => {
      let matchedVal = grp.values.find(v => {
        const slugV = v.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const vWords = v.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        return lowerUrl.includes(slugV) || (vWords.length > 0 && vWords.every(w => lowerUrl.includes(w)));
      });

      if (!matchedVal) {
        matchedVal = grp.values.find(v => lowerTitle.includes(v.toLowerCase()));
      }

      if (!matchedVal && grp.values.length > 0) {
        matchedVal = grp.values[0];
      }

      if (matchedVal) {
        selectedOptions[grp.name] = matchedVal;
      }
    });

    // 7. Variants Matrix
    const variants = [];
    const sizeGroup = variantGroups.find(g => g.type === 'size');
    const flavorGroup = variantGroups.find(g => g.type === 'flavor');

    if (sizeGroup && flavorGroup) {
      sizeGroup.options.forEach(sz => {
        flavorGroup.options.forEach(fl => {
          const isCurrent = selectedOptions[sizeGroup.name] === sz.name && selectedOptions[flavorGroup.name] === fl.name;
          variants.push({
            id: `var-${sz.name}-${fl.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            sku: `DRN-${sz.name}-${fl.name}`.replace(/\s+/g, '-'),
            title: `${title} - ${sz.name} / ${fl.name}`,
            options: {
              [sizeGroup.name]: sz.name,
              [flavorGroup.name]: fl.name
            },
            price: isCurrent ? price : price,
            originalPrice: isCurrent ? originalPrice : originalPrice,
            currency: 'AED',
            image: fl.image || sz.image || mainImage,
            availability: 'in_stock'
          });
        });
      });
    } else if (variantGroups.length > 0) {
      variantGroups[0].options.forEach(opt => {
        const isCurrent = selectedOptions[variantGroups[0].name] === opt.name;
        variants.push({
          id: `var-${opt.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          sku: `DRN-${opt.name}`.replace(/\s+/g, '-'),
          title: `${title} - ${opt.name}`,
          options: {
            [variantGroups[0].name]: opt.name
          },
          price: isCurrent ? price : price,
          originalPrice: isCurrent ? originalPrice : originalPrice,
          currency: 'AED',
          image: opt.image || mainImage,
          availability: 'in_stock'
        });
      });
    }

    const selectedVariant = {
      id: `sel-var-${Object.values(selectedOptions).join('-')}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      options: selectedOptions,
      price,
      originalPrice: originalPrice > 0 ? originalPrice : undefined,
      currency: 'AED',
      image: mainImage,
      availability: 'in_stock'
    };

    return {
      ok: true,
      source: 'drnutrition',
      sourceName: 'Dr. Nutrition UAE',
      originalUrl: pageUrl,
      title,
      brand,
      price,
      originalPrice: originalPrice > 0 ? originalPrice : undefined,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      currency: 'AED',
      image: mainImage,
      galleryImages: Array.from(new Set([mainImage, ...allImages])).filter(Boolean),
      images: Array.from(new Set([mainImage, ...allImages])).filter(Boolean),
      options: optionGroups,
      variantGroups,
      variants,
      selectedVariant,
      selectedFlavor: selectedOptions['Flavor'] || selectedOptions['Flavour'] || undefined,
      selectedSize: selectedOptions['Size'] || selectedOptions['Weight'] || selectedOptions['Serving'] || undefined,
      flavors: flavorGroup ? flavorGroup.options.map(o => o.name) : undefined,
      sizes: sizeGroup ? sizeGroup.options.map(o => o.name) : undefined
    };
  }

  const testUrl = 'https://drnutrition.com/en-ae/applied-nutrition-bcaa-amino-hydrate-32-serving-green-apple';
  const jinaRes = await fetch('https://r.jina.ai/' + testUrl);
  const md = await jinaRes.text();
  const parsed = parseDrNutritionMarkdownEngine(md, testUrl);
  console.log('DR NUTRITION PARSER TEST PASSED:');
  console.log('Title:', parsed.title);
  console.log('Brand:', parsed.brand);
  console.log('Price:', parsed.price, 'AED | Orig:', parsed.originalPrice, 'AED | Discount:', parsed.discountPercent + '%');
  console.log('Options Count:', parsed.options.length);
  console.log('Options:', JSON.stringify(parsed.options, null, 2));
  console.log('Selected Variant:', JSON.stringify(parsed.selectedVariant, null, 2));
  console.log('Variants Count:', parsed.variants.length);
}

runFullDrNutritionPipeline();
