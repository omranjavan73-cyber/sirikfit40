import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ThumbsUp,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  X,
  Check,
  CornerDownLeft,
  AlertTriangle,
  Send,
  MessageCircle,
  Filter
} from 'lucide-react';
import { ReviewService, ReviewItem, DEFAULT_PUBLIC_REVIEWS } from '../services/ReviewService';

interface AdminReviewsProps {
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminReviews: React.FC<AdminReviewsProps> = ({ showToast }) => {
  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_PUBLIC_REVIEWS);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'نظر' | 'پیشنهاد' | 'انتقاد'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Active Edit/Reply
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [replyingReview, setReplyingReview] = useState<ReviewItem | null>(null);
  const [deletingReview, setDeletingReview] = useState<ReviewItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit / Reply Form States
  const [editAuthor, setEditAuthor] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<'نظر' | 'پیشنهاد' | 'انتقاد'>('نظر');
  const [editStatus, setEditStatus] = useState<'approved' | 'pending'>('approved');
  const [editReply, setEditReply] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Review Form State
  const [newAuthor, setNewAuthor] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'نظر' | 'پیشنهاد' | 'انتقاد'>('نظر');
  const [newStatus, setNewStatus] = useState<'approved' | 'pending'>('approved');
  const [newReply, setNewReply] = useState('');

