import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Link2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  CheckCheck,
  Copy,
  Layers,
  ShieldCheck,
  Building2,
  Filter,
  CheckSquare,
  Square,
  MinusSquare,
  Send,
  Warehouse,
  Flame,
  PackageCheck,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertOctagon
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toPersianDigits, formatToman } from '../../utils/formatters';
import { getLinkFreshnessInfo, getLinkAgeInDays } from '../../utils/dateUtils';
import { usePricing } from '../../context/PricingContext';
import { useSettings } from '../../context/SettingsContext';
import {
  syncSingleProductLink,
  batchApplyLinkSync,
  checkSingleLinkHealth,
  sendLinkDiscrepancyTelegramAlert
} from '../../services/adminService';

export interface MonitoredLinkItem {
  id: string;
  collection: 'products' | 'iran_warehouse' | 'special_deals';
  collectionLabel: string;
  title: string;
  titleFa?: string;
  titleEn?: string;
  brand?: string;
  image?: string;
  sourceUrl: string;
  priceAed: number;
  priceToman: number;
  profitMargin?: number;
  inStock: boolean;
  lastSyncedAt?: string;
  lastCheckedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'price_changed' | 'out_of_stock' | 'error' | 'pending' | 'checking';
  livePriceAed?: number;
  livePriceToman?: number;
  liveInStock?: boolean;
  priceDeltaAed?: number;
  priceDeltaToman?: number;
  errorMessage?: string;
  retailerName: string;
}

