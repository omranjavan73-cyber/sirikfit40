import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Send, CheckCircle2, User, X, Sparkles, Filter, ArrowRight, CornerDownLeft, Star } from 'lucide-react';
import type { CmsConfig } from '../types';
import { ReviewService, ReviewItem, DEFAULT_PUBLIC_REVIEWS } from '../services/ReviewService';

export type { ReviewItem };

interface ReviewsSectionProps {
  showReviewsSection?: boolean;
  cms?: CmsConfig | null;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ showReviewsSection = true, cms }) => {
  const isEnabled = (cms?.features?.showReviews ?? cms?.features?.showComments ?? cms?.showReviewsSection ?? cms?.showReviews ?? cms?.showComments ?? showReviewsSection) !== false;

  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_PUBLIC_REVIEWS);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'همه' | 'جدیدترین' | 'پر لایک' | 'پیشنهاد' | 'انتقاد'>('همه');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  // 1. Subscribe strictly to Approved comments from Firestore collection 'comments' in Real-Time
  useEffect(() => {
    const unsubscribe = ReviewService.subscribeApprovedReviews((approvedList) => {
      // Double check client-side filtering safeguard
      const strictlyApproved = (approvedList || []).filter(c => c && c.status === 'approved');
      setReviews(strictlyApproved);
    });

    return () => unsubscribe();
  }, []);

  // If globally disabled from Admin Panel General Settings, return null completely
  if (!isEnabled) {
    return null;
  }

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      await ReviewService.submitUserReview({
        authorName: authorName.trim() || 'کاربر میهمان',
        content: content.trim(),
        text: content.trim(),
        rating: 5,
        category: content.includes('پیشنهاد') ? 'پیشنهاد' : content.includes('انتقاد') ? 'انتقاد' : 'نظر'
      });

      setContent('');
      setAuthorName('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (id: string) => {
    if (likedMap[id]) return; // already liked once
    setLikedMap((prev) => ({ ...prev, [id]: true }));

    const target = reviews.find((r) => r.id === id);
    const curLikes = (target?.likesCount ?? target?.likes) || 0;

    const updated = reviews.map((r) => {
      if (r.id === id) {
        return { ...r, likesCount: curLikes + 1, likes: curLikes + 1 };
      }
      return r;
    });
    setReviews(updated);

    try {
      await ReviewService.likeReview(id, curLikes);
    } catch (_e) {}
  };

  // Strictly enforce client-side filter: ONLY render items with status === 'approved'
  const publicComments = (reviews || []).filter(
    (r) => r && r.status === 'approved'
  );
  const recentReviews = publicComments.slice(0, 3);

  const filteredReviews = publicComments.filter((r) => {
    const likes = r.likesCount ?? r.likes ?? 0;
    if (activeFilter === 'همه') return true;
    if (activeFilter === 'جدیدترین') return true;
    if (activeFilter === 'پر لایک') return likes >= 5;
    if (activeFilter === 'پیشنهاد') return r.category === 'پیشنهاد';
    if (activeFilter === 'انتقاد') return r.category === 'انتقاد';
    return true;
  }).sort((a, b) => {
    if (activeFilter === 'پر لایک') {
      const likesA = a.likesCount ?? a.likes ?? 0;
      const likesB = b.likesCount ?? b.likes ?? 0;
      return likesB - likesA;
    }
    return 0;
  });

  const formatReviewDate = (dateStr?: string) => {
    if (!dateStr) return 'به تازگی';
    if (dateStr.includes('پیش') || dateStr.includes('هم‌اکنون')) return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 font-['Vazirmatn',sans-serif]">
      {/* 1. Main Card: نظرات و پیشنهادات شما */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base text-slate-900">نظرات و پیشنهادات شما</h3>
              <p className="text-[11px] text-slate-500 font-medium">دیدگاه‌ها و نظرات شما به بهبود خدمات ما کمک می‌کند</p>
            </div>
          </div>
        </div>

        {/* Form: Submit Review */}
        <form onSubmit={handleAddReview} className="space-y-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
          <div>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="نام شما (اختیاری)"
              className="w-full bg-white border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
            />
          </div>
          <div>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="نظر یا پیشنهاد خود را بنویسید..."
              required
              className="w-full bg-white border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'در حال ثبت...' : 'ارسال نظر'}</span>
            </button>

            {submitSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>نظر شما ثبت شد و پس از بررسی تایید می‌شود!</span>
              </span>
            )}
          </div>
        </form>

        {/* 2. آخرین نظرات تایید شده کاربران */}
        <div className="pt-2 space-y-3">
          <h4 className="font-black text-xs md:text-sm text-slate-900 flex items-center gap-2">
            <span>آخرین نظرات کاربران</span>
          </h4>

          {recentReviews.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-slate-200/70 rounded-2xl">
              <p className="text-xs text-slate-400 font-bold">هنوز دیدگاهی برای نمایش ثبت نشده است. اولین نفری باشید که نظر ثبت می‌کند!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentReviews.map((rev) => (
                <div key={rev.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900">{rev.authorName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{formatReviewDate(rev.createdAt)}</span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed px-1">{rev.text || rev.content}</p>

                  {(rev.adminReply || rev.reply) && (
                    <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-2.5 text-[11px] text-indigo-950 space-y-0.5">
                      <span className="font-black text-[10px] text-indigo-700 block">پاسخ پشتیبانی:</span>
                      <p className="font-medium leading-relaxed">{rev.adminReply || rev.reply}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(rev.id)}
                      className={`flex items-center gap-1.5 font-bold transition ${
                        likedMap[rev.id] ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{rev.likesCount ?? rev.likes ?? 0}</span>
                    </button>

                    {Boolean(rev.adminReply || rev.reply) && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                        پاسخ پشتیبانی دارد
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Button: مشاهده همه نظرات */}
          {publicComments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAllModal(true)}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl font-black text-xs text-slate-800 transition flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.99]"
            >
              <MessageSquare className="w-4 h-4 text-slate-700" />
              <span>مشاهده همه نظرات ({publicComments.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL: Full Dedicated Reviews Page */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-['Vazirmatn',sans-serif]">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAllModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <h3 className="font-extrabold text-base sm:text-lg">نظرات و پیشنهادات تایید شده کاربران</h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content: Filters & List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {(['همه', 'جدیدترین', 'پر لایک', 'پیشنهاد', 'انتقاد'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                      activeFilter === filter
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Reviews Cards List */}
              <div className="space-y-3">
                {filteredReviews.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-bold text-xs">
                    هیچ دیدگاه تایید شده‌ای در این دسته‌بندی یافت نشد.
                  </div>
                ) : (
                  filteredReviews.map((rev) => (
                    <div key={rev.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="font-black text-xs text-slate-900 block">{rev.authorName}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{formatReviewDate(rev.createdAt)}</span>
                          </div>
                        </div>

                        {rev.category && (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            rev.category === 'پیشنهاد' ? 'bg-amber-100 text-amber-800' :
                            rev.category === 'انتقاد' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {rev.category}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 font-medium leading-relaxed">{rev.text || rev.content}</p>

                      {(rev.adminReply || rev.reply) && (
                        <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 space-y-1">
                          <span className="font-black text-[11px] text-indigo-700 block">پاسخ رسمی پشتیبانی:</span>
                          <p className="font-medium text-[11px] leading-relaxed">{rev.adminReply || rev.reply}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(rev.id)}
                          className={`flex items-center gap-1.5 font-extrabold transition ${
                            likedMap[rev.id] ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{rev.likesCount ?? rev.likes ?? 0}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