  // Real-time Firestore Subscription for Reviews
  useEffect(() => {
    setLoading(true);
    const unsubscribe = ReviewService.subscribeAllReviews((updatedReviews) => {
      setReviews(updatedReviews);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    const isApproved = r.status === 'approved' || (r.status !== 'pending' && r.isApproved === true);

    // Status tab filter
    if (statusFilter === 'APPROVED' && !isApproved) return false;
    if (statusFilter === 'PENDING' && isApproved) return false;

    // Category filter
    if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAuthor = (r.authorName || '').toLowerCase().includes(q);
      const matchContent = (r.content || '').toLowerCase().includes(q);
      const matchReply = (r.reply || r.adminReply || '').toLowerCase().includes(q);
      if (!matchAuthor && !matchContent && !matchReply) return false;
    }

    return true;
  });

  const totalCount = reviews.length;
  const approvedCount = reviews.filter((r) => r.status === 'approved' || (r.status !== 'pending' && r.isApproved === true)).length;
  const pendingCount = reviews.filter((r) => r.status === 'pending' || (r.isApproved === false && r.status !== 'approved')).length;

  // Toggle approval / publish status
  const handleToggleApproval = async (review: ReviewItem) => {
    const currentlyApproved = review.status === 'approved' || (review.status !== 'pending' && review.isApproved === true);
    const targetStatus = currentlyApproved ? 'pending' : 'approved';

    try {
      if (currentlyApproved) {
        await ReviewService.unapproveReview(review.id);
        if (showToast) showToast('نظر از حالت انتشار خارج شد و به لیست در انتظار منتقل گردید.', 'info');
      } else {
        await ReviewService.approveReview(review.id);
        if (showToast) showToast('نظر با موفقیت تایید و در سایت منتشر شد.', 'success');
      }

      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? { ...r, status: targetStatus, isApproved: targetStatus === 'approved' }
            : r
        )
      );
    } catch (err: any) {
      console.error('Error toggling approval:', err);
      if (showToast) showToast('خطا در تغییر وضعیت انتشار نظر: ' + (err.message || ''), 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (review: ReviewItem) => {
    setEditingReview(review);
    setEditAuthor(review.authorName);
    setEditContent(review.content);
    setEditCategory(review.category || 'نظر');
    setEditStatus(review.status === 'approved' || (review.status !== 'pending' && review.isApproved === true) ? 'approved' : 'pending');
    setEditReply(review.reply || review.adminReply || '');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;

    setIsSubmitting(true);
    try {
      await ReviewService.updateReview(editingReview.id, {
        authorName: editAuthor.trim() || 'کاربر میهمان',
        content: editContent.trim(),
        category: editCategory,
        status: editStatus,
        isApproved: editStatus === 'approved',
        reply: editReply.trim() || undefined,
        adminReply: editReply.trim() || undefined
      });

      setReviews((prev) =>
        prev.map((r) =>
          r.id === editingReview.id
            ? {
                ...r,
                authorName: editAuthor.trim() || 'کاربر میهمان',
                content: editContent.trim(),
                category: editCategory,
                status: editStatus,
                isApproved: editStatus === 'approved',
                reply: editReply.trim() || undefined,
                adminReply: editReply.trim() || undefined
              }
            : r
        )
      );

      setEditingReview(null);
      if (showToast) showToast('تغییرات نظر با موفقیت ذخیره شد.', 'success');
    } catch (err: any) {
      console.error('Error saving review edit:', err);
      if (showToast) showToast('خطا در ذخیره ویرایش نظر: ' + (err.message || ''), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Direct Reply Modal
  const handleOpenReply = (review: ReviewItem) => {
    setReplyingReview(review);
    setReplyText(review.reply || review.adminReply || '');
  };

  // Submit Admin Reply
  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview) return;

    setIsSubmitting(true);
    try {
      await ReviewService.replyToReview(replyingReview.id, replyText.trim());
      setReviews((prev) =>
        prev.map((r) =>
          r.id === replyingReview.id
            ? { ...r, reply: replyText.trim(), adminReply: replyText.trim() }
            : r
        )
      );
      setReplyingReview(null);
      if (showToast) showToast('پاسخ مدیریت با موفقیت ثبت و ارسال شد.', 'success');
    } catch (err: any) {
      console.error('Error saving admin reply:', err);
      if (showToast) showToast('خطا در ثبت پاسخ مدیریت: ' + (err.message || ''), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm and Execute Delete
  const handleConfirmDelete = async () => {
    if (!deletingReview) return;

    setIsSubmitting(true);
    try {
      await ReviewService.deleteReview(deletingReview.id);
      setReviews((prev) => prev.filter((r) => r.id !== deletingReview.id));
      setDeletingReview(null);
      if (showToast) showToast('نظر با موفقیت حذف دائمی گردید.', 'success');
    } catch (err: any) {
      console.error('Error deleting review:', err);
      if (showToast) showToast('خطا در حذف نظر: ' + (err.message || ''), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add New Admin Review / Testimonial
  const handleCreateNewReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await ReviewService.submitUserReview({
        authorName: newAuthor.trim() || 'مدیریت / خریدار تایید شده',
        content: newContent.trim(),
        category: newCategory
      });

      if (newStatus === 'approved') {
        await ReviewService.approveReview(created.id);
      }
      if (newReply.trim()) {
        await ReviewService.replyToReview(created.id, newReply.trim());
      }

      setReviews((prev) => [
        {
          ...created,
          status: newStatus,
          isApproved: newStatus === 'approved',
          reply: newReply.trim() || undefined,
          adminReply: newReply.trim() || undefined
        },
        ...prev
      ]);

      setShowAddModal(false);
      setNewAuthor('');
      setNewContent('');
      setNewReply('');
      if (showToast) showToast('نظر جدید با موفقیت در سیستم ثبت گردید.', 'success');
    } catch (err: any) {
      console.error('Error creating review:', err);
      if (showToast) showToast('خطا در ایجاد نظر جدید: ' + (err.message || ''), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 font-['Vazirmatn',sans-serif] animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <span>مدیریت نظرات و پیشنهادات کاربران</span>
                <span className="bg-sky-100 text-sky-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-sky-200">
                  Real-time Moderation
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                بررسی، تایید و انتشار آنی، خروج از انتشار، پاسخ رسمی مدیریت و حذف دیدگاه‌ها
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>افزودن نظر جدید</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در متن نظر، نام نویسنده یا پاسخ مدیریت..."
              className="w-full bg-white border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs pr-10 pl-3.5 py-2.5 rounded-xl focus:outline-none transition shadow-2xs"
            />
          </div>

          {/* Filter Tabs Container */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-slate-400 font-bold px-1.5 text-[10px]">وضعیت:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                همه ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs flex items-center gap-1 ${
                  statusFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>منتشر شده ({approvedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs flex items-center gap-1 ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>در انتظار تایید ({pendingCount})</span>
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-slate-400 font-bold px-1.5 text-[10px]">دسته:</span>
              {(['ALL', 'نظر', 'پیشنهاد', 'انتقاد'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'ALL' ? 'همه' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews Cards List */}
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto opacity-70" />
            <p className="font-extrabold text-sm text-slate-700">هیچ نظری با این مشخصات یافت نشد.</p>
            <p className="text-xs text-slate-400">می‌توانید فیلترها را تغییر داده یا نظر جدیدی اضافه کنید.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            {filteredReviews.map((rev) => {
              const isApproved = rev.status === 'approved' || (rev.status !== 'pending' && rev.isApproved === true);
              const hasReply = Boolean(rev.reply || rev.adminReply);

              return (
                <div
                  key={rev.id}
                  className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-3.5 shadow-2xs ${
                    isApproved
                      ? 'bg-white border-slate-200/90'
                      : 'bg-amber-50/40 border-amber-200/90 ring-1 ring-amber-300/50'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row: Author & Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                          👤 {rev.authorName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            rev.category === 'پیشنهاد'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : rev.category === 'انتقاد'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {rev.category || 'نظر'}
                        </span>
                      </div>

                      {/* Approval Status Badge */}
                      {isApproved ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>منتشر شده</span>
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>در انتظار تایید</span>
                        </span>
                      )}
                    </div>

                    {/* Content Box */}
                    <p className="text-xs sm:text-sm text-slate-800 font-extrabold leading-relaxed bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/70 select-text">
                      {rev.content}
                    </p>

                    {/* Admin Reply Section */}
                    {hasReply && (
                      <div className="bg-indigo-50/80 border border-indigo-200/80 p-3 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-indigo-900 text-[11px] flex items-center gap-1">
                            <CornerDownLeft className="w-3.5 h-3.5 text-indigo-600" />
                            <span>پاسخ رسمی مدیریت:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenReply(rev)}
                            className="text-[10px] text-indigo-700 hover:text-indigo-950 font-bold underline cursor-pointer"
                          >
                            ویرایش پاسخ
                          </button>
                        </div>
                        <p className="font-bold text-indigo-900 text-xs leading-relaxed">
                          {rev.reply || rev.adminReply}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions Row */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                        <span>{rev.likes || 0} لایک</span>
                      </span>
                      <span>•</span>
                      <span>{rev.createdAt}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Action 1: Toggle Publish / Approve */}
                      <button
                        type="button"
                        onClick={() => handleToggleApproval(rev)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border ${
                          isApproved
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                        }`}
                        title={isApproved ? 'خروج از انتشار' : 'تایید و انتشار فوری'}
                      >
                        {isApproved ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>عدم تایید / لغو انتشار</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>انتشار نظر</span>
                          </>
                        )}
                      </button>

                      {/* Action 2: Reply Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenReply(rev)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition cursor-pointer border border-indigo-200 text-xs font-bold flex items-center gap-1"
                        title="پاسخ به این نظر"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>پاسخ</span>
                      </button>

                      {/* Action 3: Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rev)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer border border-slate-200"
                        title="ویرایش کامل نظر"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Action 4: Permanent Delete */}
                      <button
                        type="button"
                        onClick={() => setDeletingReview(rev)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer border border-rose-200"
                        title="حذف دائمی نظر"
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

      {/* MODAL 1: EDIT REVIEW */}
      {editingReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 font-['Vazirmatn',sans-serif]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <span>ویرایش کامل نظر / وضعیت و پاسخ</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">نام نویسنده:</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">دسته‌بندی:</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                  >
                    <option value="نظر">نظر</option>
                    <option value="پیشنهاد">پیشنهاد</option>
                    <option value="انتقاد">انتقاد</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">وضعیت انتشار:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                  >
                    <option value="approved">✅ منتشر شده (Approved)</option>
                    <option value="pending">⏳ در انتظار تایید (Pending)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">متن دیدگاه کاربر:</label>
                <textarea
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs p-3 rounded-xl focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-indigo-900 block mb-1">پاسخ رسمی مدیریت (اختیاری):</label>
                <textarea
                  rows={2}
                  value={editReply}
                  onChange={(e) => setEditReply(e.target.value)}
                  placeholder="متن پاسخ مدیریت برای نمایش زیر این دیدگاه..."
                  className="w-full bg-indigo-50/50 border border-indigo-200 focus:border-indigo-600 text-slate-900 font-bold text-xs p-3 rounded-xl focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIN REPLY MODAL */}
      {replyingReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 font-['Vazirmatn',sans-serif]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
                <span>پاسخ رسمی به نظر {replyingReview.authorName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReplyingReview(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 font-bold leading-relaxed">
              <span className="text-[10px] text-slate-400 block mb-1">متن نظر کاربر:</span>
              "{replyingReview.content}"
            </div>

            <form onSubmit={handleSaveReply} className="space-y-3.5">
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">متن پاسخ مدیریت فروشگاه:</label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ خود را اینجا بنویسید..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 text-slate-900 font-bold text-xs p-3 rounded-xl focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت پاسخ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deletingReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 font-['Vazirmatn',sans-serif] text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-base text-slate-900">آیا از حذف دائمی این نظر اطمینان دارید؟</h4>
              <p className="text-xs text-slate-500 font-medium">
                این عملیات غیرقابل بازگشت است و نظر بلافاصله از پایگاه داده و فروشگاه حذف خواهد شد.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 font-bold text-right">
              <p className="line-clamp-2">"{deletingReview.content}"</p>
              <span className="text-[10px] text-slate-400 block mt-1">نویسنده: {deletingReview.authorName}</span>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReview(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex-1"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex-1"
              >
                {isSubmitting ? 'در حال حذف...' : 'بله، حذف دائمی'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD NEW REVIEW */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 font-['Vazirmatn',sans-serif]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>ثبت نظر جدید یا رضایت مشتری</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewReview} className="space-y-3.5">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">نام نویسنده / مشتری:</label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="مثال: محمد امینی"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">دسته‌بندی:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                  >
                    <option value="نظر">نظر</option>
                    <option value="پیشنهاد">پیشنهاد</option>
                    <option value="انتقاد">انتقاد</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">وضعیت اولیه انتشار:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                  >
                    <option value="approved">✅ انتشار فوری در سایت</option>
                    <option value="pending">⏳ ذخیره در صف انتظار</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">متن نظر:</label>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="متن دیدگاه، پیشنهاد یا بازخورد..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs p-3 rounded-xl focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-indigo-900 block mb-1">پاسخ مدیریت (اختیاری):</label>
                <textarea
                  rows={2}
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="در صورت تمایل، پاسخ رسمی مدیریت را وارد کنید..."
                  className="w-full bg-indigo-50/50 border border-indigo-200 focus:border-indigo-600 text-slate-900 font-bold text-xs p-3 rounded-xl focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'در حال ثبت...' : 'افزودن نظر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
