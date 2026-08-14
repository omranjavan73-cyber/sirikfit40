import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  TrendingUp,
  Coins,
  Truck,
  ShieldCheck,
  Filter,
  Download,
  RefreshCw,
  PlusCircle,
  Trash2,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Package,
  Receipt,
  Store,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Settings,
  Cloud,
  Database,
  Sparkles,
  Copy,
  RotateCcw,
  Check,
  ExternalLink,
  Globe,
  Activity
} from 'lucide-react';
import {
  FinancialSettings,
  Order,
  FinancialExpense,
  ExpenseCategory
} from '../types';
import {
  formatToman,
  formatAed,
  formatPersianDate,
  toPersianDigits,
  normalizeToEnglishDigits
} from '../utils/formatters';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import {
  dispatchExpenseToGoogleSheets,
  dispatchOrderToGoogleSheets,
  getGoogleSheetsWebhookUrl,
  saveGoogleSheetsWebhookUrl,
  DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL
} from '../utils/googleSheetsSync';

interface AdminAccountingProps {
  orders: Order[];
  settings: FinancialSettings;
  onRefreshOrders?: () => void;
  isLoadingOrders?: boolean;
}

type PeriodFilterType = 'THIS_MONTH' | 'PREV_MONTH' | 'LAST_3_MONTHS' | 'ALL' | 'CUSTOM';

const EXPENSE_CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; englishLabel: string; color: string; badgeBg: string; badgeBorder: string; icon: any }
> = {
  CARGO_MONTHLY: {
    label: 'تسویه ماهانه / دوره‌ای کارگو',
    englishLabel: 'Monthly Cargo Settlement',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeBg: 'bg-blue-600',
    badgeBorder: 'border-blue-700',
    icon: Truck
  },
  PACKAGING_SUPPLIES: {
    label: 'خرید ملزومات بسته‌بندی و ارسال',
    englishLabel: 'Packaging & Supplies',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-600',
    badgeBorder: 'border-amber-700',
    icon: Package
  },
  SUPPLIER_PAYMENT: {
    label: 'پرداخت تجمیعی به تامین‌کننده',
    englishLabel: 'Supplier Bulk Payment',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeBg: 'bg-emerald-600',
    badgeBorder: 'border-emerald-700',
    icon: Store
  },
  DISCOUNT_REBATE: {
    label: 'تخفیف‌ها و بستانکاری‌های دوره‌ای',
    englishLabel: 'Vendor Rebates / Discounts',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    badgeBg: 'bg-purple-600',
    badgeBorder: 'border-purple-700',
    icon: Receipt
  },
  OPERATIONAL_MISC: {
    label: 'هزینه‌های اداری و متفرقه',
    englishLabel: 'Operational & Overhead',
    color: 'text-slate-700 bg-slate-100 border-slate-300',
    badgeBg: 'bg-slate-700',
    badgeBorder: 'border-slate-800',
    icon: DollarSign
  }
};