interface LinkManagementTabProps {
  onAlertCountChange?: (count: number) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LinkManagementTab: React.FC<LinkManagementTabProps> = ({
  onAlertCountChange,
  showToast
}) => {
  const { aedRate, getDynamicToman, calculatePrice } = usePricing();
  const { settings } = useSettings();

  const [items, setItems] = useState<MonitoredLinkItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchApplying, setIsBatchApplying] = useState<boolean>(false);
  const [isFullScanning, setIsFullScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'products' | 'iran_warehouse' | 'special_deals'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'synced' | 'price_changed' | 'out_of_stock' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [retailerFilter, setRetailerFilter] = useState<string>('all');
  const [sortByOldest, setSortByOldest] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  const [isBatchSyncingSelected, setIsBatchSyncingSelected] = useState<boolean>(false);

  // Helper to extract domain retailer name
  const extractRetailerName = (url: string): string => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('noon.com')) return 'Noon UAE';
      if (host.includes('amazon.ae')) return 'Amazon UAE';
      if (host.includes('lifepharmacy.com')) return 'Life Pharmacy';
      if (host.includes('sporter.com')) return 'Sporter';
      if (host.includes('drnutrition.com')) return 'Dr. Nutrition';
      if (host.includes('gnc-mena.com') || host.includes('gnc.ae') || host.includes('gnc.com')) return 'GNC MENA';
      return host.replace('www.', '');
    } catch {
      return 'فروشگاه امارات';
    }
  };

  // Load all monitored links across collections
  const loadMonitoredLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const results: MonitoredLinkItem[] = [];

      // 1. Iran Warehouse Items
      try {
        const snapIran = await getDocs(collection(db, 'iran_warehouse'));
        snapIran.forEach(docSnap => {
          const d = docSnap.data();
          const rawUrl = d.sourceUrl || d.url;
          if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
            const pAed = Number(d.priceAed || d.basePriceAed || 0);
            const calculatedToman = getDynamicToman(pAed, d.weightKg || 0.8, d.profitMargin);
            results.push({
              id: docSnap.id,
              collection: 'iran_warehouse',
              collectionLabel: 'انبار ایران',
              title: d.titleFa || d.title || d.titleEn || 'محصول انبار ایران',
              titleFa: d.titleFa,
              titleEn: d.titleEn,
              brand: d.brand,
              image: d.image || d.imageUrl || (Array.isArray(d.images) ? d.images[0] : ''),
              sourceUrl: rawUrl,
              priceAed: pAed,
              priceToman: calculatedToman || Number(d.priceToman || 0),
              profitMargin: d.profitMargin,
              inStock: d.inStock !== false && (d.quantity === undefined || d.quantity > 0),
              lastSyncedAt: d.lastSyncedAt || d.updatedAt,
              syncStatus: d.syncStatus || 'pending',
              retailerName: extractRetailerName(rawUrl)
            });
          }
        });
      } catch (e) {
        console.warn('Could not load iran_warehouse links:', e);
      }

      // 2. Special Deals Items
      try {
        const snapDeals = await getDocs(collection(db, 'special_deals'));
        snapDeals.forEach(docSnap => {
          const d = docSnap.data();
          const rawUrl = d.sourceUrl || d.url;
          if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
            const pAed = Number(d.priceAed || d.basePriceAed || 0);
            const calculatedToman = getDynamicToman(pAed, d.weightKg || 0.8, d.profitMargin);
            results.push({
              id: docSnap.id,
              collection: 'special_deals',
              collectionLabel: 'پیشنهاد ویژه',
              title: d.titleFa || d.title || d.titleEn || 'پیشنهاد ویژه',
              titleFa: d.titleFa,
              titleEn: d.titleEn,
              brand: d.brand,
              image: d.image || d.imageUrl || (Array.isArray(d.images) ? d.images[0] : ''),
              sourceUrl: rawUrl,
              priceAed: pAed,
              priceToman: calculatedToman || Number(d.priceToman || 0),
              profitMargin: d.profitMargin,
              inStock: d.inStock !== false,
              lastSyncedAt: d.lastSyncedAt || d.updatedAt,
              syncStatus: d.syncStatus || 'pending',
              retailerName: extractRetailerName(rawUrl)
            });
          }
        });
      } catch (e) {
        console.warn('Could not load special_deals links:', e);
      }

      // 3. General Products Catalog
      try {
        const snapProducts = await getDocs(collection(db, 'products'));
        snapProducts.forEach(docSnap => {
          const d = docSnap.data();
          const rawUrl = d.sourceUrl || d.url;
          if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
            const pAed = Number(d.priceAed || d.basePriceAed || 0);
            const calculatedToman = getDynamicToman(pAed, d.weightKg || 0.8, d.profitMargin);
            results.push({
              id: docSnap.id,
              collection: 'products',
              collectionLabel: 'کاتالوگ عمومی',
              title: d.titleFa || d.title || d.titleEn || 'محصول کاتالوگ',
              titleFa: d.titleFa,
              titleEn: d.titleEn,
              brand: d.brand,
              image: d.image || d.imageUrl || (Array.isArray(d.images) ? d.images[0] : ''),
              sourceUrl: rawUrl,
              priceAed: pAed,
              priceToman: calculatedToman || Number(d.priceToman || 0),
              profitMargin: d.profitMargin,
              inStock: d.inStock !== false,
              lastSyncedAt: d.lastSyncedAt || d.updatedAt,
              syncStatus: d.syncStatus || 'pending',
              retailerName: extractRetailerName(rawUrl)
            });
          }
        });
      } catch (e) {
        console.warn('Could not load products links:', e);
      }

      setItems(results);
    } catch (err) {
      console.error('Error loading monitored links:', err);
      if (showToast) showToast('خطا در بارگذاری لیست لینک‌ها', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [getDynamicToman, showToast]);

  useEffect(() => {
    loadMonitoredLinks();
  }, [loadMonitoredLinks]);

  // Bento Summary Metrics (4 Key Cards)
  const metrics = useMemo(() => {
    const total = items.length;
    const synced = items.filter(i => i.syncStatus === 'synced' && i.inStock).length;
    const priceChanged = items.filter(i => i.syncStatus === 'price_changed').length;
    const outOfStock = items.filter(i => i.syncStatus === 'out_of_stock' || !i.inStock).length;
    const errorCount = items.filter(i => i.syncStatus === 'error').length;
    const iranCount = items.filter(i => i.collection === 'iran_warehouse').length;
    const dealsCount = items.filter(i => i.collection === 'special_deals').length;
    const productsCount = items.filter(i => i.collection === 'products').length;
    const problematic = priceChanged + outOfStock + errorCount;
    return { total, synced, priceChanged, outOfStock, errorCount, iranCount, dealsCount, productsCount, problematic };
  }, [items]);

  // Update parent alert badge
  useEffect(() => {
    if (onAlertCountChange) {
      onAlertCountChange(metrics.problematic);
    }
  }, [metrics.problematic, onAlertCountChange]);

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'بررسی نشده';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'همین الان';
      if (diffMins < 60) return `${toPersianDigits(diffMins)} دقیقه پیش`;
      if (diffHours < 24) return `${toPersianDigits(diffHours)} ساعت پیش`;
      if (diffDays < 30) return `${toPersianDigits(diffDays)} روز پیش`;
      return toPersianDigits(date.toLocaleDateString('fa-IR'));
    } catch {
      return 'نامشخص';
    }
  };

  const handleCopyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    if (showToast) showToast('لینک مبدأ با موفقیت کپی شد', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSingleSync = async (item: MonitoredLinkItem) => {
    setSyncingIds(prev => new Set(prev).add(item.id));
    try {
      const res = await syncSingleProductLink({
        collection: item.collection,
        id: item.id,
        url: item.sourceUrl,
        profitMargin: item.profitMargin
      });

      if (res.success && res.item) {
        const freshPriceAed = Number(res.item.priceAed || res.item.price || item.priceAed);
        const dynamicToman = getDynamicToman(freshPriceAed, undefined, item.profitMargin);
        const freshInStock = res.item.inStock !== false;

        setItems(prev =>
          prev.map(it => {
            if (it.id === item.id) {
              return {
                ...it,
                priceAed: freshPriceAed,
                priceToman: dynamicToman || Number(res.item.priceToman || item.priceToman),
                inStock: freshInStock,
                lastSyncedAt: new Date().toISOString(),
                syncStatus: 'synced',
                livePriceAed: undefined,
                livePriceToman: undefined,
                priceDeltaAed: undefined,
                priceDeltaToman: undefined,
                errorMessage: undefined
              };
            }
            return it;
          })
        );
        if (showToast) showToast(`محصول «${item.title}» با موفقیت همگام شد`, 'success');
      } else {
        setItems(prev =>
          prev.map(it => (it.id === item.id ? { ...it, syncStatus: 'error', errorMessage: res.message } : it))
        );
        if (showToast) showToast(`خطا در همگام‌سازی: ${res.message}`, 'error');
      }
    } catch (_err) {
      if (showToast) showToast('خطای سرور هنگام همگام‌سازی', 'error');
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleSendItemAlert = async (item: MonitoredLinkItem) => {
    setSendingAlertId(item.id);
    try {
      let desc = '';
      if (item.liveInStock === false || !item.inStock) {
        desc = 'ناموجود در فروشگاه مبدا دبی';
      } else if (item.livePriceAed !== undefined && Math.abs(item.livePriceAed - item.priceAed) > 0.01) {
        desc = `تغییر قیمت از ${item.priceAed} به ${item.livePriceAed} درهم`;
      } else {
        desc = `قیمت فعلی: ${item.priceAed} درهم (${formatToman(item.priceToman)})`;
      }

      const res = await sendLinkDiscrepancyTelegramAlert({
        sectionName: item.collectionLabel,
        titleFa: item.title,
        sourceUrl: item.sourceUrl,
        statusDescription: desc
      });

      if (res.success) {
        if (showToast) showToast('گزارش مغایرت با موفقیت به تلگرام ارسال شد', 'success');
      } else {
        if (showToast) showToast(`خطا در ارسال تلگرام: ${res.error || 'عدم اتصال'}`, 'error');
      }
    } catch (_err) {
      if (showToast) showToast('خطای شبکه هنگام ارسال هشدار تلگرام', 'error');
    } finally {
      setSendingAlertId(null);
    }
  };

  const handleCheckHealth = async (item: MonitoredLinkItem) => {
    setCheckingIds(prev => new Set(prev).add(item.id));
    try {
      const res = await checkSingleLinkHealth(item.sourceUrl);
      if (res.success && res.scrapedPriceAed !== undefined) {
        const livePriceAed = res.scrapedPriceAed;
        const liveInStock = res.inStock !== false;
        const deltaAed = livePriceAed - item.priceAed;
        const landedToman = getDynamicToman(livePriceAed, undefined, item.profitMargin);
        const deltaToman = landedToman - item.priceToman;

        let calculatedStatus: MonitoredLinkItem['syncStatus'] = 'synced';
        if (!liveInStock) {
          calculatedStatus = 'out_of_stock';
        } else if (Math.abs(deltaAed) > 0.05) {
          calculatedStatus = 'price_changed';
        }

        setItems(prev =>
          prev.map(it =>
            it.id === item.id
              ? {
                  ...it,
                  syncStatus: calculatedStatus,
                  livePriceAed,
                  livePriceToman: landedToman,
                  liveInStock,
                  priceDeltaAed: deltaAed,
                  priceDeltaToman: deltaToman,
                  lastSyncedAt: res.checkedAt || new Date().toISOString(),
                  errorMessage: undefined
                }
              : it
          )
        );

        if (showToast) {
          showToast(
            `استعلام «${item.title}»: ${calculatedStatus === 'synced' ? 'همگام و تطبیق قیمت' : calculatedStatus === 'price_changed' ? 'تغییر قیمت شناسایی شد' : 'عدم موجودی در دبی'}`,
            calculatedStatus === 'synced' ? 'success' : 'error'
          );
        }
      } else {
        setItems(prev =>
          prev.map(it =>
            it.id === item.id
              ? { ...it, syncStatus: 'error', errorMessage: res.error || 'ساختار صفحه تغییر کرده یا لینک نامعتبر است' }
              : it
          )
        );
        if (showToast) showToast(`خطا در بررسی لینک: ${res.error || 'عدم پاسخ‌دهی مبدأ'}`, 'error');
      }
    } catch (_err) {
      if (showToast) showToast('خطای شبکه هنگام بررسی لینک', 'error');
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleRunFullStoreScan = async () => {
    if (items.length === 0) return;
    setIsFullScanning(true);
    setScanProgress({ current: 0, total: items.length });

    if (showToast) showToast(`آغاز پایش سلامت ${toPersianDigits(items.length)} لینک فعال...`, 'info');

    let processed = 0;
    for (const item of items) {
      try {
        setCheckingIds(prev => new Set(prev).add(item.id));
        const res = await checkSingleLinkHealth(item.sourceUrl);

        if (res.success && res.scrapedPriceAed !== undefined) {
          const livePriceAed = res.scrapedPriceAed;
          const liveInStock = res.inStock !== false;
          const deltaAed = livePriceAed - item.priceAed;
          const landedToman = getDynamicToman(livePriceAed, undefined, item.profitMargin);
          const deltaToman = landedToman - item.priceToman;

          let calculatedStatus: MonitoredLinkItem['syncStatus'] = 'synced';
          if (!liveInStock) {
            calculatedStatus = 'out_of_stock';
          } else if (Math.abs(deltaAed) > 0.05) {
            calculatedStatus = 'price_changed';
          }

          setItems(prev =>
            prev.map(it =>
              it.id === item.id
                ? {
                    ...it,
                    syncStatus: calculatedStatus,
                    livePriceAed,
                    livePriceToman: landedToman,
                    liveInStock,
                    priceDeltaAed: deltaAed,
                    priceDeltaToman: deltaToman,
                    lastSyncedAt: res.checkedAt || new Date().toISOString(),
                    errorMessage: undefined
                  }
                : it
            )
          );
        } else {
          setItems(prev =>
            prev.map(it =>
              it.id === item.id
                ? { ...it, syncStatus: 'error', errorMessage: res.error || 'خطای استخراج اطلاعات' }
                : it
            )
          );
        }
      } catch (_err) {
        // Continue scan
      } finally {
        setCheckingIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        processed++;
        setScanProgress({ current: processed, total: items.length });
      }
    }

    setIsFullScanning(false);
    if (showToast) showToast('پایش کامل سلامت لینک‌ها پایان یافت', 'success');
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSyncSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchSyncingSelected(true);
    let successCount = 0;
    const totalToSync = selectedIds.size;

    if (showToast) showToast(`در حال همگام‌سازی ${toPersianDigits(totalToSync)} مورد انتخابی...`, 'info');

    for (const id of Array.from(selectedIds)) {
      const it = items.find(i => i.id === id);
      if (!it) continue;
      try {
        const res = await syncSingleProductLink({
          collection: it.collection,
          id: it.id,
          url: it.sourceUrl,
          profitMargin: it.profitMargin
        });
        if (res.success && res.item) {
          successCount++;
          const freshPriceAed = Number(res.item.priceAed || res.item.price || it.priceAed);
          const dynamicToman = getDynamicToman(freshPriceAed, undefined, it.profitMargin);
          setItems(prev =>
            prev.map(item =>
              item.id === id
                ? {
                    ...item,
                    priceAed: freshPriceAed,
                    priceToman: dynamicToman || Number(res.item.priceToman || item.priceToman),
                    inStock: res.item.inStock !== false,
                    syncStatus: 'synced',
                    livePriceAed: undefined,
                    livePriceToman: undefined,
                    priceDeltaAed: undefined,
                    priceDeltaToman: undefined
                  }
                : item
            )
          );
        }
      } catch (_e) {
        // Continue next
      }
    }

    setIsBatchSyncingSelected(false);
    setSelectedIds(new Set());
    if (showToast) showToast(`${toPersianDigits(successCount)} محصول با موفقیت به‌روزرسانی شدند.`, 'success');
  };

  const pendingUpdates = useMemo(() => {
    return items.filter(
      i =>
        (i.syncStatus === 'price_changed' || i.syncStatus === 'out_of_stock') &&
        i.livePriceAed !== undefined
    );
  }, [items]);

  const handleBatchApplyDiscrepancies = async () => {
    if (pendingUpdates.length === 0) return;
    setIsBatchApplying(true);
    try {
      const payload = pendingUpdates.map(it => ({
        collection: it.collection,
        id: it.id,
        priceAed: it.livePriceAed!,
        basePriceAed: it.livePriceAed!,
        priceToman: it.livePriceToman || getDynamicToman(it.livePriceAed!, undefined, it.profitMargin),
        inStock: it.liveInStock !== false
      }));

      const res = await batchApplyLinkSync(payload);
      if (res.success) {
        if (showToast) {
          showToast(`تغییرات ${toPersianDigits(res.updatedCount || payload.length)} کالا با موفقیت ذخیره شد`, 'success');
        }
        await loadMonitoredLinks();
      } else {
        if (showToast) showToast(`خطا در اعمال همگانی تغییرات: ${res.message}`, 'error');
      }
    } catch (_err) {
      if (showToast) showToast('خطای شبکه هنگام اعمال دسته‌جمعی', 'error');
    } finally {
      setIsBatchApplying(false);
    }
  };

  const retailers = useMemo(() => {
    const list = new Set<string>();
    items.forEach(i => {
      if (i.retailerName) list.add(i.retailerName);
    });
    return Array.from(list);
  }, [items]);

  const filteredItems = useMemo(() => {
    const list = items.filter(item => {
      if (categoryFilter !== 'all' && item.collection !== categoryFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'synced' && item.syncStatus !== 'synced') return false;
        if (statusFilter === 'price_changed' && item.syncStatus !== 'price_changed') return false;
        if (statusFilter === 'out_of_stock' && item.syncStatus !== 'out_of_stock') return false;
        if (statusFilter === 'error' && item.syncStatus !== 'error') return false;
      }
      if (retailerFilter !== 'all' && item.retailerName !== retailerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchEn = (item.titleEn || '').toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q);
        const matchUrl = (item.sourceUrl || '').toLowerCase().includes(q);
        if (!matchTitle && !matchEn && !matchBrand && !matchUrl) return false;
      }
      return true;
    });

    if (sortByOldest) {
      return [...list].sort((a, b) => {
        const ageA = getLinkAgeInDays(a.lastCheckedAt || a.lastSyncedAt || (a as any).createdAt || (a as any).updatedAt);
        const ageB = getLinkAgeInDays(b.lastCheckedAt || b.lastSyncedAt || (b as any).createdAt || (b as any).updatedAt);
        return ageB - ageA; // Oldest first
      });
    }

    return list;
  }, [items, categoryFilter, statusFilter, retailerFilter, searchQuery, sortByOldest]);

  const isAllSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < filteredItems.length;

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]">
      {/* 1. Bento KPI Grid (4 High-Performance Summary Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Monitored URLs */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">کل لینک‌های فعال</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {toPersianDigits(metrics.total)}
            </span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              پایش مداوم
            </span>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 font-medium">
            شامل {toPersianDigits(metrics.iranCount)} انبار ایران • {toPersianDigits(metrics.dealsCount)} پیشنهاد ویژه
          </p>
        </div>

        {/* Card 2: In-Stock & Synced */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs hover:border-emerald-200 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">موجود و همگام در دبی</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">
              {toPersianDigits(metrics.synced)}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              آماده سفارش
            </span>
          </div>
          <p className="mt-2 text-[10px] text-emerald-600/80 font-medium">
            قیمت و موجودی مبدأ منطبق با سیستم
          </p>
        </div>

        {/* Card 3: Price Drift Warning */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs hover:border-amber-200 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">نوسان و تغییر قیمت</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 tracking-tight">
              {toPersianDigits(metrics.priceChanged)}
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              نیازمند تایید
            </span>
          </div>
          <p className="mt-2 text-[10px] text-amber-600/80 font-medium">
            اختلاف قیمت شناسایی شده در فروشگاه مبدأ
          </p>
        </div>

        {/* Card 4: Out of Stock in Dubai */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs hover:border-rose-200 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">ناموجود در دبی</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600 tracking-tight">
              {toPersianDigits(metrics.outOfStock)}
            </span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
              اتمام موجودی
            </span>
          </div>
          <p className="mt-2 text-[10px] text-rose-600/80 font-medium">
            عدم موجودی محصول در فروشگاه اصلی دبی
          </p>
        </div>
      </div>

      {/* Discrepancy Action Banner */}
      {pendingUpdates.length > 0 && (
        <div className="bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black">
                {toPersianDigits(pendingUpdates.length)} مورد نوسان یا ناموجودی کشف شده در استعلام زنده
              </h4>
              <p className="text-[11px] text-amber-100 mt-0.5">
                با تایید دکمه زیر، نرخ‌های جدید و وضعیت موجودی به صورت خودکار در پایگاه داده اعمال می‌گردد.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBatchApplyDiscrepancies}
            disabled={isBatchApplying}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-amber-900 text-xs font-black rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isBatchApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4 text-emerald-600" />}
            <span>اعمال تغییرات کشف‌شده</span>
          </button>
        </div>
      )}

      {/* 2. Consolidated Toolbar & Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800">نرخ فعال حواله درهم:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-black font-mono">
              {toPersianDigits(formatToman(aedRate))}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">موتور پویا Firestore</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Run Full Scan Button */}
            <button
              type="button"
              onClick={handleRunFullStoreScan}
              disabled={isFullScanning || isBatchApplying}
              className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isFullScanning ? (
                <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
              ) : (
                <Activity className="w-4 h-4 text-emerald-400" />
              )}
              <span>
                {isFullScanning
                  ? `در حال پایش (${toPersianDigits(scanProgress.current)} از ${toPersianDigits(scanProgress.total)})...`
                  : 'پایش زنده سلامت همه لینک‌ها'}
              </span>
            </button>

            {/* Refresh List Button */}
            <button
              type="button"
              onClick={loadMonitoredLinks}
              disabled={isLoading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition cursor-pointer"
              title="بارگذاری مجدد لیست"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scan Progress Bar */}
        {isFullScanning && (
          <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>پیشرفت اسکن خودکار مبدأ...</span>
              <span>
                {toPersianDigits(Math.round((scanProgress.current / (scanProgress.total || 1)) * 100))}٪
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-red-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(scanProgress.current / (scanProgress.total || 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Category Pills & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>همه ({toPersianDigits(metrics.total)})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('iran_warehouse')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                categoryFilter === 'iran_warehouse'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>انبار ایران ({toPersianDigits(metrics.iranCount)})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('special_deals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                categoryFilter === 'special_deals'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>پیشنهاد ویژه ({toPersianDigits(metrics.dealsCount)})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('products')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                categoryFilter === 'products'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>کاتالوگ ({toPersianDigits(metrics.productsCount)})</span>
            </button>

            <button
              type="button"
              onClick={() => setSortByOldest(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                sortByOldest
                  ? 'bg-rose-700 text-white shadow-xs ring-2 ring-rose-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title="مرتب‌سازی بر اساس قدیمی‌ترین لینک‌ها (نیاز به پایش مجدد)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>مرتب‌سازی بر اساس قدیمی‌ترین لینک‌ها</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام محصول، برند یا آدرس اینترنتی..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-800 transition"
              />
            </div>

            {retailers.length > 0 && (
              <select
                value={retailerFilter}
                onChange={e => setRetailerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-slate-800 transition cursor-pointer"
              >
                <option value="all">همه فروشگاه‌ها</option>
                {retailers.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Multi-Select Floating Toolbar */}
        {selectedIds.size > 0 && (
          <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black">
                {toPersianDigits(selectedIds.size)} مورد انتخاب شده
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncSelected}
                disabled={isBatchSyncingSelected}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBatchSyncingSelected ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>همگام‌سازی انتخاب‌شده‌ها</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                لغو انتخاب
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Link Monitoring Table */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <RefreshCw className="w-7 h-7 text-slate-900 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">در حال بارگذاری لیست لینک‌ها و محاسبه قیمت‌های پویا...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <Link2 className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">هیچ محصولی با فیلترهای انتخابی یافت نشد</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            محصولاتی که دارای آدرس اینترنتی معتبر در فروشگاه مبدأ هستند در این بخش جهت پایش سلامت لینک و مغایرت قیمت لیست می‌شوند.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="max-h-[720px] overflow-y-auto overflow-x-auto relative">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-white/95 backdrop-blur z-20 shadow-xs border-b border-slate-200 text-slate-700 font-black">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:text-slate-900 transition cursor-pointer"
                      title={isAllSelected ? 'لغو انتخاب همه' : 'انتخاب همه'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : isPartiallySelected ? (
                        <MinusSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">مشخصات محصول</th>
                  <th className="py-2.5 px-3">فروشگاه و لینک مبدأ</th>
                  <th className="py-2.5 px-3 text-center">روز</th>
                  <th className="py-2.5 px-3">قیمت محاسبه‌شده</th>
                  <th className="py-2.5 px-3">استعلام زنده مبدأ</th>
                  <th className="py-2.5 px-3">وضعیت سلامت</th>
                  <th className="py-2.5 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const isChecking = checkingIds.has(item.id);
                  const isSyncing = syncingIds.has(item.id);
                  const isSelected = selectedIds.has(item.id);
                  const isSendingAlert = sendingAlertId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(item.id)}
                          className="p-1 hover:text-slate-900 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* Product details */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-contain p-0.5"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Building2 className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="space-y-0.5 max-w-xs">
                            <span className="font-black text-slate-900 line-clamp-1 text-xs">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.collection === 'iran_warehouse' && (
                                <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                                  انبار ایران
                                </span>
                              )}
                              {item.collection === 'special_deals' && (
                                <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/80">
                                  پیشنهاد ویژه
                                </span>
                              )}
                              {item.collection === 'products' && (
                                <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200/80">
                                  کاتالوگ
                                </span>
                              )}
                              {item.brand && (
                                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                                  {item.brand}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Store & URL */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-black">
                            <span>{item.retailerName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px]">
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-blue-600 hover:text-blue-700 hover:underline max-w-[140px] truncate dir-ltr inline-block font-mono text-[10px]"
                              title={item.sourceUrl}
                            >
                              {item.sourceUrl}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(item.id, item.sourceUrl)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="کپی لینک"
                            >
                              {copiedId === item.id ? (
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                              title="مشاهده در تب جدید"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Numeric Link Age Pill */}
                      <td className="py-2.5 px-3 text-center">
                        {(() => {
                          const timestamp = item.lastCheckedAt || item.lastSyncedAt || (item as any).createdAt || (item as any).updatedAt;
                          const freshness = getLinkFreshnessInfo(timestamp);

                          return (
                            <div
                              className="inline-flex flex-col items-center gap-0.5"
                              title={`سن لینک: ${freshness.label} - آخرین بررسی: ${formatRelativeTime(timestamp)}`}
                            >
                              <span className={`inline-flex items-center justify-center min-w-[28px] ${freshness.numericBadgeClass}`}>
                                {freshness.numericBadge}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">روز</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Current Dynamic Landed Price */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-900 font-mono text-xs">
                            {toPersianDigits(item.priceAed.toFixed(2))} AED
                          </div>
                          <div className="text-[10px] font-bold text-slate-600">
                            {formatToman(item.priceToman)}
                          </div>
                          <div>
                            {item.inStock ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                موجود
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                ناموجود
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Live Scraped Price */}
                      <td className="py-2.5 px-3">
                        {item.livePriceAed !== undefined ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-black text-slate-900 font-mono text-xs">
                              <span>{toPersianDigits(item.livePriceAed.toFixed(2))} AED</span>
                              {item.priceDeltaAed !== undefined && Math.abs(item.priceDeltaAed) > 0.01 && (
                                <span
                                  className={`text-[9px] px-1 rounded font-bold ${
                                    item.priceDeltaAed > 0
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {item.priceDeltaAed > 0 ? '+' : ''}
                                  {toPersianDigits(item.priceDeltaAed.toFixed(1))}
                                </span>
                              )}
                            </div>
                            {item.livePriceToman !== undefined && (
                              <div className="text-[10px] font-bold text-slate-600">
                                {formatToman(item.livePriceToman)}
                              </div>
                            )}
                            <div>
                              {item.liveInStock !== false ? (
                                <span className="text-[9px] font-bold text-emerald-600">🟢 موجود در مبدأ</span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-600">🔴 ناموجود در مبدأ</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">در انتظار استعلام</span>
                        )}
                      </td>

                      {/* Sync Status Badge */}
                      <td className="py-2.5 px-3">
                        {item.syncStatus === 'synced' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>همگام و منطبق</span>
                          </span>
                        )}

                        {item.syncStatus === 'price_changed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black">
                            <AlertTriangle className="w-3 h-3" />
                            <span>تغییر قیمت</span>
                          </span>
                        )}

                        {item.syncStatus === 'out_of_stock' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                            <XCircle className="w-3 h-3" />
                            <span>ناموجود در دبی</span>
                          </span>
                        )}

                        {item.syncStatus === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-black">
                            <ShieldCheck className="w-3 h-3" />
                            <span>خطای استخراج</span>
                          </span>
                        )}

                        {(!item.syncStatus || item.syncStatus === 'pending') && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold">
                            بررسی نشده
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCheckHealth(item)}
                            disabled={isChecking || isSyncing}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
                            title="استعلام زنده"
                          >
                            <Search className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSingleSync(item)}
                            disabled={isChecking || isSyncing}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-black text-white font-black text-[10px] transition shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="همگام‌سازی مستقیم در دیتابیس"
                          >
                            {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 text-emerald-400" />}
                            <span>همگام</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendItemAlert(item)}
                            disabled={isSendingAlert}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 transition cursor-pointer disabled:opacity-50"
                            title="ارسال هشدار تلگرام"
                          >
                            {isSendingAlert ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-bold gap-2">
            <span>
              نمایش {toPersianDigits(filteredItems.length)} از {toPersianDigits(items.length)} لینک پایش‌شده
            </span>
            <div className="flex items-center gap-2">
              <span>نرخ محاسباتی جاری: {toPersianDigits(formatToman(aedRate))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
