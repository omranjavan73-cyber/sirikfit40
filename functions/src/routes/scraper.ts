import { Router, Request, Response } from 'express';
import { backendScraperService } from '../services/scraperService';
import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { hashUrl } from '../scrapers/utils';

function getAdminDb() {
  try {
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp({ projectId: 'sirikfit40' }) : getApp();
    return getFirestore(app);
  } catch (_e) {
    return null;
  }
}

export const scraperRouter = Router();

/**
 * Unified Extraction Endpoint
 * POST /api/scraper/extract or POST /extract
 * Payload: { url: string, forceRefresh?: boolean }
 */
scraperRouter.post('/extract', async (req: Request, res: Response) => {
  try {
    const { url, forceRefresh } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'پارامتر url الزامی است.'
      });
    }

    const result = await backendScraperService.extractProduct(url, Boolean(forceRefresh));
    if (!result.success || !result.data) {
      return res.status(422).json({
        success: false,
        error: result.error || 'امکان استخراج اطلاعات از لینک مورد نظر وجود ندارد.'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('[scraperRouter] Extraction endpoint uncaught error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'خطای سرور در استخراج اطلاعات لینک.'
    });
  }
});

/**
 * GET extraction helper
 * GET /api/scraper/extract?url=...&forceRefresh=true
 */
scraperRouter.get('/extract', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    const forceRefresh = req.query.forceRefresh === 'true' || req.query.forceRefresh === '1';

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "url" is required.'
      });
    }

    const result = await backendScraperService.extractProduct(url, forceRefresh);
    if (!result.success || !result.data) {
      return res.status(422).json({
        success: false,
        error: result.error || 'Failed to extract product data.'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error.'
    });
  }
});

/**
 * Cache Management Endpoint
 * POST /api/scraper/clear-cache
 * Payload: { url: string }
 */
scraperRouter.post('/clear-cache', async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required.' });
    }

    const urlHash = hashUrl(url);
    const db = getAdminDb();
    if (db) {
      await db.collection('scraped_cache').doc(urlHash).delete();
    }

    return res.json({
      success: true,
      message: `Cache cleared for ${urlHash}`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error clearing cache.'
    });
  }
});
