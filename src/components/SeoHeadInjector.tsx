import React, { useEffect } from 'react';
import type { SeoSettings } from '../types/seo';
import { defaultSeoSettings } from '../types/seo';
import { fetchSeoSettingsFromFirestore } from '../firebase';

export const SeoHeadInjector: React.FC = () => {
  useEffect(() => {
    let activeSeo = defaultSeoSettings;

    const applySeoToHead = (seoData: SeoSettings) => {
      try {
        // 1. Update Document Title
        if (seoData.siteTitleTemplate) {
          document.title = seoData.siteTitleTemplate;
        }

        // Helper to update or create meta tags
        const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
          if (!content) return;
          let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
          if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attrName, attrValue);
            document.head.appendChild(el);
          }
          el.setAttribute('content', content);
        };

        // 2. Standard Meta Tags
        setMetaTag('name', 'description', seoData.metaDescription || '');
        if (Array.isArray(seoData.metaKeywords) && seoData.metaKeywords.length > 0) {
          setMetaTag('name', 'keywords', seoData.metaKeywords.join(', '));
        }
        setMetaTag('name', 'robots', seoData.robotsIndex || 'index, follow');
        if (seoData.author) {
          setMetaTag('name', 'author', seoData.author);
        }

        // 3. Verification Tags
        if (seoData.googleVerificationCode) {
          setMetaTag('name', 'google-site-verification', seoData.googleVerificationCode);
        }
        if (seoData.bingVerificationCode) {
          setMetaTag('name', 'msvalidate.01', seoData.bingVerificationCode);
        }

        // 4. OpenGraph Tags
        setMetaTag('property', 'og:title', seoData.ogTitle || seoData.siteTitleTemplate || '');
        setMetaTag('property', 'og:description', seoData.ogDescription || seoData.metaDescription || '');
        setMetaTag('property', 'og:image', seoData.ogImageUrl || '');
        setMetaTag('property', 'og:url', seoData.canonicalUrl || window.location.origin);
        setMetaTag('property', 'og:type', seoData.ogType || 'website');
        setMetaTag('property', 'og:site_name', seoData.siteName || 'سیریک فیت');
        setMetaTag('property', 'og:locale', 'fa_IR');

        // 5. Twitter Card Tags
        setMetaTag('name', 'twitter:card', seoData.twitterCardType || 'summary_large_image');
        setMetaTag('name', 'twitter:title', seoData.ogTitle || seoData.siteTitleTemplate || '');
        setMetaTag('name', 'twitter:description', seoData.ogDescription || seoData.metaDescription || '');
        setMetaTag('name', 'twitter:image', seoData.ogImageUrl || '');
        if (seoData.twitterHandle) {
          setMetaTag('name', 'twitter:site', seoData.twitterHandle);
        }

        // 6. Canonical URL Tag
        if (seoData.canonicalUrl) {
          let canon = document.querySelector('link[rel="canonical"]');
          if (!canon) {
            canon = document.createElement('link');
            canon.setAttribute('rel', 'canonical');
            document.head.appendChild(canon);
          }
          canon.setAttribute('href', seoData.canonicalUrl);
        }

        // 7. Inject JSON-LD Structured Data Schema
        if (seoData.enableOrganizationSchema) {
          let scriptEl = document.getElementById('sirikfit-jsonld-org') as HTMLScriptElement | null;
          if (!scriptEl) {
            scriptEl = document.createElement('script');
            scriptEl.id = 'sirikfit-jsonld-org';
            scriptEl.type = 'application/ld+json';
            document.head.appendChild(scriptEl);
          }

          const schemaData = {
            '@context': 'https://schema.org',
            '@type': seoData.enableLocalBusinessSchema ? 'SportsActivityLocation' : 'Organization',
            'name': seoData.orgName || 'سیریک فیت',
            'legalName': seoData.orgLegalName || 'سیریک فیت',
            'url': seoData.canonicalUrl || window.location.origin,
            'logo': seoData.orgLogoUrl || `${window.location.origin}/favicon.svg`,
            'description': seoData.metaDescription,
            'telephone': seoData.orgPhone,
            'email': seoData.orgEmail,
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': seoData.storeAddress,
              'addressLocality': seoData.storeCity,
              'addressCountry': 'IR'
            },
            'sameAs': [
              seoData.orgInstagram,
              seoData.orgTelegram,
              seoData.orgWhatsapp
            ].filter(Boolean)
          };

          scriptEl.text = JSON.stringify(schemaData);
        }
      } catch (err) {
        console.warn('Error injecting SEO meta tags to document head:', err);
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

    // Load from Firestore
    fetchSeoSettingsFromFirestore().then(remoteData => {
      if (remoteData) {
        activeSeo = { ...defaultSeoSettings, ...remoteData };
        applySeoToHead(activeSeo);
      }
    });

    // Listen to custom updates
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        activeSeo = { ...defaultSeoSettings, ...detail };
        applySeoToHead(activeSeo);
      }
    };

    window.addEventListener('seoSettingsUpdated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('seoSettingsUpdated', handleUpdate as EventListener);
    };
  }, []);

  return null;
};
