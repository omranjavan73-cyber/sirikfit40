import React, { useState, useEffect, useMemo } from 'react';
import {
  Bug,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  Globe,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle2,
  FileCode,
  Layers,
  AlertCircle
} from 'lucide-react';
import { db, isFirestoreGrpcNoise } from '../firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { formatPersianDate, toPersianDigits } from '../utils/formatters';

export interface ScraperLogItem {
  id: string;
  timestamp: string;
  targetUrl: string;
  storeName: string;
  errorMessage: string;
  statusCode?: number | string;
  details?: string;
}

interface AdminScraperLogsProps {
  showToast?: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const AdminScraperLogs: React.FC<AdminScraperLogsProps> = ({ showToast }) => {
  const [logs, setLogs] = useState<ScraperLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Live Test Scraper state
  const [testUrl, setTestUrl] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // 1. Realtime Firestore & API Synchronization
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // First attempt backend REST endpoint
      const res = await fetch('/api/admin/scraper-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
          setIsLoading(false);
          return;
        }
      }
    } catch (_apiErr) {}

    // Fallback to direct Firestore collection
    try {
      const snap = await getDocs(collection(db, 'scraper_logs'));
      const items: ScraperLogItem[] = [];
      snap.forEach((d) => {
        items.push(d.data() as ScraperLogItem);
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(items);
    } catch (err: any) {
      if (!isFirestoreGrpcNoise(err)) {
        console.error('Error fetching scraper logs:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Setup realtime Firestore listener
    try {
      const q = query(collection(db, 'scraper_logs'), orderBy('timestamp', 'desc'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: ScraperLogItem[] = [];
          snapshot.forEach((d) => {
            items.push(d.data() as ScraperLogItem);
          });
          if (items.length > 0) {
            setLogs(items);
          }
        },
        (err) => {
          if (!isFirestoreGrpcNoise(err)) {
            console.warn('Realtime scraper_logs listener notice:', err);
          }
        }
      );
      return () => unsub();
    } catch (_e) {}
  }, []);

  // 2. Clear All Logs Handler
  const handleClearAllLogs = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/admin/scraper-logs/clear', { method: 'POST' });
      if (!res.ok) {
        // Fallback to direct Firestore bulk deletion
        const snap = await getDocs(collection(db, 'scraper_logs'));
        const batchPromises: Promise<any>[] = [];
        snap.forEach((d) => {
          batchPromises.push(deleteDoc(doc(db, 'scraper_logs', d.id)));
        });
        await Promise.all(batchPromises);
      }

      setLogs([]);
      setShowClearConfirm(false);
      if (showToast) showToast('تمامی گزارش‌های خطای استخراج با موفقیت پاک شدند.', 'success');
    } catch (err: any) {
      console.error('Error clearing scraper logs:', err);
      if (showToast) showToast('خطا در پاک کردن لاگ‌ها: ' + err.message, 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // 3. Delete Single Log
  const handleDeleteSingleLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'scraper_logs', id));
      setLogs((prev) => prev.filter((item) => item.id !== id));
      if (showToast) showToast('گزارش با موفقیت حذف شد.', 'success');
    } catch (err: any) {
      console.error('Error deleting single log:', err);
    }
  };

  // 4. Live Test Extraction Handler
  const handleRunLiveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl.trim() })
      });
      const data = await res.json();
      setTestResult({
        ok: data.ok || data.success,
        data,
        status: res.status
      });
      // Refresh logs to capture any new error entry
      fetchLogs();
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: err.message || 'خطای شبکه در تست لینک',
        status: 500
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
    if (showToast) showToast('آدرس لینک در حافظه کپی شد.', 'success');
  };

  // 5. Filtered Logs Computation
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUrl = log.targetUrl?.toLowerCase().includes(q);
        const matchStore = log.storeName?.toLowerCase().includes(q);
        const matchError = log.errorMessage?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        if (!matchUrl && !matchStore && !matchError && !matchDetails) return false;
      }

      // Store filter
      if (storeFilter !== 'ALL') {
        const s = (log.storeName || '').toLowerCase();
        const u = (log.targetUrl || '').toLowerCase();
        if (storeFilter === 'DR_NUTRITION' && !s.includes('dr nutrition') && !s.includes('drnutrition') && !u.includes('drnutrition')) return false;
        if (storeFilter === 'GNC' && !s.includes('gnc') && !u.includes('gnc')) return false;
        if (storeFilter === 'LIFE_PHARMACY' && !s.includes('life') && !u.includes('lifepharmacy')) return false;
        if (storeFilter === 'SPORTER' && !s.includes('sporter') && !u.includes('sporter')) return false;
        if (storeFilter === 'NOON' && !s.includes('noon') && !u.includes('noon')) return false;
        if (storeFilter === 'AMAZON' && !s.includes('amazon') && !u.includes('amazon')) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const sc = String(log.statusCode || '');
        if (statusFilter === '403' && sc !== '403' && !log.errorMessage?.includes('403')) return false;
        if (statusFilter === '422' && sc !== '422' && !log.errorMessage?.includes('سلکتور') && !log.errorMessage?.includes('قیمت')) return false;
        if (statusFilter === '500' && sc !== '500' && !log.errorMessage?.includes('سرور')) return false;
      }

      return true;
    });
  }, [logs, searchQuery, storeFilter, statusFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const count403 = logs.filter((l) => String(l.statusCode) === '403' || l.errorMessage?.includes('403') || l.errorMessage?.includes('مسدود')).length;
    const count422 = logs.filter((l) => String(l.statusCode) === '422' || l.errorMessage?.includes('سلکتور') || l.errorMessage?.includes('قیمت')).length;
    const storesSet = new Set(logs.map((l) => l.storeName || 'نامشخص'));
    return {
      total,
      count403,
      count422,
      storesCount: storesSet.size
    };
  }, [logs]);

  const getStoreBadgeColor = (store: string) => {
    const s = (store || '').toLowerCase();
    if (s.includes('dr nutrition') || s.includes('drnutrition')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('gnc')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s.includes('life')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('sporter')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('noon')) return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    if (s.includes('amazon')) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusCodeBadge = (statusCode?: number | string, errorMsg?: string) => {
    const sc = String(statusCode || '');
    if (sc === '403' || errorMsg?.includes('403') || errorMsg?.includes('مسدود')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>۴۰۳ مسدود / کلودفلر</span>
        </span>
      );
    }
    if (sc === '422' || errorMsg?.includes('سلکتور') || errorMsg?.includes('قیمت')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
          <FileCode className="w-3.5 h-3.5" />
          <span>تغییر ساختار DOM / قیمت</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{sc ? `کد ${toPersianDigits(sc)}` : 'خطای استخراج'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]" dir="rtl">
      {/* 1. Header Banner & Actions */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
            <Bug className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                گزارش و عیب‌یابی خطاهای استخراج (Scraper Diagnostic Logs)
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Firestore
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              ثبت هوشمند لینک‌های ناموفق، تغییرات ساختار DOM فروشگاه‌ها و مسدودی‌های فایروال جهت بررسی و اصلاح سریع
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>

          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>پاک کردن گزارش‌ها</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Statistical Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">کل خطاهای ثبت‌شده</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">{toPersianDigits(stats.total)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 block mb-0.5">مسدودی ۴۰۳ / کلودفلر</span>
            <span className="text-xl sm:text-2xl font-black text-rose-600">{toPersianDigits(stats.count403)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 block mb-0.5">خطای سلکتور / DOM</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600">{toPersianDigits(stats.count422)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileCode className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 block mb-0.5">فروشگاه‌های درگیر</span>
            <span className="text-xl sm:text-2xl font-black text-indigo-600">{toPersianDigits(stats.storesCount)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Live URL Scraper Test Bench */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Play className="w-4 h-4 text-indigo-600" />
          <h4 className="font-extrabold text-sm text-slate-900">تست زنده ربات استخراج روی لینک مشخص</h4>
        </div>
        <form onSubmit={handleRunLiveTest} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="url"
            required
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="مثال: https://www.drnutrition.com/en-ae/product/optimum-nutrition-gold-standard-100-whey"
            className="flex-1 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white text-slate-900 text-xs font-mono px-3.5 py-3 rounded-xl focus:outline-none transition text-left"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={isTesting}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 shrink-0"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>اجرای تست استخراج</span>
          </button>
        </form>

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-200 ${
              testResult.ok ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-1.5">
                {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{testResult.ok ? 'استخراج با موفقیت انجام شد' : 'استخراج ناموفق بود'}</span>
              </div>
              <span className="font-mono text-[11px]">وضعیت: {testResult.status}</span>
            </div>
            <pre className="bg-slate-950 text-slate-200 p-3 rounded-xl overflow-x-auto font-mono text-[11px] max-h-48 text-left" dir="ltr">
              {JSON.stringify(testResult.data || testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در لینک، نام فروشگاه یا متن خطا..."
            className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-medium pr-9 pl-3.5 py-2.5 rounded-xl focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">فروشگاه:</span>
          </div>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 cursor-pointer"
          >
            <option value="ALL">همه فروشگاه‌ها</option>
            <option value="DR_NUTRITION">Dr. Nutrition</option>
            <option value="GNC">GNC Store</option>
            <option value="LIFE_PHARMACY">Life Pharmacy</option>
            <option value="SPORTER">Sporter</option>
            <option value="NOON">Noon</option>
            <option value="AMAZON">Amazon.ae</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 cursor-pointer"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="403">۴۰۳ مسدود / کلودفلر</option>
            <option value="422">تغییر ساختار DOM / قیمت</option>
            <option value="500">خطای داخلی سرور ۵۰۰</option>
          </select>
        </div>
      </div>

      {/* 5. Logs Table / List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">در حال فراخوانی گزارش‌های خطای استخراج...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900">هیچ خطایی در استخراج ثبت نشده است</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              ربات‌های استخراج GNC، Dr. Nutrition، Life Pharmacy و سایر فروشگاه‌ها بدون خطا در حال سرویس‌دهی هستند.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition cursor-pointer space-y-3 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${getStoreBadgeColor(log.storeName)}`}>
                        {log.storeName || 'فروشگاه دبی'}
                      </span>
                      {getStatusCodeBadge(log.statusCode, log.errorMessage)}
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-xs font-medium">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatPersianDate(log.timestamp)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingleLog(log.id, e)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="حذف این مورد"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Target URL & Actions */}
                  <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs">
                    <span className="font-mono text-slate-700 truncate text-left flex-1 select-all" dir="ltr">
                      {log.targetUrl}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopyUrl(log.targetUrl, e)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition cursor-pointer"
                        title="کپی لینک"
                      >
                        {copiedUrl === log.targetUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={log.targetUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-white transition cursor-pointer"
                        title="مشاهده صفحه فروشگاه"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Error Message */}
                  <div className="flex items-start gap-2 text-rose-700 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{log.errorMessage}</span>
                  </div>

                  {/* Expand / Collapse Details Trigger */}
                  <div className="flex items-center justify-between text-[11px] text-indigo-600 font-bold pt-1">
                    <span>{isExpanded ? 'بستن جزئیات فنی و لاگ سرور' : 'مشاهده جزئیات فنی و لاگ سرور ←'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {/* Collapsible Details Drawer */}
                  {isExpanded && (
                    <div className="mt-3 p-3.5 bg-slate-950 text-slate-200 rounded-2xl space-y-2 text-xs font-mono text-left animate-in fade-in duration-150" dir="ltr">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                        <span>Log ID: {log.id}</span>
                        <span>Timestamp: {log.timestamp}</span>
                      </div>
                      {log.details ? (
                        <pre className="whitespace-pre-wrap break-all text-[11px] max-h-60 overflow-y-auto text-rose-300">
                          {log.details}
                        </pre>
                      ) : (
                        <p className="text-slate-500 text-[11px]">بدون توضیحات تکمیلی اضافی (DOM mismatch or header abort)</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-base text-slate-900">پاکسازی گزارش‌های خطای استخراج</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                آیا از حذف کامل تمامی لاگ‌های ثبت‌شده در Firestore اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleClearAllLogs}
                disabled={isClearing}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isClearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>بله، پاک شود</span>
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScraperLogs;
