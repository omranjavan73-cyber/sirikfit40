import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
  Search,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  MessageCircleQuestion,
  RefreshCw,
  Package,
  CreditCard,
  Headphones
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  published: boolean;
  submittedBy?: string;
  contact?: string;
  createdAt: number;
}

interface FAQViewProps {
  onBack: () => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    id: 'def-1',
    question: 'تفاوت موجودی انبار ایران و سفارش مستقیم از دبی چیست؟',
    answer: 'کالاهای موجود در «انبار ایران» به صورت قطعی در تهران موجود و پلمپ هستند و ظرف ۲۴ الی ۴۸ ساعت کاری با پیک اختصاصی یا پست پیشتاز تحویل داده می‌شوند. اما سفارش‌های دبی، به درخواست شما به صورت اختصاصی از نمایندگی‌های معتبر امارات (Dr Nutrition، GNC، Life Pharmacy) خریداری و از طریق خط کارگو هوایی/دریایی به ایران منتقل شده و طی ۷ الی ۱۴ روز کاری درب منزل تحویل داده می‌شوند.',
    category: 'shipping',
    published: true,
    createdAt: 1700000000000
  },
  {
    id: 'def-2',
    question: 'هزینه ارسال و کارگو سفارش‌های دبی چگونه محاسبه می‌شود؟',
    answer: 'قیمت تمام شده شامل سه بخش است: ۱. قیمت خرید کالا در دبی به درهم ضربدر نرخ روز درهم، ۲. هزینه کارگو بین‌المللی بر اساس وزن ناخالص کالا (نرخ مصوب هر کیلوگرم)، ۳. کارمزد خدمات خرید و ترخیص. تمامی این موارد به صورت کاملاً شفاف در فاکتور نهایی و ماشین‌حساب قیمت به شما نمایش داده می‌شود.',
    category: 'pricing',
    published: true,
    createdAt: 1700000000001
  },
  {
    id: 'def-3',
    question: 'چگونه از اصالت ۱۰۰٪ مکمل‌ها و کالاها مطمئن شوم؟',
    answer: 'سیریک‌فیت تمامی کالاها را مستقیماً از استورهای فیزیکی و آنلاین نمایندگی‌های رسمی و دارای مجوز بهداشت امارات خریداری می‌کند. تمامی محصولات با بسته‌بندی اورجینال، هولوگرام کارخانه، تاریخ انقضای معتبر و فاکتور رسمی خرید دبی عرضه می‌شوند.',
    category: 'authenticity',
    published: true,
    createdAt: 1700000000002
  },
  {
    id: 'def-4',
    question: 'روند پرداخت و تسویه‌حساب سفارش چگونه است؟',
    answer: 'شما می‌توانید از طریق درگاه پرداخت آنلاین شاپرک، یا انتقال مستقیم کارت به کارت بانکی نسبت به تسویه سفارش اقدام کنید. پس از ثبت و پرداخت، کد پیگیری اختصاصی صادر شده و کارشناسان بلافاصله خرید را در دبی نهایی می‌کنند.',
    category: 'payment',
    published: true,
    createdAt: 1700000000003
  },
  {
    id: 'def-5',
    question: 'شرایط مرجوعی یا جبران خسارت در صورت آسیب‌دیدگی چیست؟',
    answer: 'تمامی بسته‌ها بیمه حمل کارگو دارند. در صورت هرگونه آسیب‌دیدگی فیزیکی به پلمپ کالا حین انتقال، یا عدم تطابق کالا با لینک ثبت شده، با اعلام به پشتیبانی ظرف ۲۴ ساعت پس از تحویل، وجه شما به طور کامل استرداد یا کالای سالم مجدداً ارسال خواهد شد.',
    category: 'guarantee',
    published: true,
    createdAt: 1700000000004
  }
];

