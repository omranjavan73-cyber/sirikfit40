import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Send, CheckCircle, X, HelpCircle as HelpIcon, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  submittedBy?: string;
  createdAt: number;
}

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    id: 'def-1',
    question: 'تفاوت موجودی انبار ایران و سفارش از دبی چیست؟',
    answer: 'کالاهای موجود در انبار ایران به صورت قطعی در تهران موجود هستند و ۲۴ الی ۴۸ ساعته با پیک یا پست تحویل داده می‌شوند. اما سفارش‌های دبی، مستقیم برای شما از دبی خریداری و بارگیری می‌شوند و تحویل آن‌ها ۷ الی ۱۴ روز کاری درب منزل شما زمان می‌برد.',
    published: true,
    createdAt: 1700000000000
  },
  {
    id: 'def-2',
    question: 'هزینه ارسال سفارش‌ها چگونه محاسبه می‌شود؟',
    answer: 'برای موجودی انبار ایران ارسال با پست پیشتاز/پیک طبق نرخ‌های استاندارد است. برای سفارش‌های دبی، هزینه حمل بر اساس وزن کالا (طبق نرخ کارگو مصوب) محاسبه و روی قیمت نهایی افزوده می‌شود.',
    published: true,
    createdAt: 1700000000001
  },
  {
    id: 'def-3',
    question: 'آیا محصولات ارائه شده اورجینال هستند؟',
    answer: 'بله، تمامی مکمل‌ها و محصولات عرضه شده در سیریک‌فیت به صورت مستقیم از برندهای معتبر و فروشگاه‌های رسمی امارات (مانند Dr Nutrition و GNC) تهیه می‌شوند و با ضمانت اصالت ۱۰۰٪ پلمپ ارائه می‌گردند.',
    published: true,
    createdAt: 1700000000002
  },
  {
    id: 'def-4',
    question: 'آیا امکان مرجوعی کالا وجود دارد؟',
    answer: 'به دلیل ماهیت بهداشتی مکمل‌ها، مرجوعی کالا تنها در صورت مغایرت محصول ارسالی با فاکتور ثبت شده یا آسیب‌دیدگی شدید پلمپ کالا در حین حمل و نقل، پیش از باز شدن پلمپ ثانویه امکان‌پذیر است.',
    published: true,
    createdAt: 1700000000003
  }
];

export const FAQModal: React.FC<FAQModalProps> = ({ isOpen, onClose }) => {
  const [faqs, setFaqs] = useState<FAQItem[]>(DEFAULT_FAQS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Submit new question state
  const [submitName, setSubmitName] = useState('');
  const [submitContact, setSubmitContact] = useState('');
  const [submitQuestion, setSubmitQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFaqs();
    }
  }, [isOpen]);

  const fetchFaqs = async () => {
    try {
      const q = query(
        collection(db, 'faqs'),
        where('published', '==', true)
      );
      const snap = await getDocs(q);
      const list: FAQItem[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          question: data.question || '',
          answer: data.answer || '',
          published: data.published ?? false,
          createdAt: data.createdAt || Date.now()
        });
      });
      
      if (list.length > 0) {
        setFaqs(list);
      } else {
        setFaqs(DEFAULT_FAQS);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setFaqs(DEFAULT_FAQS);
    }
  };

  const handleToggle = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitQuestion.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'faqs'), {
        question: submitQuestion.trim(),
        answer: '',
        published: false,
        submittedBy: submitName.trim() || 'کاربر مهمان',
        contact: submitContact.trim() || 'ثبت نشده',
        createdAt: Date.now()
      });
      setSubmitSuccess(true);
      setSubmitQuestion('');
      setSubmitName('');
      setSubmitContact('');
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Error submitting custom question:', err);
      alert('خطا در ثبت سوال. لطفا دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto font-['Vazirmatn',sans-serif]">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <HelpIcon className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">سوالات متداول (FAQ)</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">پاسخ سوالات پرتکرار و راهنمای ثبت سفارش مستقیم</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-right dir-rtl">
          {/* FAQ Accordion List */}
          <div className="space-y-3">
            {faqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? 'border-slate-900 bg-slate-50/50 shadow-2xs' 
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(faq.id)}
                    className="w-full px-4 py-4 flex items-center justify-between gap-3 text-right cursor-pointer"
                  >
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 leading-relaxed">
                      {faq.question}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-900 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-700 leading-relaxed border-t border-slate-100 font-medium">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit New Question Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-amber-500 shrink-0" />
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">سوال خود را مطرح کنید</h4>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              اگر پاسخ سوال خود را پیدا نکردید، آن را از طریق فرم زیر ثبت کنید. پس از بررسی، پاسخ آن برای شما ارسال و در این بخش نمایش داده می‌شود.
            </p>

            {submitSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>با تشکر! سوال شما ثبت شد و پس از پاسخ ادمین نمایش داده خواهد شد.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitQuestion} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">نام یا نام مستعار:</label>
                    <input
                      type="text"
                      placeholder="مثال: علی احمدی"
                      value={submitName}
                      onChange={(e) => setSubmitName(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">شماره تماس یا آیدی تلگرام:</label>
                    <input
                      type="text"
                      placeholder="مثال: @myhandle یا 0912..."
                      value={submitContact}
                      onChange={(e) => setSubmitContact(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none transition dir-ltr"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">متن سوال شما:</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="سوال خود درباره سفارش، نحوه پرداخت یا ارسال را بنویسید..."
                    value={submitQuestion}
                    onChange={(e) => setSubmitQuestion(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-slate-900 text-xs p-3 rounded-xl focus:outline-none leading-relaxed transition"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>در حال ثبت...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>ثبت و ارسال سوال</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-bold shrink-0">
          <span>سیریک‌فیت - واردات مستقیم مکمل‌های اصلی ورزشی از دبی</span>
          <button
            onClick={onClose}
            className="text-slate-900 hover:underline cursor-pointer"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
