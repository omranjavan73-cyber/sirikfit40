import React, { useEffect } from 'react';
import type { SeoSettings } from '../types/seo';
import { defaultSeoSettings } from '../types/seo';
import { fetchSeoSettingsFromFirestore } from '../firebase';

export const SeoHeadInjector: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let activeSeo: SeoSettings = { ...defaultSeoSettings };

    const applySeoToHead = (seoData?: Partial<SeoSettings> | null) => {
      try {
        if (!seoData) return;
        const safeData: SeoSettings = { ...defaultSeoSettings, ...seoData };

        // 1. Update Document Title
        if (safeData.siteTitleTemplate) {
          document.title = safeData.siteTitleTemplate;
        }

        // Helper to update or create meta tags
        const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
          if (!content) return;
          try {
            let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!el) {
              el = document.createElement('meta');
              el.setAttribute(attrName, attrValue);
              document.head.appendChild(el);
            }
            el.setAttribute('content', content);
          } catch (_e) {}
        };

        // 2. Standard Meta Tags
        setMetaTag('name', 'description', safeData.metaDescription || '');
        if (Array.isArray(safeData.metaKeywords) && safeData.metaKeywords.length > 0) {
          setMetaTag('name', 'keywords', safeData.metaKeywords.filter(Boolean).join(', '));
        }
        setMetaTag('name', 'robots', safeData.robotsIndex || 'index, follow');
        if (safeData.author) {
          setMetaTag('name', 'author', safeData.author);
        }

        // 3. Verification Tags
        if (safeData.googleVerificationCode) {
          setMetaTag('name', 'google-site-verification', safeData.googleVerificationCode);
        }
        if (safeData.bingVerificationCode) {
          setMetaTag('name', 'msvalidate.01', safeData.bingVerificationCode);
        }

        // 4. OpenGraph Tags
        setMetaTag('property', 'og:title', safeData.ogTitle || safeData.siteTitleTemplate || '');
        setMetaTag('property', 'og:description', safeData.ogDescription || safeData.metaDescription || '');
        setMetaTag('property', 'og:image', safeData.ogImageUrl || '');
        setMetaTag('property', 'og:url', safeData.canonicalUrl || window.location.origin);
        setMetaTag('property', 'og:type', safeData.ogType || 'website');
        setMetaTag('property', 'og:site_name', safeData.siteName || 'سیریک فیت');
        setMetaTag('property', 'og:locale', 'fa_IR');

        // 5. Twitter Card Tags
        setMetaTag('name', 'twitter:card', safeData.twitterCardType || 'summary_large_image');
        setMetaTag('name', 'twitter:title', safeData.ogTitle || safeData.siteTitleTemplate || '');
        setMetaTag('name', 'twitter:description', safeData.ogDescription || safeData.metaDescription || '');
        setMetaTag('name', 'twitter:image', safeData.ogImageUrl || '');
        if (safeData.twitterHandle) {
          setMetaTag('name', 'twitter:site', safeData.twitterHandle);
        }

        // 6. Canonical URL Tag
        if (safeData.canonicalUrl) {
          try {
            let canon = document.querySelector('link[rel="canonical"]');
            if (!canon) {
              canon = document.createElement('link');
              canon.setAttribute('rel', 'canonical');
              document.head.appendChild(canon);
            }
            canon.setAttribute('href', safeData.canonicalUrl);
          } catch (_e) {}
        }

        // 7. Inject JSON-LD Structured Data Schema
        if (safeData.enableOrganizationSchema) {
          try {
            let scriptEl = document.getElementById('sirikfit-jsonld-org') as HTMLScriptElement | null;
            if (!scriptEl) {
              scriptEl = document.createElement('script');
              scriptEl.id = 'sirikfit-jsonld-org';
              scriptEl.type = 'application/ld+json';
              document.head.appendChild(scriptEl);
            }

            const schemaData = {
              '@context': 'https://schema.org',
              '@type': safeData.enableLocalBusinessSchema ? 'SportsActivityLocation' : 'Organization',
              'name': safeData.orgName || 'سیریک فیت',
              'legalName': safeData.orgLegalName || 'سیریک فیت',
              'url': safeData.canonicalUrl || window.location.origin,
              'logo': safeData.orgLogoUrl || `${window.location.origin}/favicon.svg`,
              'description': safeData.metaDescription || '',
              'telephone': safeData.orgPhone || '',
              'email': safeData.orgEmail || '',
              'address': {
                '@type': 'PostalAddress',
                'streetAddress': safeData.storeAddress || '',
                'addressLocality': safeData.storeCity || '',
                'addressCountry': 'IR'
              },
              'sameAs': [
                safeData.orgInstagram,
                safeData.orgTelegram,
                safeData.orgWhatsapp
              ].filter(Boolean)
            };

            scriptEl.text = JSON.stringify(schemaData);
          } catch (_e) {}
        }
      } catch (err) {
        console.warn('Notice: Non-critical SEO head injection warning:', err);
      }
    };

    // Load initial from localStorage if available
    try {
      const cached = localStorage.getItem('sirikfit_seo_settings');
      if (cached) {
        activeSeo = { ...defaultSeoSettings, ...JSON.parse(cached) };
        applySeoToHead(activeSeo);
      }
    } catch (_e) {}

    // Load from Firestore safely
    fetchSeoSettingsFromFirestore()
      .then(remoteData => {
        if (remoteData) {
          activeSeo = { ...defaultSeoSettings, ...remoteData };
          applySeoToHead(activeSeo);
        }
      })
      .catch(() => {});

    // Listen to custom updates
    const handleUpdate = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        if (detail) {
          activeSeo = { ...defaultSeoSettings, ...detail };
          applySeoToHead(activeSeo);
        }
      } catch (_e) {}
    };

    window.addEventListener('seoSettingsUpdated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('seoSettingsUpdated', handleUpdate as EventListener);
    };
  }, []);

  return null;
};
