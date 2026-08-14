import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Save,
  RefreshCw,
  Search,
  Check,
  X,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Send,
  Eye,
  Filter
} from 'lucide-react';
import { db, isFirestoreGrpcNoise } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { formatPersianDate, toPersianDigits } from '../utils/formatters';

export interface FAQAdminItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  published: boolean;
  order?: number;
  createdAt: number;
}

export interface UserInquiryItem {
  id: string;
  question: string;
  answer?: string;
  contact?: string;
  submittedBy?: string;
  status: 'PENDING' | 'REPLIED' | 'ARCHIVED';
  publishedAsFaq?: boolean;
  category?: string;
  createdAt: number;
  repliedAt?: number;
}

interface AdminFAQManagerProps {
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

const DEFAULT_FAQS: FAQAdminItem[] = [
  {
    id: 'def-1',
    question: 'تفاوت موجودی انبار ایران و سفارش مستقیم از دبی چیست؟',
    answer: 'کالاهای موجود در «انبار ایران» به صورت قطعی در تهران موجود و پلمپ هستند و ظرف ۲۴ الی ۴۸ ساعت کاری با پیک اختصاصی یا پست پیشتاز تحویل داده می‌شوند. اما سفارش‌های دبی، به درخواست شما به صورت اختصاصی از نمایندگی‌های معتبر امارات (Dr Nutrition، GNC، Life Pharmacy) خریداری و از طریق خط کارگو هوایی/دریایی به ایران منتقل شده و طی ۷ الی ۱۴ روز کاری درب منزل تحویل داده می‌شوند.',
    category: 'shipping',
    published: true,
    order: 1,
    createdAt: 1700000000000
  },
  {
    id: 'def-2',
    question: 'هزینه ارسال و کارگو سفارش‌های دبی چگونه محاسبه می‌شود؟',
    answer: 'قیمت تمام شده شامل سه بخش است: ۱. قیمت خرید کالا در دبی به درهم ضربدر نرخ روز درهم، ۲. هزینه کارگو بین‌المللی بر اساس وزن ناخالص کالا (نرخ مصوب هر کیلوگرم)، ۳. کارمزد خدمات خرید و ترخیص. تمامی این موارد به صورت کاملاً شفاف در فاکتور نهایی و ماشین‌حساب قیمت به شما نمایش داده می‌شود.',
    category: 'pricing',
    published: true,
    order: 2,
    createdAt: 1700000000001
  },
  {
    id: 'def-3',
    question: 'چگونه از اصالت ۱۰۰٪ مکمل‌ها و کالاها مطمئن شوم؟',
    answer: 'سیریک‌فیت تمامی کالاها را مستقیماً از استورهای فیزیکی و آنلاین نمایندگی‌های رسمی و دارای مجوز بهداشت امارات خریداری می‌کند. تمامی محصولات با بسته‌بندی اورجینال، هولوگرام کارخانه، تاریخ انقضای معتبر و فاکتور رسمی خرید دبی عرضه می‌شوند.',
    category: 'authenticity',
    published: true,
    order: 3,
    createdAt: 1700000000002
  },
  {
    id: 'def-4',
    question: 'روش‌های پرداخت و ثبت سفارش به چه صورت است؟',
    answer: 'شما می‌توانید هزینه سفارش خود را به صورت آنلاین از طریق درگاه‌های معتبر شاپرک یا به صورت انتقال مستقیم کارت‌به‌کارت واریز فرمایید. پس از پرداخت، سفارش شما وارد مرحله خرید در دبی می‌شود و کد رهگیری اختصاصی صادر می‌گردد.',
    category: 'payment',
    published: true,
    order: 4,
    createdAt: 1700000000003
  }
];

export const AdminFAQManager: React.FC<AdminFAQManagerProps> = ({ showToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'faqs' | 'inquiries'>('faqs');

  // FAQ List State
  const [faqs, setFaqs] = useState<FAQAdminItem[]>([]);
  const [isLoadingFaqs, setIsLoadingFaqs] = useState<boolean>(true);
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>('ALL');

  // Editing / Creating FAQ Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingFaq, setEditingFaq] = useState<Partial<FAQAdminItem> | null>(null);
  const [isSavingFaq, setIsSavingFaq] = useState<boolean>(false);

  // Inquiries State
  const [inquiries, setInquiries] = useState<UserInquiryItem[]>([]);
  const [isLoadingInquiries, setIsLoadingInquiries] = useState<boolean>(true);
  const [inquirySearchQuery, setInquirySearchQuery] = useState<string>('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>('ALL');

  // Reply Inquiry Modal
  const [replyingInquiry, setReplyingInquiry] = useState<UserInquiryItem | null>(null);
  const [replyAnswerText, setReplyAnswerText] = useState<string>('');
  const [publishAsFaqCheck, setPublishAsFaqCheck] = useState<boolean>(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // 🟢 Realtime sync for FAQs
  useEffect(() => {
    setIsLoadingFaqs(true);
    let unsub: (() => void) | null = null;
    try {
      if (db) {
        const q = query(collection(db, 'faqs'));
        unsub = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const list: FAQAdminItem[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              list.push({
                id: docSnap.id,
                question: data.question || '',
                answer: data.answer || '',
                category: data.category || 'general',
                published: data.published !== false,
                order: data.order ?? 999,
                createdAt: data.createdAt || Date.now()
              });
            });
            list.sort((a, b) => (a.order || 999) - (b.order || 999));
            setFaqs(list);
          } else {
            // Seed defaults if empty
            seedInitialFaqs();
          }
          setIsLoadingFaqs(false);
        }, (err) => {
          if (!isFirestoreGrpcNoise(err)) console.warn('Firestore FAQs snapshot error:', err);
          setFaqs(DEFAULT_FAQS);
          setIsLoadingFaqs(false);
        });
      } else {
        setFaqs(DEFAULT_FAQS);
        setIsLoadingFaqs(false);
      }
    } catch (_err) {
      setFaqs(DEFAULT_FAQS);
      setIsLoadingFaqs(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 🟢 Realtime sync for User Inquiries
  useEffect(() => {
    setIsLoadingInquiries(true);
    let unsub: (() => void) | null = null;
    try {
      if (db) {
        const q = query(collection(db, 'user_inquiries'));
        unsub = onSnapshot(q, (snapshot) => {
          const list: UserInquiryItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              question: data.question || '',
              answer: data.answer || '',
              contact: data.contact || '',
              submittedBy: data.submittedBy || 'کاربر مهمان',
              status: data.status || (data.answer ? 'REPLIED' : 'PENDING'),
              publishedAsFaq: Boolean(data.publishedAsFaq),
              category: data.category || 'general',
              createdAt: data.createdAt || Date.now(),
              repliedAt: data.repliedAt
            });
          });
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setInquiries(list);
          setIsLoadingInquiries(false);
        }, (err) => {
          if (!isFirestoreGrpcNoise(err)) console.warn('Firestore inquiries snapshot error:', err);
          setIsLoadingInquiries(false);
        });
      } else {
        setIsLoadingInquiries(false);
      }
    } catch (_err) {
      setIsLoadingInquiries(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const seedInitialFaqs = async () => {
    if (!db) {
      setFaqs(DEFAULT_FAQS);
      return;
    }
    try {
      for (const item of DEFAULT_FAQS) {
        await setDoc(doc(db, 'faqs', item.id), item, { merge: true });
      }
      setFaqs(DEFAULT_FAQS);
    } catch (e) {
      setFaqs(DEFAULT_FAQS);
    }
  };

  // Create / Edit FAQ Handler
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq?.question?.trim() || !editingFaq?.answer?.trim()) {
      if (showToast) showToast('لطفاً عنوان پرسش و متن پاسخ را وارد نمایید.', 'error');
      return;
    }

    setIsSavingFaq(true);
    try {
      const id = editingFaq.id || 'faq-' + Date.now();
      const payload: FAQAdminItem = {
        id,
        question: editingFaq.question.trim(),
        answer: editingFaq.answer.trim(),
        category: editingFaq.category || 'general',
        published: editingFaq.published !== false,
        order: Number(editingFaq.order) || (faqs.length + 1),
        createdAt: editingFaq.createdAt || Date.now()
      };

      if (db) {
        await setDoc(doc(db, 'faqs', id), payload, { merge: true });
      }

      setFaqs((prev) => {
        const idx = prev.findIndex((f) => f.id === id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = payload;
          return updated;
        }
        return [...prev, payload];
      });

      setIsEditModalOpen(false);
      setEditingFaq(null);
      if (showToast) showToast('سوال متداول با موفقیت ذخیره گردید.', 'success');
    } catch (err: any) {
      console.error('Error saving FAQ:', err);
      if (showToast) showToast('خطا در ذخیره‌سازی سوال: ' + (err?.message || ''), 'error');
    } finally {
      setIsSavingFaq(false);
    }
  };

  // Delete FAQ Handler
  const handleDeleteFaq = async (id: string) => {
    if (!window.confirm('آیا از حذف این پرسش و پاسخ متداول اطمینان دارید؟')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'faqs', id));
      }
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      if (showToast) showToast('سوال متداول حذف شد.', 'success');
    } catch (err: any) {
      if (showToast) showToast('خطا در حذف سوال', 'error');
    }
  };

  // Toggle Published Status
  const handleTogglePublishFaq = async (faq: FAQAdminItem) => {
    try {
      const newStatus = !faq.published;
      if (db) {
        await updateDoc(doc(db, 'faqs', faq.id), { published: newStatus });
      }
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, published: newStatus } : f))
      );
      if (showToast) {
        showToast(newStatus ? 'سوال متداول منتشر شد' : 'سوال از حالت انتشار خارج شد', 'success');
      }
    } catch (err: any) {
      if (showToast) showToast('خطا در تغییر وضعیت انتشار', 'error');
    }
  };

  // Reply Inquiry Handler
  const handleSaveInquiryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingInquiry) return;
    if (!replyAnswerText.trim()) {
      if (showToast) showToast('لطفاً متن پاسخ را وارد نمایید.', 'error');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const now = Date.now();
      const updatedInquiry: Partial<UserInquiryItem> = {
        answer: replyAnswerText.trim(),
        status: 'REPLIED',
        publishedAsFaq: publishAsFaqCheck,
        repliedAt: now
      };

      if (db) {
        await updateDoc(doc(db, 'user_inquiries', replyingInquiry.id), updatedInquiry);
      }

      // If "Publish as FAQ" is checked, create an entry in faqs collection as well
      if (publishAsFaqCheck) {
        const newFaqId = 'faq-inq-' + replyingInquiry.id;
        const newFaqPayload: FAQAdminItem = {
          id: newFaqId,
          question: replyingInquiry.question,
          answer: replyAnswerText.trim(),
          category: replyingInquiry.category || 'general',
          published: true,
          order: faqs.length + 1,
          createdAt: now
        };
        if (db) {
          await setDoc(doc(db, 'faqs', newFaqId), newFaqPayload, { merge: true });
        }
      }

      setInquiries((prev) =>
        prev.map((inq) =>
          inq.id === replyingInquiry.id
            ? { ...inq, ...updatedInquiry }
            : inq
        )
      );

      setReplyingInquiry(null);
      setReplyAnswerText('');
      setPublishAsFaqCheck(false);
      if (showToast) showToast('پاسخ با موفقیت ثبت شد.', 'success');
    } catch (err: any) {
      console.error('Error replying to inquiry:', err);
      if (showToast) showToast('خطا در ثبت پاسخ', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Delete Inquiry
  const handleDeleteInquiry = async (id: string) => {
    if (!window.confirm('آیا از حذف این پرسش دریافتی اطمینان دارید؟')) return;
    try {
      if (db) {
        await deleteDoc(doc(db, 'user_inquiries', id));
      }
      setInquiries((prev) => prev.filter((i) => i.id !== id));
      if (showToast) showToast('پرسش کاربر حذف شد.', 'success');
    } catch (err: any) {
      if (showToast) showToast('خطا در حذف پرسش', 'error');
    }
  };

  // Filtered FAQs
  const filteredFaqs = faqs.filter((item) => {
    const matchesSearch =
      faqSearchQuery.trim() === '' ||
      item.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(faqSearchQuery.toLowerCase());
    const matchesCat =
      faqCategoryFilter === 'ALL' || item.category === faqCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Filtered Inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    const matchesSearch =
      inquirySearchQuery.trim() === '' ||
      inq.question.toLowerCase().includes(inquirySearchQuery.toLowerCase()) ||
      (inq.contact && inq.contact.toLowerCase().includes(inquirySearchQuery.toLowerCase())) ||
      (inq.answer && inq.answer.toLowerCase().includes(inquirySearchQuery.toLowerCase()));
    const matchesStatus =
      inquiryStatusFilter === 'ALL' || inq.status === inquiryStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingInquiriesCount = inquiries.filter((i) => i.status === 'PENDING' || !i.answer).length;

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] dir-rtl text-slate-900">
      {/* 🟢 TOP TABBED NAVIGATION: FAQs vs User Inquiries */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('faqs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition cursor-pointer ${
              activeSubTab === 'faqs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>مدیریت و ویرایش سوالات متداول</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeSubTab === 'faqs'
                  ? 'bg-slate-800 text-emerald-300'
                  : 'bg-slate-200 text-slate-800'
              }`}
            >
              {toPersianDigits(faqs.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('inquiries')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition cursor-pointer ${
              activeSubTab === 'inquiries'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span>پرسش‌های دریافتی کاربران</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeSubTab === 'inquiries'
                  ? 'bg-slate-800 text-amber-300'
                  : 'bg-slate-200 text-slate-800'
              }`}
            >
              {toPersianDigits(inquiries.length)}
            </span>
            {pendingInquiriesCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                {toPersianDigits(pendingInquiriesCount)} جدید
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'faqs' && (
          <button
            type="button"
            onClick={() => {
              setEditingFaq({
                question: '',
                answer: '',
                category: 'shipping',
                published: true,
                order: faqs.length + 1
              });
              setIsEditModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن سوال متداول جدید</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: FAQ MANAGEMENT (faqs collection) */}
      {/* ========================================================================= */}
      {activeSubTab === 'faqs' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={faqSearchQuery}
                onChange={(e) => setFaqSearchQuery(e.target.value)}
                placeholder="جستجو در متن سوالات و پاسخ‌ها..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl pr-9 focus:outline-none focus:border-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">دسته‌بندی:</span>
              <select
                value={faqCategoryFilter}
                onChange={(e) => setFaqCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="ALL">همه دسته‌ها</option>
                <option value="shipping">ارسال و تحویل (انبار ایران / دبی)</option>
                <option value="pricing">محاسبه قیمت و کارگو</option>
                <option value="authenticity">اصالت و ضمانت کالا</option>
                <option value="payment">روش‌های پرداخت و سفارش</option>
                <option value="general">عمومی و راهنمای خرید</option>
              </select>
            </div>
          </div>

          {/* FAQ Items Grid/List */}
          {isLoadingFaqs ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">در حال بارگذاری سوالات متداول...</p>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-extrabold text-slate-800">هیچ سوالی یافت نشد</h4>
              <p className="text-xs text-slate-500">
                {faqSearchQuery ? 'با این عبارت موردی یافت نشد.' : 'هنوز سوال متداولی تعریف نشده است.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-3 hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        {toPersianDigits(index + 1)}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                          {faq.question}
                        </h4>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {faq.category === 'shipping' && '🚚 ارسال و تحویل'}
                          {faq.category === 'pricing' && '💰 قیمت‌گذاری و کارگو'}
                          {faq.category === 'authenticity' && '🛡️ اصالت کالا'}
                          {faq.category === 'payment' && '💳 پرداخت'}
                          {(!faq.category || faq.category === 'general') && '❓ عمومی'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePublishFaq(faq)}
                        className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                          faq.published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title={faq.published ? 'در حال حاضر در سایت نمایش داده می‌شود' : 'مخفی شده'}
                      >
                        {faq.published ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>منتشر شده</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>پیش‌نویس / مخفی</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingFaq(faq);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                        title="ویرایش سوال"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                        title="حذف سوال"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                    {faq.answer}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: USER INQUIRIES (user_inquiries collection) */}
      {/* ========================================================================= */}
      {activeSubTab === 'inquiries' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={inquirySearchQuery}
                onChange={(e) => setInquirySearchQuery(e.target.value)}
                placeholder="جستجو در پرسش‌ها، شماره تماس یا پاسخ..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl pr-9 focus:outline-none focus:border-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">وضعیت:</span>
              <select
                value={inquiryStatusFilter}
                onChange={(e) => setInquiryStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="PENDING">⏳ در انتظار پاسخ</option>
                <option value="REPLIED">✅ پاسخ داده شده</option>
              </select>
            </div>
          </div>

          {/* Inquiries List */}
          {isLoadingInquiries ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">در حال دریافت پرسش‌های کاربران...</p>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-extrabold text-slate-800">هیچ پرسش کاربری یافت نشد</h4>
              <p className="text-xs text-slate-500">
                {inquirySearchQuery ? 'با این عبارت موردی یافت نشد.' : 'پرسش جدیدی از سمت کاربران ثبت نشده است.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredInquiries.map((inq) => {
                const isReplied = Boolean(inq.answer && inq.answer.trim().length > 0);
                return (
                  <div
                    key={inq.id}
                    className={`bg-white border rounded-2xl p-4.5 shadow-2xs space-y-3 transition ${
                      !isReplied ? 'border-amber-300/80 bg-amber-50/20' : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            !isReplied
                              ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {!isReplied ? '⏳ در انتظار پاسخ' : '✅ پاسخ داده شده'}
                        </span>
                        <span className="text-xs font-extrabold text-slate-800">
                          {inq.submittedBy || 'کاربر وب‌سایت'}
                        </span>
                        {inq.contact && (
                          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md dir-ltr">
                            {inq.contact}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatPersianDate(inq.createdAt)}</span>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold text-slate-500 block">سوال کاربر:</span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                        {inq.question}
                      </p>
                    </div>

                    {/* Answer (if replied) */}
                    {isReplied && (
                      <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>پاسخ ثبت شده توسط پشتیبانی:</span>
                          </span>
                          {inq.publishedAsFaq && (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              منتشر شده در سوالات متداول عمومی
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {inq.answer}
                        </p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {inq.contact && (
                          <a
                            href={`tel:${inq.contact.replace(/[^0-9+]/g, '')}`}
                            className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1.5"
                          >
                            <Phone className="w-3 h-3" />
                            <span>تماس با کاربر</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingInquiry(inq);
                            setReplyAnswerText(inq.answer || '');
                            setPublishAsFaqCheck(Boolean(inq.publishedAsFaq));
                          }}
                          className="bg-slate-900 hover:bg-black text-white text-xs font-black px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isReplied ? 'ویرایش پاسخ' : 'پاسخ به کاربر'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteInquiry(inq.id)}
                          className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                          title="حذف پرسش"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT FAQ ITEM */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                <span>{editingFaq?.id ? 'ویرایش سوال متداول' : 'افزودن سوال متداول جدید'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingFaq(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">
                  متن پرسش / سوال:
                </label>
                <input
                  type="text"
                  value={editingFaq?.question || ''}
                  onChange={(e) =>
                    setEditingFaq((prev) => ({ ...prev, question: e.target.value }))
                  }
                  placeholder="مثال: هزینه ارسال سفارش‌های دبی چقدر است؟"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">
                  متن کامل پاسخ:
                </label>
                <textarea
                  rows={5}
                  value={editingFaq?.answer || ''}
                  onChange={(e) =>
                    setEditingFaq((prev) => ({ ...prev, answer: e.target.value }))
                  }
                  placeholder="توضیحات کامل و شفاف درباره نحوه انجام این کار..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 text-slate-900 text-xs font-medium p-3.5 rounded-xl focus:outline-none leading-relaxed resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">
                    دسته‌بندی موضوعی:
                  </label>
                  <select
                    value={editingFaq?.category || 'shipping'}
                    onChange={(e) =>
                      setEditingFaq((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="shipping">🚚 ارسال و تحویل (انبار ایران / دبی)</option>
                    <option value="pricing">💰 قیمت‌گذاری و کارگو</option>
                    <option value="authenticity">🛡️ اصالت و ضمانت کالا</option>
                    <option value="payment">💳 روش‌های پرداخت و سفارش</option>
                    <option value="general">❓ عمومی و راهنمای خرید</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">
                    ترتیب نمایش (اولویت):
                  </label>
                  <input
                    type="number"
                    value={editingFaq?.order ?? 1}
                    onChange={(e) =>
                      setEditingFaq((prev) => ({ ...prev, order: Number(e.target.value) }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingFaq?.published !== false}
                    onChange={(e) =>
                      setEditingFaq((prev) => ({ ...prev, published: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-xs font-bold text-slate-800">
                  انتشار فوری در صفحه سوالات متداول سایت
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingFaq(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingFaq}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isSavingFaq ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال ذخیره...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>ذخیره سوال متداول</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REPLY TO USER INQUIRY */}
      {/* ========================================================================= */}
      {replyingInquiry && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Send className="w-4.5 h-4.5 text-amber-500" />
                <span>پاسخ به پرسش کاربر</span>
              </h3>
              <button
                type="button"
                onClick={() => setReplyingInquiry(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInquiryReply} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <span>نام / شناسه: {replyingInquiry.submittedBy || 'کاربر مهمان'}</span>
                  {replyingInquiry.contact && <span>شماره تماس: {replyingInquiry.contact}</span>}
                </div>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  «{replyingInquiry.question}»
                </p>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">
                  متن پاسخ شما:
                </label>
                <textarea
                  rows={4}
                  value={replyAnswerText}
                  onChange={(e) => setReplyAnswerText(e.target.value)}
                  placeholder="پاسخ کامل به پرسش کاربر..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 text-slate-900 text-xs font-medium p-3.5 rounded-xl focus:outline-none leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishAsFaqCheck}
                    onChange={(e) => setPublishAsFaqCheck(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-xs font-bold text-slate-800">
                  همزمان این پرسش و پاسخ به لیست سوالات متداول عمومی نیز افزوده شود
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplyingInquiry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReply}
                  className="bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingReply ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال ثبت...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>ثبت و ذخیره پاسخ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminFAQManager;