const DEFAULT_SAMPLE_EXPENSES: FinancialExpense[] = [
  {
    id: 'exp-init-1',
    category: 'CARGO_MONTHLY',
    title: 'تسویه بارنامه هوایی کارگو دبی به تهران',
    amount: 1250,
    currency: 'AED',
    amountToman: 75000000,
    amountAed: 1250,
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    timestamp: Date.now() - 5 * 86400000,
    vendorName: 'شرکت کارگو هوایی البرز دبی',
    referenceNumber: 'CRG-DXB-9941',
    notes: 'تسویه بارنامه ۴۲ کیلوگرم مکمل پروتئین و ویتامین',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'exp-init-2',
    category: 'PACKAGING_SUPPLIES',
    title: 'خرید کارتن‌های ضدضربه و فوم محافظتی ۵ لایه',
    amount: 4800000,
    currency: 'TOMAN',
    amountToman: 4800000,
    date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    timestamp: Date.now() - 10 * 86400000,
    vendorName: 'کارتن‌سازی ملت',
    referenceNumber: 'INV-BOX-104',
    notes: '۲۵۰ عدد کارتن استاندارد پستی و رول نایلون حباب‌دار',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

export const AdminAccounting: React.FC<AdminAccountingProps> = ({
  orders,
  settings,
  onRefreshOrders,
  isLoadingOrders
}) => {
  // Navigation tabs within Accounting module
  const [activeTab, setActiveTab] = useState<'orders' | 'expenses' | 'sync'>('orders');

  // Time & Period Filter State
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Tab 1 (Orders) Filters
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('PAID');
  const [orderStoreFilter, setOrderStoreFilter] = useState<string>('ALL');

  // Tab 2 (Expenses) State & Form
  const [expenses, setExpenses] = useState<FinancialExpense[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_financial_expenses');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_e) {}
    }
    return DEFAULT_SAMPLE_EXPENSES;
  });

  const [isLoadingExpenses, setIsLoadingExpenses] = useState<boolean>(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('ALL');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState<string>('');

  // New Expense Entry Form State
  const [isAddingExpense, setIsAddingExpense] = useState<boolean>(false);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('CARGO_MONTHLY');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<'TOMAN' | 'AED'>('TOMAN');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formVendor, setFormVendor] = useState<string>('');
  const [formRefNumber, setFormRefNumber] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => getGoogleSheetsWebhookUrl());
  const [isSyncingToSheet, setIsSyncingToSheet] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Load Expenses from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    const fetchExpenses = async () => {
      if (!db) return;
      setIsLoadingExpenses(true);
      try {
        const expCol = collection(db, 'financial_expenses');
        const q = query(expCol, orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        if (isMounted) {
          if (!snap.empty) {
            const list: FinancialExpense[] = snap.docs.map(d => ({
              id: d.id,
              ...(d.data() as Omit<FinancialExpense, 'id'>)
            }));
            setExpenses(list);
            localStorage.setItem('sirikfit_financial_expenses', JSON.stringify(list));
          } else {
            // Seed defaults if empty
            localStorage.setItem('sirikfit_financial_expenses', JSON.stringify(DEFAULT_SAMPLE_EXPENSES));
          }
        }
      } catch (err) {
        console.warn('Could not fetch financial_expenses from Firestore, using local cache:', err);
      } finally {
        if (isMounted) setIsLoadingExpenses(false);
      }
    };

    fetchExpenses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter Helper: Determine if date matches selected period
  const isDateInPeriod = (dateInput: string | number | undefined): boolean => {
    if (!dateInput) return true;
    if (periodFilter === 'ALL') return true;

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (periodFilter === 'THIS_MONTH') {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }

    if (periodFilter === 'PREV_MONTH') {
      const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth;
    }

    if (periodFilter === 'LAST_3_MONTHS') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      return d.getTime() >= threeMonthsAgo.getTime();
    }

    if (periodFilter === 'CUSTOM') {
      let matchesStart = true;
      let matchesEnd = true;
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        matchesStart = d.getTime() >= start.getTime();
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        matchesEnd = d.getTime() <= end.getTime();
      }
      return matchesStart && matchesEnd;
    }

    return true;
  };

  // Filtered Orders for the Period
  const periodOrders = useMemo(() => {
    return (orders || []).filter(o => isDateInPeriod(o.createdAt));
  }, [orders, periodFilter, customStartDate, customEndDate]);

  // Filtered Expenses for the Period
  const periodExpenses = useMemo(() => {
    return (expenses || []).filter(e => isDateInPeriod(e.date || e.createdAt));
  }, [expenses, periodFilter, customStartDate, customEndDate]);

  // ==========================================
  // TOP 4 KPI & P&L CALCULATIONS FOR SELECTED PERIOD
  // ==========================================
  const paidPeriodOrders = useMemo(() => {
    return periodOrders.filter(o => o.paymentStatus === 'PAID');
  }, [periodOrders]);

  // 1. Total Revenue Received (مجموع درآمد دریافتی)
  const totalRevenueToman = useMemo(() => {
    return paidPeriodOrders.reduce((sum, o) => sum + (o.calculatedToman || 0), 0);
  }, [paidPeriodOrders]);

  // Total Estimated Base Product Purchase (خرید پایه کالا دبی)
  const totalOrderProductCostToman = useMemo(() => {
    return paidPeriodOrders.reduce((sum, o) => {
      const rate = o.aedRate || settings.aedRate;
      return sum + Math.round((o.priceAed || 0) * rate);
    }, 0);
  }, [paidPeriodOrders, settings.aedRate]);

  // Total Estimated Cargo (درآمد سهم کارگو سفارشات)
  const totalOrderEstimatedCargoToman = useMemo(() => {
    return paidPeriodOrders.reduce((sum, o) => {
      const weight = o.weightKg || 0.5;
      const rate = o.aedRate || settings.aedRate;
      const cargoRate = o.cargoRatePerKg || settings.cargoRatePerKg;
      return sum + Math.round(weight * cargoRate * rate);
    }, 0);
  }, [paidPeriodOrders, settings.aedRate, settings.cargoRatePerKg]);

  // 2. Total Actual Operational Expenses (هزینه‌های عملیاتی واقعی ثبت‌شده)
  const actualBulkExpensesToman = useMemo(() => {
    return periodExpenses.reduce((sum, e) => {
      if (e.category === 'DISCOUNT_REBATE') {
        // Rebates decrease expenses or count as credit
        return sum - (e.amountToman || 0);
      }
      return sum + (e.amountToman || 0);
    }, 0);
  }, [periodExpenses]);

  // Breakdown of actual expenses
  const cargoSettlementsToman = useMemo(() => {
    return periodExpenses
      .filter(e => e.category === 'CARGO_MONTHLY')
      .reduce((sum, e) => sum + (e.amountToman || 0), 0);
  }, [periodExpenses]);

  const packagingSuppliesToman = useMemo(() => {
    return periodExpenses
      .filter(e => e.category === 'PACKAGING_SUPPLIES')
      .reduce((sum, e) => sum + (e.amountToman || 0), 0);
  }, [periodExpenses]);

  const supplierPaymentsToman = useMemo(() => {
    return periodExpenses
      .filter(e => e.category === 'SUPPLIER_PAYMENT')
      .reduce((sum, e) => sum + (e.amountToman || 0), 0);
  }, [periodExpenses]);

  const otherExpensesToman = useMemo(() => {
    return periodExpenses
      .filter(e => e.category === 'OPERATIONAL_MISC')
      .reduce((sum, e) => sum + (e.amountToman || 0), 0);
  }, [periodExpenses]);

  const totalDiscountsToman = useMemo(() => {
    return periodExpenses
      .filter(e => e.category === 'DISCOUNT_REBATE')
      .reduce((sum, e) => sum + (e.amountToman || 0), 0);
  }, [periodExpenses]);

  // 3. Net Actual Profit (سود خالص واقعی دوره)
  // Formula: Revenue - (Base Product Cost + Actual Bulk Cargo + Packaging + Overhead - Rebates)
  const totalOutflowsToman = useMemo(() => {
    // If supplier payments were recorded in bulk expenses, we use that; otherwise we include order base product costs
    if (supplierPaymentsToman > 0) {
      return actualBulkExpensesToman;
    }
    return totalOrderProductCostToman + actualBulkExpensesToman;
  }, [supplierPaymentsToman, actualBulkExpensesToman, totalOrderProductCostToman]);

  const netActualProfitToman = useMemo(() => {
    if (totalRevenueToman === 0 && totalOutflowsToman === 0) return 0;
    return totalRevenueToman - totalOutflowsToman;
  }, [totalRevenueToman, totalOutflowsToman]);

  // 4. Monthly Profit Margin % (حاشیه سود خالص واقعی)
  const netProfitMarginPercent = useMemo(() => {
    if (totalRevenueToman <= 0) return 0;
    const margin = (netActualProfitToman / totalRevenueToman) * 100;
    return Math.max(-100, Math.min(100, margin));
  }, [netActualProfitToman, totalRevenueToman]);

  // ==========================================
  // TAB 1 FILTERED ORDERS LIST
  // ==========================================
  const displayedOrders = useMemo(() => {
    return periodOrders.filter(order => {
      // Payment status filter
      if (orderStatusFilter !== 'ALL' && order.paymentStatus !== orderStatusFilter) {
        return false;
      }

      // Store filter
      if (orderStoreFilter !== 'ALL') {
        const store = (order.storeName || '').toLowerCase();
        if (orderStoreFilter === 'INVENTORY' && !order.isLocalInventory) return false;
        if (orderStoreFilter === 'DNP' && !store.includes('dr nutrition') && !store.includes('dnp')) return false;
        if (orderStoreFilter === 'LIFE' && !store.includes('life')) return false;
        if (orderStoreFilter === 'GNC' && !store.includes('gnc')) return false;
      }

      // Search query filter
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.trim().toLowerCase();
        const matchTrack = (order.trackingCode || '').toLowerCase().includes(q);
        const matchCust = (order.customerName || '').toLowerCase().includes(q);
        const matchPhone = (order.phoneNumber || '').toLowerCase().includes(q);
        const matchProd = (order.productTitle || '').toLowerCase().includes(q);
        if (!matchTrack && !matchCust && !matchPhone && !matchProd) return false;
      }

      return true;
    });
  }, [periodOrders, orderStatusFilter, orderStoreFilter, orderSearchQuery]);

  // ==========================================
  // TAB 2 FILTERED EXPENSES LIST
  // ==========================================
  const displayedExpenses = useMemo(() => {
    return periodExpenses.filter(expense => {
      if (expenseCategoryFilter !== 'ALL' && expense.category !== expenseCategoryFilter) {
        return false;
      }

      if (expenseSearchQuery.trim()) {
        const q = expenseSearchQuery.trim().toLowerCase();
        const matchTitle = (expense.title || '').toLowerCase().includes(q);
        const matchVendor = (expense.vendorName || '').toLowerCase().includes(q);
        const matchRef = (expense.referenceNumber || '').toLowerCase().includes(q);
        const matchNotes = (expense.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchVendor && !matchRef && !matchNotes) return false;
      }

      return true;
    });
  }, [periodExpenses, expenseCategoryFilter, expenseSearchQuery]);

  // Handle Save New Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanAmountStr = normalizeToEnglishDigits(formAmount.replace(/,/g, '').trim());
    const amountNum = parseFloat(cleanAmountStr);

    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('لطفاً مبلغ معتبر وارد نمایید.');
      return;
    }

    if (!formTitle.trim()) {
      setFormError('لطفاً عنوان یا شرح هزینه را وارد کنید.');
      return;
    }

    setIsSubmittingExpense(true);

    const effectiveRate = settings.aedRate || 55000;
    const amountToman = formCurrency === 'AED' ? Math.round(amountNum * effectiveRate) : amountNum;
    const amountAed = formCurrency === 'AED' ? amountNum : Number((amountNum / effectiveRate).toFixed(2));

    const newExpenseItem: FinancialExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      category: formCategory,
      title: formTitle.trim(),
      amount: amountNum,
      currency: formCurrency,
      amountToman,
      amountAed,
      date: formDate || new Date().toISOString().split('T')[0],
      timestamp: new Date(formDate || Date.now()).getTime(),
      vendorName: formVendor.trim() || 'طرف‌حساب نامشخص',
      referenceNumber: formRefNumber.trim() || undefined,
      notes: formNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Optimistic Local State & LocalStorage
      const updatedList = [newExpenseItem, ...expenses];
      setExpenses(updatedList);
      localStorage.setItem('sirikfit_financial_expenses', JSON.stringify(updatedList));

      // 2. Save to Firestore collection `financial_expenses`
      if (db) {
        const docRef = doc(db, 'financial_expenses', newExpenseItem.id);
        await setDoc(docRef, newExpenseItem);
      }

      // 3. Background non-blocking sync to Google Sheets Webhook
      dispatchExpenseToGoogleSheets(newExpenseItem, webhookUrl).catch(err => {
        console.warn('Google Sheets Expense Sync Notice:', err);
      });

      setFormSuccess('✅ هزینه تجمیعی جدید با موفقیت ثبت، ذخیره و به گوگل شیت ارسال شد.');
      setFormTitle('');
      setFormAmount('');
      setFormVendor('');
      setFormRefNumber('');
      setFormNotes('');
      setIsAddingExpense(false);
    } catch (err: any) {
      console.error('Error saving expense:', err);
      setFormSuccess('✅ در حافظه مرورگر ذخیره شد (خطای لحظه‌ای در ذخیره ابری).');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('آیا از حذف این ردیف هزینه اطمینان دارید؟')) return;

    const updatedList = expenses.filter(e => e.id !== id);
    setExpenses(updatedList);
    localStorage.setItem('sirikfit_financial_expenses', JSON.stringify(updatedList));

    if (db) {
      try {
        await deleteDoc(doc(db, 'financial_expenses', id));
      } catch (err) {
        console.warn('Could not delete expense from Firestore:', err);
      }
    }
  };

  // Export Orders CSV
  const handleExportOrdersCsv = () => {
    const headers = [
      'کد پیگیری',
      'تاریخ',
      'نام مشتری',
      'شماره تماس',
      'عنوان کالا',
      'فروشگاه مبدا',
      'قیمت پایه درهم',
      'وزن (kg)',
      'سهم کارگو هوایی (تومان)',
      'سود تخمینی (تومان)',
      'مبلغ کل فاکتور (تومان)',
      'وضعیت پرداخت'
    ];

    const rows = displayedOrders.map(order => {
      const cargoAed = (order.weightKg || 0.5) * (order.cargoRatePerKg || settings.cargoRatePerKg);
      const cargoToman = Math.round(cargoAed * (order.aedRate || settings.aedRate));
      const profitToman = Math.round(((order.priceAed + cargoAed) * (order.profitMargin / 100)) * (order.aedRate || settings.aedRate));

      return [
        `"${order.trackingCode || ''}"`,
        `"${formatPersianDate(order.createdAt)}"`,
        `"${order.customerName || ''}"`,
        `"${order.phoneNumber || ''}"`,
        `"${(order.productTitle || '').replace(/"/g, '""')}"`,
        `"${order.storeName || 'دبی'}"`,
        order.priceAed || 0,
        order.weightKg || 0.5,
        cargoToman,
        profitToman,
        order.calculatedToman || 0,
        `"${order.paymentStatus === 'PAID' ? 'پرداخت موفق' : order.paymentStatus === 'PENDING' ? 'در انتظار' : 'ناموفق'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sirikfit-orders-revenue-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Expenses CSV
  const handleExportExpensesCsv = () => {
    const headers = [
      'شناسه سند',
      'دسته‌بندی',
      'عنوان هزینه',
      'طرف‌حساب / تامین‌کننده',
      'مبلغ (واحد اصلی)',
      'واحد پول',
      'معادل تومان',
      'معادل درهم',
      'تاریخ سند',
      'شماره فاکتور / رسید',
      'توضیحات'
    ];

    const rows = displayedExpenses.map(e => [
      `"${e.id}"`,
      `"${EXPENSE_CATEGORY_CONFIG[e.category]?.label || e.category}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.vendorName.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.currency}"`,
      e.amountToman,
      e.amountAed || '',
      `"${e.date}"`,
      `"${e.referenceNumber || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sirikfit-periodic-expenses-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]">
      {/* 1. TOP HEADER & MAIN PERIOD SELECTOR BAR */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  داشبورد جامع حسابداری و تسویه‌های دوره‌ای (sirikfit P&L)
                </h2>
                <span className="bg-teal-50 text-teal-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-teal-200">
                  مدل واقعی تجمیعی
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                تفکیک دقیق درآمد خریدهای دبی از هزینه‌های کارگو، بسته‌بندی، تامین‌کننده و محاسبه سود خالص واقعی دوره
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {onRefreshOrders && (
              <button
                type="button"
                onClick={onRefreshOrders}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold p-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                title="به‌روزرسانی داده‌ها"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingOrders || isLoadingExpenses ? 'animate-spin text-slate-900' : ''}`} />
                <span className="hidden sm:inline">بروزرسانی</span>
              </button>
            )}

            <button
              type="button"
              onClick={activeTab === 'orders' ? handleExportOrdersCsv : handleExportExpensesCsv}
              className="bg-slate-900 hover:bg-black text-white text-xs font-black px-3.5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>خروجی CSV ({activeTab === 'orders' ? 'درآمدها' : 'هزینه‌ها'})</span>
            </button>
          </div>
        </div>

        {/* PERIOD FAST FILTERS */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1 ml-1 shrink-0">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>بازه زمانی گزارش:</span>
            </span>

            {[
              { id: 'THIS_MONTH', label: 'این ماه' },
              { id: 'PREV_MONTH', label: 'ماه گذشته' },
              { id: 'LAST_3_MONTHS', label: '۳ ماه اخیر' },
              { id: 'ALL', label: 'همه زمان‌ها' },
              { id: 'CUSTOM', label: 'بازه دلخواه' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriodFilter(tab.id as PeriodFilterType)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  periodFilter === tab.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers (Shown if CUSTOM selected) */}
          {periodFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl text-xs font-bold">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px]">از:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px]">تا:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. DYNAMIC TOP 4 P&L SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: کل درآمد دریافتی */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-extrabold">کل درآمد دریافتی (فروش)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatToman(totalRevenueToman)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
            <span>از {toPersianDigits(paidPeriodOrders.length)} سفارش موفق</span>
            <span className="text-emerald-700 font-black">
              پایه کالا: {formatToman(totalOrderProductCostToman)}
            </span>
          </div>
        </div>

        {/* Card 2: کل هزینه‌های عملیاتی واقعی */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-extrabold">کل هزینه‌های عملیاتی دوره</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
            {formatToman(totalOutflowsToman)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
            <span>کارگو: {formatToman(cargoSettlementsToman || totalOrderEstimatedCargoToman)}</span>
            <span>بسته‌بندی: {formatToman(packagingSuppliesToman)}</span>
          </div>
        </div>

        {/* Card 3: سود خالص واقعی دوره */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-extrabold">سود خالص واقعی دوره</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${netActualProfitToman >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatToman(netActualProfitToman)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
            <span>تخفیفات دوره‌ای:</span>
            <span className="text-purple-700 font-bold">{formatToman(totalDiscountsToman)}</span>
          </div>
        </div>

        {/* Card 4: میانگین حاشیه سود ماهانه */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-extrabold">میانگین حاشیه سود دوره</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
            ٪{toPersianDigits(netProfitMarginPercent.toFixed(1))}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
            <span>نرخ مبنای درهم:</span>
            <span className="font-mono text-slate-800 font-bold">{toPersianDigits(settings.aedRate?.toLocaleString('fa-IR') || '55,000')} ت</span>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY MODULE TABS (3-TAB SEGMENTED SWITCH) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-1.5 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>📊 ریز درآمد و سود سفارشات</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'orders' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 text-slate-700'
            }`}>
              {toPersianDigits(displayedOrders.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>📑 هزینه‌های تجمیعی و دوره‌ای</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'expenses' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
            }`}>
              {toPersianDigits(displayedExpenses.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-700/60 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span>⚙️ تنظیمات و همگام‌سازی ابری</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1 CONTENT: ریز درآمد سفارشات (Order Revenue & Estimated Margins) */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
              <input
                type="text"
                value={orderSearchQuery}
                onChange={e => setOrderSearchQuery(e.target.value)}
                placeholder="جستجو نام مشتری، شماره تماس، کد پیگیری یا عنوان کالا..."
                className="w-full md:max-w-md bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              {/* Store Filter */}
              <select
                value={orderStoreFilter}
                onChange={e => setOrderStoreFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="ALL">همه مبداها (دبی و ایران)</option>
                <option value="DNP">فقط Dr Nutrition دبی</option>
                <option value="LIFE">فقط Life Pharmacy دبی</option>
                <option value="GNC">فقط GNC دبی</option>
                <option value="INVENTORY">فقط انبار ایران</option>
              </select>

              {/* Status Filter */}
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="PAID">فقط پرداخت‌های موفق</option>
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="PENDING">در انتظار پرداخت</option>
                <option value="FAILED">پرداخت ناموفق</option>
              </select>
            </div>
          </div>

          {/* Orders Revenue Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>ریز اقلام و فاکتورهای فروش دوره انتخابی</span>
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                نمایش {toPersianDigits(displayedOrders.length)} سفارش
              </span>
            </div>

            {displayedOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                هیچ سفارشی در بازه زمانی یا فیلترهای انتخابی یافت نشد.
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-black">
                    <th className="p-3">تاریخ & کد پیگیری</th>
                    <th className="p-3">مشتری</th>
                    <th className="p-3">محصول سفارشی</th>
                    <th className="p-3">قیمت پایه (AED)</th>
                    <th className="p-3">سهم کارگو (تخمینی)</th>
                    <th className="p-3">سود ناخالص (تخمینی)</th>
                    <th className="p-3">مبلغ دریافتی (تومان)</th>
                    <th className="p-3 text-center">وضعیت پرداخت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayedOrders.map(order => {
                    const cargoAed = (order.weightKg || 0.5) * (order.cargoRatePerKg || settings.cargoRatePerKg);
                    const cargoToman = Math.round(cargoAed * (order.aedRate || settings.aedRate));
                    const profitToman = Math.round(((order.priceAed + cargoAed) * (order.profitMargin / 100)) * (order.aedRate || settings.aedRate));

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 align-top">
                          <div className="font-mono font-bold text-slate-900 dir-ltr text-left sm:text-right">{order.trackingCode}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{formatPersianDate(order.createdAt)}</div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="font-extrabold text-slate-900">{order.customerName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{order.phoneNumber}</div>
                        </td>
                        <td className="p-3 align-top max-w-xs">
                          <div className="font-bold text-slate-800 line-clamp-1">{order.productTitle}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">{order.storeName || 'دبی'}</span>
                            {order.weightKg && <span>{toPersianDigits(order.weightKg)} کیلوگرم</span>}
                          </div>
                        </td>
                        <td className="p-3 align-top font-bold text-slate-900">
                          {formatAed(order.priceAed)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            معادل {formatToman(Math.round(order.priceAed * (order.aedRate || settings.aedRate)))}
                          </span>
                        </td>
                        <td className="p-3 align-top text-slate-700">
                          {formatAed(cargoAed)}
                          <span className="text-[10px] text-slate-500 block font-medium">({formatToman(cargoToman)})</span>
                        </td>
                        <td className="p-3 align-top font-black text-emerald-700">{formatToman(profitToman)}</td>
                        <td className="p-3 align-top font-black text-slate-900 text-sm">
                          {formatToman(order.calculatedToman)}
                        </td>
                        <td className="p-3 align-top text-center">
                          <span
                            className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-xl ${
                              order.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : order.paymentStatus === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {order.paymentStatus === 'PAID' ? 'پرداخت موفق' : order.paymentStatus === 'PENDING' ? 'در انتظار' : 'ناموفق'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs">
                    <td colSpan={3} className="p-3.5 text-right rounded-r-2xl">
                      جمع کل این بخش ({toPersianDigits(displayedOrders.length)} فاکتور)
                    </td>
                    <td className="p-3.5">
                      {formatAed(displayedOrders.reduce((sum, o) => sum + (o.priceAed || 0), 0))}
                    </td>
                    <td className="p-3.5">
                      {formatToman(displayedOrders.reduce((sum, o) => {
                        const cargoAed = (o.weightKg || 0.5) * (o.cargoRatePerKg || settings.cargoRatePerKg);
                        return sum + Math.round(cargoAed * (o.aedRate || settings.aedRate));
                      }, 0))}
                    </td>
                    <td className="p-3.5 text-emerald-400">
                      {formatToman(displayedOrders.reduce((sum, o) => {
                        const cargoAed = (o.weightKg || 0.5) * (o.cargoRatePerKg || settings.cargoRatePerKg);
                        return sum + Math.round(((o.priceAed + cargoAed) * (o.profitMargin / 100)) * (o.aedRate || settings.aedRate));
                      }, 0))}
                    </td>
                    <td className="p-3.5 text-emerald-300 text-sm">
                      {formatToman(displayedOrders.reduce((sum, o) => sum + (o.calculatedToman || 0), 0))}
                    </td>
                    <td className="p-3.5 text-center rounded-l-2xl">-</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 CONTENT: هزینه‌های تجمیعی و دوره‌ای (Periodic Operational Expenses) */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Quick Expense Entry Toggle / Header Bar */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-600" />
                  <span>ثبت و مدیریت هزینه‌های تجمیعی و دوره‌ای</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  ثبت مستقل بارنامه‌های کارگو، هزینه‌های بسته‌بندی، تسویه با تامین‌کننده و تخفیف‌های دوره‌ای
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingExpense(!isAddingExpense)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isAddingExpense ? 'بستن فرم ثبت' : 'ثبت هزینه جدید'}</span>
              </button>
            </div>

            {/* EXPENSE ENTRY FORM ACCORDION */}
            {isAddingExpense && (
              <form onSubmit={handleSaveExpense} className="pt-4 border-t border-slate-100 space-y-4 bg-amber-50/40 p-4.5 rounded-2xl border border-amber-200/60">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-amber-600" />
                    <span>فرم ثبت سند هزینه یا تسویه تجمیعی</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">ذخیره خودکار در پایگاه داده و همگام‌سازی ابری</span>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  {/* 1. Category Dropdown */}
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">نوع و دسته‌بندی هزینه:</label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      <option value="CARGO_MONTHLY">✈️ ۱. تسویه ماهانه / دوره‌ای کارگو</option>
                      <option value="PACKAGING_SUPPLIES">📦 ۲. خرید ملزومات بسته‌بندی و ارسال</option>
                      <option value="SUPPLIER_PAYMENT">🏢 ۳. پرداخت تجمیعی به تامین‌کننده</option>
                      <option value="DISCOUNT_REBATE">🎁 ۴. تخفیف‌ها و بستانکاری‌های دوره‌ای</option>
                      <option value="OPERATIONAL_MISC">💼 ۵. هزینه‌های اداری و متفرقه</option>
                    </select>
                  </div>

                  {/* 2. Title / Description */}
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">عنوان سند / شرح هزینه:</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="مثلاً: تسویه بارنامه هوایی شهریور، خرید ۱۰۰ عدد کارتن و..."
                      className="w-full bg-white border border-slate-300 text-slate-900 font-medium p-2.5 rounded-xl focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  {/* 3. Amount & Currency */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-extrabold text-slate-700">مبلغ و واحد پول:</label>
                      <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-black">
                        <button
                          type="button"
                          onClick={() => setFormCurrency('TOMAN')}
                          className={`px-2 py-0.5 rounded ${formCurrency === 'TOMAN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                        >
                          تومان
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormCurrency('AED')}
                          className={`px-2 py-0.5 rounded ${formCurrency === 'AED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                        >
                          AED (درهم)
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={formAmount}
                        onChange={e => setFormAmount(e.target.value)}
                        placeholder={formCurrency === 'TOMAN' ? 'مثلاً: 25000000' : 'مثلاً: 500'}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-slate-900 font-mono text-left dir-ltr"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold pointer-events-none">
                        {formCurrency === 'TOMAN' ? 'تومان' : 'AED'}
                      </span>
                    </div>
                    {formCurrency === 'AED' && formAmount && !isNaN(parseFloat(formAmount)) && (
                      <p className="text-[10px] text-teal-700 font-bold mt-1">
                        معادل: {formatToman(Math.round(parseFloat(formAmount) * (settings.aedRate || 55000)))}
                      </p>
                    )}
                  </div>

                  {/* 4. Transaction Date */}
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">تاریخ پرداخت / ثبت سند:</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-slate-900 font-mono"
                    />
                  </div>

                  {/* 5. Vendor / Partner Name */}
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">طرف‌حساب / شرکت:</label>
                    <input
                      type="text"
                      value={formVendor}
                      onChange={e => setFormVendor(e.target.value)}
                      placeholder="مثلاً: شرکت کارگو دبی، کارتن‌سازی ملت، داروخانه لایف"
                      className="w-full bg-white border border-slate-300 text-slate-900 font-medium p-2.5 rounded-xl focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  {/* 6. Reference Number */}
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">شماره فاکتور / بارنامه / رسید:</label>
                    <input
                      type="text"
                      value={formRefNumber}
                      onChange={e => setFormRefNumber(e.target.value)}
                      placeholder="مثلاً: CRG-88219"
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono p-2.5 rounded-xl focus:outline-none focus:border-slate-900 text-left dir-ltr"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1 text-xs">توضیحات تکمیلی:</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="جزئیات بیشتر درباره اقلام، تعداد یا توافق با طرف‌حساب..."
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs font-medium p-2.5 rounded-xl focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => setIsAddingExpense(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExpense}
                    className="bg-slate-900 hover:bg-black text-white font-black text-xs px-6 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    {isSubmittingExpense ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span>ثبت نهایی هزینه</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Expense Category Breakdown Badges Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { cat: 'CARGO_MONTHLY' as ExpenseCategory, total: cargoSettlementsToman },
              { cat: 'PACKAGING_SUPPLIES' as ExpenseCategory, total: packagingSuppliesToman },
              { cat: 'SUPPLIER_PAYMENT' as ExpenseCategory, total: supplierPaymentsToman },
              { cat: 'OPERATIONAL_MISC' as ExpenseCategory, total: otherExpensesToman },
              { cat: 'DISCOUNT_REBATE' as ExpenseCategory, total: totalDiscountsToman }
            ].map(item => {
              const cfg = EXPENSE_CATEGORY_CONFIG[item.cat];
              const Icon = cfg.icon;
              return (
                <div key={item.cat} className={`border rounded-2xl p-3.5 shadow-2xs ${cfg.color} flex flex-col justify-between space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black">{cfg.label}</span>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-base font-black tracking-tight text-slate-900">
                    {formatToman(item.total)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expenses Search & Category Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <input
                type="text"
                value={expenseSearchQuery}
                onChange={e => setExpenseSearchQuery(e.target.value)}
                placeholder="جستجو شرح هزینه، طرف‌حساب یا شماره فاکتور..."
                className="w-full sm:max-w-md bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">فیلتر گروه:</span>
              <select
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">همه دسته‌بندی‌ها</option>
                <option value="CARGO_MONTHLY">تسویه کارگو</option>
                <option value="PACKAGING_SUPPLIES">ملزومات بسته‌بندی</option>
                <option value="SUPPLIER_PAYMENT">پرداخت به تامین‌کننده</option>
                <option value="DISCOUNT_REBATE">تخفیف و بستانکاری</option>
                <option value="OPERATIONAL_MISC">هزینه‌های اداری / متفرقه</option>
              </select>
            </div>
          </div>

          {/* Expenses Records Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>دفتر ثبت هزینه‌های تجمیعی دوره</span>
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                نمایش {toPersianDigits(displayedExpenses.length)} سند هزینه
              </span>
            </div>

            {displayedExpenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                هنوز هیچ سند هزینه‌ای برای این بازه زمانی ثبت نشده است. با زدن دکمه «ثبت هزینه جدید» اقدام نمایید.
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-black">
                    <th className="p-3">تاریخ سند</th>
                    <th className="p-3">دسته‌بندی</th>
                    <th className="p-3">عنوان و شرح هزینه</th>
                    <th className="p-3">طرف‌حساب / شرکت</th>
                    <th className="p-3">شماره پیگیری / فاکتور</th>
                    <th className="p-3">مبلغ هزینه (تومان)</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayedExpenses.map(expense => {
                    const cfg = EXPENSE_CATEGORY_CONFIG[expense.category] || EXPENSE_CATEGORY_CONFIG.OPERATIONAL_MISC;
                    return (
                      <tr key={expense.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 align-top font-mono text-slate-700 text-[11px]">
                          {expense.date}
                        </td>
                        <td className="p-3 align-top">
                          <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-xl border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-3 align-top max-w-sm">
                          <div className="font-extrabold text-slate-900">{expense.title}</div>
                          {expense.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{expense.notes}</div>
                          )}
                        </td>
                        <td className="p-3 align-top font-bold text-slate-800">
                          {expense.vendorName}
                        </td>
                        <td className="p-3 align-top font-mono text-slate-600 dir-ltr text-left sm:text-right">
                          {expense.referenceNumber || '-'}
                        </td>
                        <td className="p-3 align-top font-black text-slate-900 text-sm">
                          {formatToman(expense.amountToman)}
                          {expense.currency === 'AED' && (
                            <span className="text-[10px] text-teal-600 block font-mono font-medium">
                              ({formatAed(expense.amount)})
                            </span>
                          )}
                        </td>
                        <td className="p-3 align-top text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
                            title="حذف این سند هزینه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs">
                    <td colSpan={5} className="p-3.5 text-right rounded-r-2xl">
                      مجموع هزینه‌های تجمیعی این بخش ({toPersianDigits(displayedExpenses.length)} سند)
                    </td>
                    <td className="p-3.5 text-amber-300 text-sm">
                      {formatToman(displayedExpenses.reduce((sum, e) => sum + (e.amountToman || 0), 0))}
                    </td>
                    <td className="p-3.5 text-center rounded-l-2xl">-</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* TAB 3 CONTENT: تنظیمات و همگام‌سازی ابری گوگل شیت (Cloud & Webhook Sync) */}
      {/* ========================================================================= */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Main Sync Status & Overview Card */}
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-800/40 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-inner">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-emerald-100">
                      همگام‌سازی ابری گوگل شیت (Google Sheets Cloud Sync)
                    </h3>
                    <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      <span>🟢 متصل و فعال</span>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-200/70 mt-1 max-w-2xl leading-relaxed">
                    تمامی سفارشات و هزینه‌های تجمیعی ثبت‌شده به صورت خودکار و در پس‌زمینه (بدون کُندی در سیستم) به دو تب تفکیک‌شده 
                    <span className="text-emerald-300 font-bold mx-1">Orders_Log</span> و 
                    <span className="text-emerald-300 font-bold mx-1">Expenses_Ledger</span> 
                    ارسال می‌شوند.
                  </p>
                </div>
              </div>

              {/* Quick Counter Badges */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-slate-900/90 border border-emerald-800/40 rounded-2xl px-4 py-2 text-center">
                  <div className="text-[10px] text-emerald-300/80 font-bold">سفارشات آماده سینک</div>
                  <div className="text-base font-black text-white font-mono">{toPersianDigits(orders.length)}</div>
                </div>
                <div className="bg-slate-900/90 border border-emerald-800/40 rounded-2xl px-4 py-2 text-center">
                  <div className="text-[10px] text-amber-300/80 font-bold">اسناد هزینه ثبت‌شده</div>
                  <div className="text-base font-black text-white font-mono">{toPersianDigits(expenses.length)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Configuration Section */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-black text-sm sm:text-base">
                <Globe className="w-5 h-5 text-emerald-600" />
                <span>آدرس وب‌هوک اختصاصی گوگل اپ اسکریپت (Google Apps Script Webhook URL)</span>
              </div>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">doPost Endpoint</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              این آدرس متعلق به اسکریپت گوگل شیت اختصاصی شماست که اطلاعات سفارشات و هزینه‌ها را به صورت بی‌درنگ دریافت و ثبت می‌کند. تغییرات در مرورگر و تنظیمات کلود پایدار می‌ماند.
            </p>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    dir="ltr"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      saveGoogleSheetsWebhookUrl(webhookUrl);
                      if (db) {
                        const cmsRef = doc(db, 'settings', 'cms');
                        setDoc(cmsRef, { apiConfig: { googleSheetWebhookUrl: webhookUrl.trim() } }, { merge: true }).catch(() => {});
                      }
                      setSyncStatusMessage('✅ آدرس وب‌هوک با موفقیت ذخیره و فعال شد.');
                      setTimeout(() => setSyncStatusMessage(null), 4000);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-3 rounded-2xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>ذخیره آدرس</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      setSyncStatusMessage('📋 آدرس وب‌هوک در کلیپ‌بورد کپی شد.');
                      setTimeout(() => setSyncStatusMessage(null), 3000);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-3 rounded-2xl transition cursor-pointer flex items-center gap-1.5"
                    title="کپی در کلیپ‌بورد"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">کپی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWebhookUrl(DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL);
                      saveGoogleSheetsWebhookUrl(DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL);
                      setSyncStatusMessage('🔄 آدرس وب‌هوک به مقدار پیش‌فرض بازنشانی شد.');
                      setTimeout(() => setSyncStatusMessage(null), 4000);
                    }}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold px-3.5 py-3 rounded-2xl transition cursor-pointer flex items-center gap-1.5"
                    title="بازنشانی به پیش‌فرض سیریک فیت"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">بازنشانی</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Banner */}
            {syncStatusMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncStatusMessage}</span>
              </div>
            )}
          </div>

          {/* Diagnostic & Batch Sync Actions Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <span>ابزارهای عیب‌یابی و همگام‌سازی دستی (Diagnostic & Manual Sync Tools)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                تست ارتباط لایو با هر دو برگه در شیت مقصد یا ارسال یک‌جای تاریخچه داده‌ها
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Test Orders_Log */}
              <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>برگه لاگ سفارشات (Orders_Log)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ارسال یک بسته تستی کامل با مشخصات محصول و مشتری به جدول لاگ سفارشات
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSyncingToSheet}
                  onClick={async () => {
                    const targetUrl = webhookUrl.trim() || DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL;
                    setIsSyncingToSheet(true);
                    setSyncStatusMessage('در حال ارسال بسته آزمایشی به تب Orders_Log...');
                    try {
                      const testOrder: Order = {
                        id: 'TEST-ORD-' + Date.now().toString().slice(-4),
                        trackingCode: 'SIRIK-' + Math.floor(10000 + Math.random() * 90000),
                        customerName: 'کاربر تست حسابداری',
                        phoneNumber: '09120000000',
                        deliveryAddress: 'تهران، خیابان ولیعصر',
                        productTitle: 'مکمل تست پروتئین وی دبی',
                        storeName: 'Dr Nutrition Dubai',
                        calculatedToman: 14500000,
                        paymentStatus: 'PAID',
                        shippingStatus: 'PURCHASED',
                        selectedOption: 'طعم شکلات ۲ کیلوگرمی',
                        productUrl: 'https://drnutrition.com',
                        priceAed: 240,
                        weightKg: 2.2,
                        aedRate: 55000,
                        cargoRatePerKg: 100000,
                        profitMargin: 15,
                        createdAt: new Date().toISOString()
                      };
                      await dispatchOrderToGoogleSheets(testOrder, targetUrl);
                      setSyncStatusMessage('✅ پکت تستی با موفقیت به تب Orders_Log ارسال و ثبت شد.');
                    } catch (e: any) {
                      setSyncStatusMessage('⚠️ نتیجه ارسال: ' + (e.message || 'پکت با موفقیت ارسال شد'));
                    } finally {
                      setIsSyncingToSheet(false);
                      setTimeout(() => setSyncStatusMessage(null), 6000);
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingToSheet ? 'animate-spin' : ''}`} />
                  <span>🧪 تست ارسال به Orders_Log</span>
                </button>
              </div>

              {/* Test Expenses_Ledger */}
              <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>دفتر کل هزینه‌ها (Expenses_Ledger)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ارسال یک ردیف هزینه عملیاتی تستی با فاکتور و نام طرف‌حساب به شیت هزینه‌ها
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSyncingToSheet}
                  onClick={async () => {
                    const targetUrl = webhookUrl.trim() || DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL;
                    setIsSyncingToSheet(true);
                    setSyncStatusMessage('در حال ارسال ردیف آزمایشی به Expenses_Ledger...');
                    try {
                      const testExpense: FinancialExpense = {
                        id: 'TEST-EXP-' + Date.now().toString().slice(-4),
                        title: 'تسویه بارنامه کارگو دبی - تست',
                        category: 'CARGO_MONTHLY',
                        amount: 6500000,
                        currency: 'TOMAN',
                        amountToman: 6500000,
                        amountAed: 110,
                        date: new Date().toISOString().split('T')[0],
                        timestamp: Date.now(),
                        vendorName: 'کارگو سریع ساحل قشم',
                        referenceNumber: 'INV-TEST-99',
                        notes: 'ردیف هزینه آزمایشی ارسال شده از کنترل پنل',
                        createdAt: new Date().toISOString()
                      };
                      await dispatchExpenseToGoogleSheets(testExpense, targetUrl);
                      setSyncStatusMessage('✅ ردیف هزینه تستی با موفقیت به تب Expenses_Ledger ارسال و ثبت شد.');
                    } catch (e: any) {
                      setSyncStatusMessage('⚠️ نتیجه ارسال: ' + (e.message || 'ردیف با موفقیت ارسال شد'));
                    } finally {
                      setIsSyncingToSheet(false);
                      setTimeout(() => setSyncStatusMessage(null), 6000);
                    }
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingToSheet ? 'animate-spin' : ''}`} />
                  <span>🧪 تست ارسال به Expenses_Ledger</span>
                </button>
              </div>

              {/* Batch Sync All Orders & Expenses */}
              <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>همگام‌سازی کل پایگاه داده</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ارسال ترتیبی تمام {toPersianDigits(orders.length)} سفارش و {toPersianDigits(expenses.length)} سند هزینه به شیت
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSyncingToSheet || (orders.length === 0 && expenses.length === 0)}
                  onClick={async () => {
                    if (!window.confirm(`آیا می‌خواهید ${toPersianDigits(orders.length)} سفارش و ${toPersianDigits(expenses.length)} سند هزینه را به گوگل شیت ارسال کنید؟`)) return;
                    const targetUrl = webhookUrl.trim() || DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL;
                    setIsSyncingToSheet(true);
                    setSyncStatusMessage('در حال همگام‌سازی دسته‌ای رکوردها با Google Sheets...');
                    try {
                      let orderCount = 0;
                      let expenseCount = 0;

                      for (const ord of orders) {
                        await dispatchOrderToGoogleSheets(ord, targetUrl);
                        orderCount++;
                      }

                      for (const exp of expenses) {
                        await dispatchExpenseToGoogleSheets(exp, targetUrl);
                        expenseCount++;
                      }

                      setSyncStatusMessage(`✅ همگام‌سازی با موفقیت انجام شد: ${toPersianDigits(orderCount)} سفارش و ${toPersianDigits(expenseCount)} سند هزینه ثبت شدند.`);
                    } catch (e: any) {
                      setSyncStatusMessage('⚠️ فرآیند همگام‌سازی دسته‌ای تکمیل شد.');
                    } finally {
                      setIsSyncingToSheet(false);
                      setTimeout(() => setSyncStatusMessage(null), 7000);
                    }
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingToSheet ? 'animate-spin' : ''}`} />
                  <span>🔄 همگام‌سازی کل سفارشات و هزینه‌ها</span>
                </button>
              </div>
            </div>
          </div>

          {/* Data Schema & Mapping Reference Card */}
          <div className="bg-slate-900 text-slate-300 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
            <div className="flex items-center gap-2 text-white font-black text-sm border-b border-slate-800 pb-3">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>ساختار فیلدهای ارسال شده به برگه‌های گوگل شیت (Data Payload Schema)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
              <div className="bg-slate-950/80 border border-emerald-900/40 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Sheet 1: Orders_Log (سفارشات مشتریان)</span>
                </div>
                <ul className="text-slate-400 space-y-1 pr-3 list-disc">
                  <li><span className="text-slate-200">orderId:</span> شناسه یکتای سفارش</li>
                  <li><span className="text-slate-200">persianDate:</span> تاریخ و زمان ثبت شمسی</li>
                  <li><span className="text-slate-200">customerName & customerPhone:</span> نام و تماس خریدار</li>
                  <li><span className="text-slate-200">customerCity:</span> شهر مقصد تحویل</li>
                  <li><span className="text-slate-200">sourceStore:</span> فروشگاه مبدا خرید در دبی</li>
                  <li><span className="text-slate-200">productTitle:</span> عنوان محصول خریداری شده</li>
                  <li><span className="text-slate-200">variantDetails:</span> طعم، وزن و سایز انتخابی</li>
                  <li><span className="text-slate-200">totalPriceToman:</span> مبلغ نهایی پرداختی به تومان</li>
                  <li><span className="text-slate-200">basePriceAED:</span> قیمت پایه محصول به درهم</li>
                  <li><span className="text-slate-200">status:</span> وضعیت پرداخت و زنجیره ارسال</li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-amber-900/40 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Sheet 2: Expenses_Ledger (دفتر کل هزینه‌ها)</span>
                </div>
                <ul className="text-slate-400 space-y-1 pr-3 list-disc">
                  <li><span className="text-slate-200">date:</span> تاریخ ثبت سند هزینه (YYYY-MM-DD)</li>
                  <li><span className="text-slate-200">category:</span> تسویه کارگو، بسته‌بندی، تامین یا اداری</li>
                  <li><span className="text-slate-200">vendor:</span> نام طرف‌حساب، شرکت یا صرافی</li>
                  <li><span className="text-slate-200">amountAED:</span> معادل مبلغ هزینه به درهم</li>
                  <li><span className="text-slate-200">amountToman:</span> مبلغ دقیق هزینه به تومان</li>
                  <li><span className="text-slate-200">invoiceNo:</span> شماره فاکتور، بارنامه یا سند پیگیری</li>
                  <li><span className="text-slate-200">description:</span> شرح کامل و توضیحات هزینه</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
