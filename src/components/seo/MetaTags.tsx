import React, { useEffect } from 'react';
import { generateProductJsonLd, generateStoreJsonLd } from '../../utils/seo';
import type { FinancialSettings } from '../../types';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  keywords?: string;
  product?: any;
  settings?: FinancialSettings;
  cms?: any;
}

export const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  image,
  url = 'https://sirikfit.ir',
  type = 'website',
  keywords,
  product,
  settings,
  cms
}) => {
  useEffect(() => {
    // 1. Dynamic Document Title
    const defaultTitle = 'سیریک فیت | خرید مستقیم مکمل از دبی | Sirik Fit';
    const computedTitle = title ? `${title} | سیریک فیت` : defaultTitle;
    document.title = computedTitle;

    // 2. Helper to set or create meta tag
    const setMetaTag = (selector: string, attr: string, value?: string) => {
      if (!value) return;
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        if (selector.startsWith('meta[name=')) {
          const name = selector.match(/name=["'](.*?)["']/)?.[1];
          if (name) element.setAttribute('name', name);
        } else if (selector.startsWith('meta[property=')) {
          const prop = selector.match(/property=["'](.*?)["']/)?.[1];
          if (prop) element.setAttribute('property', prop);
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attr, value);
    };

    const computedDesc = description || cms?.metaDescription || 'فروشگاه آنلاین سیریک فیت؛ مرجع خرید بدون واسطه مکملهای ورزشی، ویتامین و پروتئین اورجینال از امارات با ضمانت اصالت و تحویل سریع در سراسر ایران.';
    const computedImage = image || product?.image || 'https://sirikfit.ir/assets/og-preview.jpg';

    setMetaTag('meta[name="description"]', 'content', computedDesc);
    if (keywords) {
      setMetaTag('meta[name="keywords"]', 'content', keywords);
    }

    // OpenGraph
    setMetaTag('meta[property="og:title"]', 'content', computedTitle);
    setMetaTag('meta[property="og:description"]', 'content', computedDesc);
    setMetaTag('meta[property="og:image"]', 'content', computedImage);
    setMetaTag('meta[property="og:url"]', 'content', url);
    setMetaTag('meta[property="og:type"]', 'content', type);

    if (product) {
      if (product.priceAed) {
        setMetaTag('meta[property="og:price:amount"]', 'content', String(product.priceAed));
        setMetaTag('meta[property="og:price:currency"]', 'content', 'AED');
      }
      if (product.brand) {
        setMetaTag('meta[property="product:brand"]', 'content', product.brand);
      }
      if (product.inStock !== false) {
        setMetaTag('meta[property="product:availability"]', 'content', 'in stock');
      }
    }

    // Twitter
    setMetaTag('meta[name="twitter:title"]', 'content', computedTitle);
    setMetaTag('meta[name="twitter:description"]', 'content', computedDesc);
    setMetaTag('meta[name="twitter:image"]', 'content', computedImage);

    // 3. Inject / Update Schema.org JSON-LD structured data
    let jsonLdScript = document.getElementById('dynamic-jsonld-schema') as HTMLScriptElement | null;
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'dynamic-jsonld-schema';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }

    try {
      const schemaData = product
        ? generateProductJsonLd(product, settings)
        : generateStoreJsonLd(cms);
      jsonLdScript.textContent = JSON.stringify(schemaData);
    } catch (_) {}

    return () => {
      // Clean up dynamic product schema on unmount
      if (product && jsonLdScript) {
        try {
          jsonLdScript.textContent = JSON.stringify(generateStoreJsonLd(cms));
        } catch (_) {}
      }
    };
  }, [title, description, image, url, type, keywords, product, settings, cms]);

  return null;
};

export default MetaTags;
