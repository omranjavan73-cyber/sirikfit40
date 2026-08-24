import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { backendScraperService } from '../services/scraperService';

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();
let db: any;
try {
  db = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
  }, (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)') ? firebaseConfigJson.firestoreDatabaseId : undefined);
} catch (_e) {
  db = (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)')
    ? getFirestore(firebaseApp, firebaseConfigJson.firestoreDatabaseId)
    : getFirestore(firebaseApp);
}

// Calculate Landed Toman Price (Formula: (priceAed + 20 AED shipping) * (1 + margin%) * aedRate)
function calculateLandedTomanPrice(
  priceAed: number,
  marginPercent: number = 20,
  aedRate: number = 51400
): number {
  if (!priceAed || priceAed <= 0) return 0;
  const baseTotalAed = priceAed + 20; // 20 AED base shipping fee
  const marginMultiplier = 1 + (marginPercent / 100);
  const totalToman = Math.round(baseTotalAed * marginMultiplier * aedRate);
  return Math.round(totalToman / 1000) * 1000;
}

export async function runProductPriceSync(): Promise<{ success: boolean; syncedCount: number; updatedCount: number; errors: string[] }> {
  console.log('[SyncEngine] Starting scheduled product price & stock verification...');
  let syncedCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  try {
    // 1. Fetch current App Settings (AED Rate, Profit Margin)
    const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
    const settings = settingsDoc.exists() ? settingsDoc.data() : {};
    const aedRate = Number(settings?.aedRate || settings?.manualAedRate || 51400);
    const globalMargin = Number(settings?.profitMargin || 20);

    const collectionsToSync = ['iran_warehouse', 'special_deals'];

    for (const colName of collectionsToSync) {
      console.log(`[SyncEngine] Scanning collection: ${colName}`);
      const snap = await getDocs(collection(db, colName));

      for (const docSnap of snap.docs) {
        const item = docSnap.data();
        const docId = docSnap.id;
        const targetUrl = item.url || item.sourceUrl;

        // Only sync items that have external source URLs
        if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('http')) {
          continue;
        }

        // Only sync active or listed products
        if (item.isActive === false && !item.isPopular) {
          continue;
        }

        syncedCount++;

        try {
          // Delay slightly between requests to respect store servers
          await new Promise(res => setTimeout(res, 1200));

          const scraped = await backendScraperService.scrapeProduct(targetUrl);
          if (scraped && scraped.ok && scraped.price && scraped.price > 0) {
            const freshPriceAed = Number(scraped.price);
            const freshInStock = scraped.inStock !== false;
            const itemMargin = Number(item.profitMargin !== undefined ? item.profitMargin : globalMargin);

            const oldPriceAed = Number(item.priceAed || item.basePriceAed || 0);
            const oldInStock = item.inStock !== false;

            // Check if price or stock changed
            const priceChanged = Math.abs(freshPriceAed - oldPriceAed) > 0.01;
            const stockChanged = freshInStock !== oldInStock;

            if (priceChanged || stockChanged) {
              const freshPriceToman = calculateLandedTomanPrice(freshPriceAed, itemMargin, aedRate);

              // Update variants if available
              let updatedVariants = item.variants;
              if (Array.isArray(updatedVariants) && updatedVariants.length > 0) {
                updatedVariants = updatedVariants.map((v: any) => {
                  const vPriceAed = Number(v.priceAed || freshPriceAed);
                  return {
                    ...v,
                    priceAed: priceChanged && v.priceAed === oldPriceAed ? freshPriceAed : vPriceAed,
                    priceAED: priceChanged && v.priceAed === oldPriceAed ? freshPriceAed : vPriceAed,
                    priceToman: calculateLandedTomanPrice(
                      priceChanged && v.priceAed === oldPriceAed ? freshPriceAed : vPriceAed,
                      itemMargin,
                      aedRate
                    ),
                    inStock: freshInStock
                  };
                });
              }

              const updatedDoc = {
                ...item,
                priceAed: freshPriceAed,
                basePriceAed: freshPriceAed,
                priceAED: freshPriceAed,
                priceToman: freshPriceToman,
                inStock: freshInStock,
                variants: updatedVariants,
                lastSyncedAt: new Date().toISOString()
              };

              await setDoc(doc(db, colName, docId), updatedDoc, { merge: true });
              updatedCount++;
              console.log(`[SyncEngine] Successfully updated ${colName}/${docId} (${item.title}): AED ${oldPriceAed} -> ${freshPriceAed}`);
            }
          }
        } catch (itemErr: any) {
          const errMsg = `Error syncing ${colName}/${docId}: ${itemErr?.message || itemErr}`;
          console.warn(`[SyncEngine] ${errMsg}`);
          errors.push(errMsg);
        }
      }
    }

    console.log(`[SyncEngine] Completed sync. Inspected: ${syncedCount}, Updated: ${updatedCount}, Errors: ${errors.length}`);
    return { success: true, syncedCount, updatedCount, errors };
  } catch (globalErr: any) {
    console.error('[SyncEngine] Critical sync failure:', globalErr?.message || globalErr);
    return { success: false, syncedCount, updatedCount, errors: [globalErr?.message || String(globalErr)] };
  }
}

// Cloud Scheduler Trigger: Runs every 72 hours at 03:00 AM UTC
export const syncProductPrices = onSchedule(
  {
    schedule: '0 3 */3 * *',
    timeZone: 'UTC',
    memory: '1GiB',
    timeoutSeconds: 540,
    maxInstances: 1
  },
  async () => {
    await runProductPriceSync();
  }
);