export const FAQView: React.FC<FAQViewProps> = ({ onBack, showToast }) => {
  const [faqs, setFaqs] = useState<FAQItem[]>(DEFAULT_FAQS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>('def-1');

  // Submit Inquiry Form State
  const [submitName, setSubmitName] = useState('');
  const [submitContact, setSubmitContact] = useState('');
  const [submitQuestion, setSubmitQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('sirikfit_faqs_list');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFaqs(parsed);
            }
          } catch (_e) {}
        }
      }

      if (db) {
        const q = query(collection(db, 'faqs'), where('published', '==', true));
        const snap = await getDocs(q);
        const list: FAQItem[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            question: data.question || '',
            answer: data.answer || '',
            category: data.category || 'general',
            published: data.published ?? true,
            submittedBy: data.submittedBy,
            contact: data.contact,
            createdAt: data.createdAt || Date.now()
          });
        });

        if (list.length > 0) {
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setFaqs(list);
          try {
            localStorage.setItem('sirikfit_faqs_list', JSON.stringify(list));
          } catch (_e) {}
        }
      }
    } catch (err) {
      console.warn('Silent note fetching FAQs from Firestore:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitQuestion.trim()) {
      if (showToast) showToast('لطفاً متن سوال خود را وارد کنید.', 'error');
      return;
    }

    setIsSubmitting(true);
    const newInquiry = {
      question: submitQuestion.trim(),
      answer: '',
      submittedBy: submitName.trim() || 'کاربر مهمان',
      contact: submitContact.trim() || 'ثبت نشده',
      status: 'PENDING',
      published: false,
      createdAt: Date.now(),
      persianDate: new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date())
    };

    try {
      if (db) {
        // Save to user_inquiries collection
        await addDoc(collection(db, 'user_inquiries'), newInquiry);
      }
      
      // Also cache locally for offline/resilience
      try {
        const localInquiries = JSON.parse(localStorage.getItem('sirikfit_user_inquiries') || '[]');
        localInquiries.unshift({ id: 'inq-' + Date.now(), ...newInquiry });
        localStorage.setItem('sirikfit_user_inquiries', JSON.stringify(localInquiries));
      } catch (_e) {}

      setSubmitSuccess(true);
      setSubmitQuestion('');
      setSubmitName('');
      setSubmitContact('');
      if (showToast) showToast('پرسش شما با موفقیت ثبت گردید و به زودی بررسی خواهد شد.', 'success');
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 7000);
    } catch (err) {
      console.error('Error submitting inquiry:', err);
      if (showToast) showToast('خطا در ثبت پرسش. لطفاً اتصال اینترنت خود را بررسی کنید.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    if (!faq) return false;
    if (selectedCategory !== 'ALL' && faq.category && faq.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        (faq.question || '').toLowerCase().includes(q) ||
        (faq.answer || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto font-['Vazirmatn',sans-serif] animate-in fade-in duration-200">
      {/* Top Header Card with Back Button */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
              title="بازگشت به صفحه اصلی"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
                <span>سوالات متداول و راهنمای خرید (FAQ)</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                پاسخ به سوالات پرتکرار پیرامون اصالت مکمل‌ها، نحوه سفارش از دبی، ترخیص و زمان تحویل
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchFaqs}
            className="self-end sm:self-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="mt-4 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در متن سوالات و پاسخ‌ها (مثال: اصالت، کارگو، انبار ایران، تحویل)..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900 text-xs sm:text-sm font-medium px-4 py-3.5 rounded-2xl focus:outline-none transition pr-11 shadow-2xs"
          />
          <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-200/70 hover:bg-slate-200 px-2 py-1 rounded-lg cursor-pointer"
            >
              پاک کردن
            </button>
          )}
        </div>
      </div>

      {/* Quick Category / Feature Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <span className="font-extrabold text-xs text-slate-900 block">ضمانت اصالت ۱۰۰٪</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">خرید مستقیم از امارات</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <Truck className="w-4.5 h-4.5" />
          </div>
          <span className="font-extrabold text-xs text-slate-900 block">ارسال سریع کارگو</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">۷ تا ۱۴ روز کاری</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <Package className="w-4.5 h-4.5" />
          </div>
          <span className="font-extrabold text-xs text-slate-900 block">موجودی انبار ایران</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">تحویل ۲۴ تا ۴۸ ساعته</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
            <CreditCard className="w-4.5 h-4.5" />
          </div>
          <span className="font-extrabold text-xs text-slate-900 block">تسویه امن ریالی</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">درگاه شاپرک و کارت‌به‌کارت</span>
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <span>پرسش‌های متداول کاربران</span>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filteredFaqs.length} مورد
            </span>
          </h2>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-medium space-y-2">
            <p>سوالی مطابق با عبارت جستجوی شما یافت نشد.</p>
            <p className="text-[11px] text-slate-400">می‌توانید سوال اختصاصی خود را در فرم انتهای صفحه ثبت فرمایید.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => {
              const isExpanded = expandedId === faq.id;
              return (
                <div
                  key={faq.id || index}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-slate-900 bg-slate-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(faq.id)}
                    className="w-full p-4 sm:p-4.5 flex items-start justify-between gap-3 text-right cursor-pointer"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                        isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 leading-relaxed">
                        {faq.question}
                      </span>
                    </div>

                    <div className="shrink-0 mt-0.5">
                      {isExpanded ? (
                        <ChevronUp className="w-4.5 h-4.5 text-slate-900" />
                      ) : (
                        <ChevronDown className="w-4.5 h-4.5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-700 leading-loose border-t border-slate-200/80 font-medium whitespace-pre-line">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Inquiry Form - Submits to user_inquiries */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageCircleQuestion className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              سوال دیگری دارید؟ از کارشناسان ما بپرسید
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              اگر پاسخ سوال خود را نیافتید، پرسش خود را ثبت کنید. کارشناسان سیریک‌فیت آن را بررسی و پاسخ خواهند داد.
            </p>
          </div>
        </div>

        {submitSuccess ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 text-xs sm:text-sm font-bold animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>با سپاس! پرسش شما با موفقیت در سیستم ثبت گردید و پس از بررسی کارشناسان در بخش سوالات متداول منتشر خواهد شد.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmitInquiry} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  نام و نام خانوادگی (یا نام مستعار):
                </label>
                <input
                  type="text"
                  placeholder="مثال: رضا محمدی"
                  value={submitName}
                  onChange={(e) => setSubmitName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  شماره موبایل یا آیدی تلگرام (جهت دریافت پاسخ):
                </label>
                <input
                  type="text"
                  placeholder="09120000000 یا @myhandle"
                  value={submitContact}
                  onChange={(e) => setSubmitContact(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition dir-ltr text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1">
                متن پرسش یا راهنمایی مورد نیاز:
              </label>
              <textarea
                rows={3}
                required
                placeholder="سوال خود درباره نحوه ثبت سفارش، محاسبه وزن، تاریخ انقضا یا تحویل را بنویسید..."
                value={submitQuestion}
                onChange={(e) => setSubmitQuestion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-medium p-3.5 rounded-xl focus:outline-none leading-relaxed transition"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                * سوالات کاربردی و عمومی پس از تایید مدیریت به لیست سوالات متداول اضافه می‌گردند.
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !submitQuestion.trim()}
                className="bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال ثبت...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>ارسال پرسش به کارشناسان</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FAQView;
