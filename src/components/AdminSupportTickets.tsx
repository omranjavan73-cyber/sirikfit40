import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  X,
  Send,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  Phone,
  Mail,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Tag,
  Check,
  Edit,
  Plus,
  Eye,
  EyeOff,
  ThumbsUp,
  Sparkles
} from 'lucide-react';
import type { SupportTicket, TicketMessage } from '../types';
import type { ReviewItem } from './ReviewsSection';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

interface AdminSupportTicketsProps {
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const AdminSupportTickets: React.FC<AdminSupportTicketsProps> = ({ showToast }) => {
  // Main Tab: 'tickets' | 'reviews'
  const [activeTab, setActiveTab] = useState<'tickets' | 'reviews'>('tickets');

  // --- TICKETS STATE ---
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REPLIED' | 'CLOSED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Admin Reply State
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // --- REVIEWS STATE ---
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsSearchQuery, setReviewsSearchQuery] = useState('');
  const [reviewsFilterStatus, setReviewsFilterStatus] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [reviewsCategoryFilter, setReviewsCategoryFilter] = useState<'ALL' | 'نظر' | 'پیشنهاد' | 'انتقاد'>('ALL');

  // Review Edit Modal State
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [editAuthor, setEditAuthor] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<'نظر' | 'پیشنهاد' | 'انتقاد'>('نظر');
  const [editReply, setEditReply] = useState('');
  const [editApproved, setEditApproved] = useState(true);

  // Add Review Modal State
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [newAuthor, setNewAuthor] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'نظر' | 'پیشنهاد' | 'انتقاد'>('نظر');
  const [newApproved, setNewApproved] = useState(true);

  // Fetch all tickets across all users
  const fetchAllTickets = async () => {
    setIsLoadingTickets(true);
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('sirikfit_admin_all_tickets');
        if (cached) {
          setTickets(JSON.parse(cached));
        }
      }

      if (db) {
        const ticketsRef = collection(db, 'tickets');
        const snap = await getDocs(ticketsRef);
        const list: SupportTicket[] = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ticketNumber: data.ticketNumber || `T-${docSnap.id.slice(0, 6).toUpperCase()}`,
            userId: data.userId || 'usr-guest',
            userName: data.userName || 'کاربر میهمان',
            userPhone: data.userPhone || 'نامشخص',
            userEmail: data.userEmail || '',
            subject: data.subject || 'بدون موضوع',
            category: data.category || 'عمومی',
            priority: data.priority || 'MEDIUM',
            status: data.status || 'PENDING',
            createdAt: data.createdAt || new Date().toLocaleDateString('fa-IR'),
            updatedAt: data.updatedAt || new Date().toLocaleDateString('fa-IR'),
            messages: data.messages || []
          });
        });

        list.sort((a, b) => b.id.localeCompare(a.id));
        setTickets(list);
        try {
          localStorage.setItem('sirikfit_admin_all_tickets', JSON.stringify(list));
        } catch (_e) {}
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'tickets');
    } finally {
      setIsLoadingTickets(false);
    }
  };

  // Fetch all reviews across all users
  const fetchAllReviews = async () => {
    setIsLoadingReviews(true);
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('sirikfit_user_reviews');
        if (cached) {
          setReviews(JSON.parse(cached));
        }
      }

      if (db) {
        const reviewsRef = collection(db, 'reviews');
        const snap = await getDocs(reviewsRef);
        const list: ReviewItem[] = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            authorName: data.authorName || 'کاربر میهمان',
            content: data.content || '',
            createdAt: data.createdAt || 'نامشخص',
            likes: data.likes || 0,
            category: data.category || 'نظر',
            reply: data.reply || '',
            isApproved: data.isApproved !== false,
          });
        });

        list.sort((a, b) => b.id.localeCompare(a.id));
        setReviews(list);
        try {
          localStorage.setItem('sirikfit_user_reviews', JSON.stringify(list));
        } catch (_e) {}
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'reviews');
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchAllTickets();
    fetchAllReviews();
  }, []);

  // Filter tickets logic
  const filteredTickets = (tickets || []).filter((ticket) => {
    if (!ticket) return false;
    if (statusFilter !== 'ALL' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && ticket.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        (ticket.ticketNumber || '').toLowerCase().includes(q) ||
        (ticket.subject || '').toLowerCase().includes(q) ||
        (ticket.userName || '').toLowerCase().includes(q) ||
        (ticket.userPhone || '').toLowerCase().includes(q) ||
        (ticket.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter reviews logic
  const filteredReviews = (reviews || []).filter((rev) => {
    if (!rev) return false;
    if (reviewsFilterStatus === 'APPROVED' && rev.isApproved === false) return false;
    if (reviewsFilterStatus === 'PENDING' && rev.isApproved !== false) return false;
    if (reviewsCategoryFilter !== 'ALL' && rev.category !== reviewsCategoryFilter) return false;
    if (reviewsSearchQuery.trim()) {
      const q = reviewsSearchQuery.trim().toLowerCase();
      return (
        (rev.authorName || '').toLowerCase().includes(q) ||
        (rev.content || '').toLowerCase().includes(q) ||
        (rev.reply && rev.reply.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Admin Reply to Ticket
  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    const nowPersian = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const adminMsg: TicketMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'admin',
      senderName: 'مدیریت سیریک فیت',
      message: replyText.trim(),
      createdAt: nowPersian,
      timestamp: Date.now()
    };

    const updatedMessages = [...selectedTicket.messages, adminMsg];
    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      status: 'REPLIED',
      updatedAt: nowPersian,
      messages: updatedMessages
    };

    setSelectedTicket(updatedTicket);
    const updatedList = tickets.map((t) => (t.id === selectedTicket.id ? updatedTicket : t));
    setTickets(updatedList);
    try {
      localStorage.setItem('sirikfit_admin_all_tickets', JSON.stringify(updatedList));
    } catch (_e) {}

    try {
      if (db) {
        const docRef = doc(db, 'tickets', selectedTicket.id);
        await updateDoc(docRef, {
          status: 'REPLIED',
          updatedAt: nowPersian,
          messages: updatedMessages
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tickets/${selectedTicket.id}`);
    }

    setReplyText('');
    setIsSendingReply(false);
    if (showToast) showToast('پاسخ شما با موفقیت برای کاربر ارسال گردید', 'success');
  };

  // Change Ticket Status
  const handleChangeStatus = async (ticketId: string, newStatus: 'PENDING' | 'REPLIED' | 'CLOSED') => {
    const updatedList = tickets.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t));
    setTickets(updatedList);
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }

    try {
      localStorage.setItem('sirikfit_admin_all_tickets', JSON.stringify(updatedList));
    } catch (_e) {}

    try {
      if (db) {
        const docRef = doc(db, 'tickets', ticketId);
        await updateDoc(docRef, { status: newStatus });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tickets/${ticketId}`);
    }

    if (showToast) showToast(`وضعیت تیکت تغییر یافت`, 'success');
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('آیا از حذف کامل این تیکت اطمینان دارید؟ این عملیات قابل بازگشت نیست.')) return;

    const updatedList = tickets.filter((t) => t.id !== ticketId);
    setTickets(updatedList);
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(null);
    }

    try {
      localStorage.setItem('sirikfit_admin_all_tickets', JSON.stringify(updatedList));
    } catch (_e) {}

    try {
      if (db) {
        const docRef = doc(db, 'tickets', ticketId);
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tickets/${ticketId}`);
    }

    if (showToast) showToast('تیکت با موفقیت حذف گردید', 'success');
  };

  // Toggle Review Approval (Publish / Unpublish)
  const handleToggleReviewApproval = async (review: ReviewItem) => {
    const newStatus = !review.isApproved;
    const updatedList = reviews.map((r) => (r.id === review.id ? { ...r, isApproved: newStatus } : r));
    setReviews(updatedList);
    try {
      localStorage.setItem('sirikfit_user_reviews', JSON.stringify(updatedList));
    } catch (_e) {}

    try {
      if (db) {
        const docRef = doc(db, 'reviews', review.id);
        await updateDoc(docRef, { isApproved: newStatus });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reviews/${review.id}`);
    }

    if (showToast) {
      showToast(newStatus ? 'نظر منتشر گردید' : 'نظر از حالت انتشار خارج شد', 'success');
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('آیا از حذف این نظر اطمینان دارید؟')) return;
    const updatedList = reviews.filter((r) => r.id !== reviewId);
    setReviews(updatedList);
    try {
      localStorage.setItem('sirikfit_user_reviews', JSON.stringify(updatedList));
    } catch (_e) {}

    try {
      if (db) {
        const docRef = doc(db, 'reviews', reviewId);
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
    }

    if (showToast) showToast('نظر با موفقیت حذف گردید', 'success');
  };

  // Open Edit Review Modal
  const handleOpenEditReview = (review: ReviewItem) => {
    setEditingReview(review);
    setEditAuthor(review.authorName);
    setEditContent(review.content);
    setEditCategory(review.category || 'نظر');
    setEditReply(review.reply || '');
    setEditApproved(review.isApproved !== false);
  };

  // Save Edit Review
  const handleSaveEditReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;

    const updatedReview: ReviewItem = {
      ...editingReview,
      authorName: editAuthor.trim() || 'کاربر میهمان',
      content: editContent.trim(),
      category: editCategory,
      reply: editReply.trim() || undefined,
      isApproved: editApproved,
    };

    const updatedList = reviews.map((r) => (r.id === editingReview.id ? updatedReview : r));
    setReviews(updatedList);
    try {
      localStorage.setItem('sirikfit_user_reviews', JSON.stringify(updatedList));
    } catch (_e) {}

    try {
      if (db) {
        const docRef = doc(db, 'reviews', editingReview.id);
        await updateDoc(docRef, {
          authorName: updatedReview.authorName,
          content: updatedReview.content,
          category: updatedReview.category,
          reply: updatedReview.reply || '',
          isApproved: updatedReview.isApproved,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reviews/${editingReview.id}`);
    }

    setEditingReview(null);
    if (showToast) showToast('ویرایش نظر با موفقیت ذخیره گردید', 'success');
  };

  // Create New Review by Admin
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newRev: ReviewItem = {
      id: 'rev-' + Date.now(),
      authorName: newAuthor.trim() || 'مدیر سیریک فیت',
      content: newContent.trim(),
      createdAt: new Date().toLocaleDateString('fa-IR'),
      likes: 0,
      category: newCategory,
      isApproved: newApproved,
    };

    try {
      if (db) {
        await addDoc(collection(db, 'reviews'), {
          ...newRev,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'reviews');
    }

    const updatedList = [newRev, ...reviews];
    setReviews(updatedList);
    try {
      localStorage.setItem('sirikfit_user_reviews', JSON.stringify(updatedList));
    } catch (_e) {}

    setNewAuthor('');
    setNewContent('');
    setShowAddReviewModal(false);
    if (showToast) showToast('نظر جدید ثبت گردید', 'success');
  };

  const pendingTicketsCount = (tickets || []).filter((t) => t && t.status === 'PENDING').length;
  const highPriorityCount = (tickets || []).filter((t) => t && t.priority === 'HIGH' && t.status !== 'CLOSED').length;
  const pendingReviewsCount = (reviews || []).filter((r) => r && r.isApproved === false).length;

  const getPriorityBadge = (p: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (p) {
      case 'HIGH':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2 py-0.5 rounded-md">اولویت بالا</span>;
      case 'MEDIUM':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md">اولویت متوسط</span>;
      case 'LOW':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-black px-2 py-0.5 rounded-md">اولویت کم</span>;
    }
  };

  const getStatusBadge = (s: 'PENDING' | 'REPLIED' | 'CLOSED') => {
    switch (s) {
      case 'PENDING':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3 text-amber-600" />در انتظار پاسخ</span>;
      case 'REPLIED':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" />پاسخ داده شده</span>;
      case 'CLOSED':
        return <span className="bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><X className="w-3 h-3 text-slate-500" />بسته شده</span>;
    }
  };

  return (
    <div className="space-y-5 font-['Vazirmatn',sans-serif]">
      {/* 🟢 TOP TABBED NAVIGATION: Tickets vs Reviews */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <LifeBuoy className="w-4 h-4 text-emerald-400" />
            <span>تیکت‌های پشتیبانی</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'tickets' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200 text-slate-800'
            }`}>
              {tickets.length}
            </span>
            {pendingTicketsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                {pendingTicketsCount} جدید
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span>نظرات و پیشنهادات</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'reviews' ? 'bg-slate-800 text-sky-300' : 'bg-slate-200 text-slate-800'
            }`}>
              {reviews.length}
            </span>
            {pendingReviewsCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {pendingReviewsCount} در انتظار تایید
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (activeTab === 'tickets') fetchAllTickets();
            else fetchAllReviews();
          }}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets || isLoadingReviews ? 'animate-spin text-emerald-600' : ''}`} />
          <span>به‌روزرسانی</span>
        </button>
      </div>

      {/* TAB 1: SUPPORT TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-5">
          {/* Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-extrabold block">کل تیکت‌های پشتیبانی</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{tickets.length}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold shrink-0">
                <LifeBuoy className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-700 font-extrabold block">در انتظار پاسخ مدیریت</span>
                <span className="text-xl font-black text-amber-800 mt-1 block">{pendingTicketsCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-700 font-extrabold block">تیکت‌های اولویت بالا</span>
                <span className="text-xl font-black text-rose-800 mt-1 block">{highPriorityCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Main Container */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس شماره تیکت، عنوان، نام یا تلفن کاربر..."
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 text-slate-900 font-extrabold text-xs pr-10 pl-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-400 font-bold px-1.5 text-[10px]">وضعیت:</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    همه
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PENDING')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-amber-700'}`}
                  >
                    در انتظار
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('REPLIED')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${statusFilter === 'REPLIED' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-emerald-700'}`}
                  >
                    پاسخ داده شده
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('CLOSED')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${statusFilter === 'CLOSED' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    بسته شده
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-400 font-bold px-1.5 text-[10px]">اولویت:</span>
                  <button
                    type="button"
                    onClick={() => setPriorityFilter('ALL')}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${priorityFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    همه
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityFilter('HIGH')}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${priorityFilter === 'HIGH' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-rose-700'}`}
                  >
                    بالا
                  </button>
                </div>
              </div>
            </div>

            {/* Tickets Grid / List */}
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                <LifeBuoy className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="font-extrabold text-sm text-slate-700">هیچ تیکتی با این مشخصات یافت نشد.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Tickets List Column */}
                <div className={`space-y-3 ${selectedTicket ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                  {filteredTickets.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`p-4 rounded-2xl border transition cursor-pointer space-y-2.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50'
                            : 'bg-white hover:bg-slate-50/90 border-slate-200/90 text-slate-900 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${
                              isSelected ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {t.ticketNumber}
                            </span>
                            {getStatusBadge(t.status)}
                          </div>
                          {getPriorityBadge(t.priority)}
                        </div>

                        <div>
                          <h4 className={`font-extrabold text-sm line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {t.subject}
                          </h4>
                          <p className={`text-xs mt-1 font-medium flex items-center gap-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            <span><UserIcon className="w-3 h-3 inline ml-1 opacity-70" />{t.userName}</span>
                            <span>•</span>
                            <span><Phone className="w-3 h-3 inline ml-1 opacity-70" />{t.userPhone}</span>
                          </p>
                        </div>

                        <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${
                          isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'
                        }`}>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span>{t.category}</span>
                          </span>
                          <span>{t.createdAt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Ticket Conversation Column */}
                {selectedTicket && (
                  <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 self-start sticky top-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                            {selectedTicket.ticketNumber}
                          </span>
                          {getStatusBadge(selectedTicket.status)}
                          {getPriorityBadge(selectedTicket.priority)}
                        </div>
                        <h3 className="font-black text-base text-slate-900">{selectedTicket.subject}</h3>
                        <p className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-2">
                          <span>کاربر: <strong className="text-slate-900">{selectedTicket.userName}</strong></span>
                          <span>•</span>
                          <span>تلفن: <strong className="text-slate-900 dir-ltr">{selectedTicket.userPhone}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(selectedTicket.id, selectedTicket.status === 'CLOSED' ? 'PENDING' : 'CLOSED')}
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                            selectedTicket.status === 'CLOSED'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{selectedTicket.status === 'CLOSED' ? 'بازگشایی' : 'بستن تیکت'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(selectedTicket.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                          title="حذف تیکت"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTicket(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-xl transition cursor-pointer lg:hidden"
                          title="بستن پنجره"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Messages History */}
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pl-1 pr-1">
                      {selectedTicket.messages.map((msg) => {
                        const isAdmin = msg.senderRole === 'admin';
                        return (
                          <div
                            key={msg.id}
                            className={`p-3.5 rounded-2xl space-y-1.5 max-w-[90%] text-xs ${
                              isAdmin
                                ? 'mr-auto bg-slate-900 text-white rounded-tl-none shadow-xs'
                                : 'ml-auto bg-white border border-slate-200 text-slate-900 rounded-tr-none'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px]">
                              <span className={`font-black ${isAdmin ? 'text-emerald-400' : 'text-slate-800'}`}>
                                {msg.senderName}
                              </span>
                              <span className={isAdmin ? 'text-slate-400' : 'text-slate-400'}>
                                {msg.createdAt}
                              </span>
                            </div>
                            <p className="font-semibold leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Send Admin Reply Form */}
                    <form onSubmit={handleAdminReply} className="space-y-2 pt-2 border-t border-slate-200">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="پاسخ مدیریت را اینجا بنویسید..."
                        className="w-full bg-white border border-slate-200 focus:border-slate-800 text-slate-900 font-extrabold text-xs p-3 rounded-xl focus:outline-none transition resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">پاسخ به طور مستقیم برای کاربر نمایش داده خواهد شد</span>
                        <button
                          type="submit"
                          disabled={isSendingReply || !replyText.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingReply ? 'در حال ارسال...' : 'ارسال پاسخ'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REVIEWS & SUGGESTIONS */}
      {activeTab === 'reviews' && (
        <div className="space-y-5 font-['Vazirmatn',sans-serif]">
          {/* Header & Add Button Bar */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm md:text-base text-slate-900">مدیریت نظرات و پیشنهادات کاربران</h3>
                  <p className="text-xs text-slate-500 font-medium">بررسی، تایید و انتشار، ویرایش و حذف نظرات ارسالی خریداران</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddReviewModal(true)}
                className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>افزودن نظر جدید</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reviewsSearchQuery}
                  onChange={(e) => setReviewsSearchQuery(e.target.value)}
                  placeholder="جستجو در متن نظر، نام نویسنده یا پاسخ..."
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 text-slate-900 font-extrabold text-xs pr-10 pl-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-400 font-bold px-1.5 text-[10px]">وضعیت:</span>
                  <button
                    type="button"
                    onClick={() => setReviewsFilterStatus('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${reviewsFilterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    همه ({reviews.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewsFilterStatus('APPROVED')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${reviewsFilterStatus === 'APPROVED' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-emerald-700'}`}
                  >
                    منتشر شده ({(reviews || []).filter(r => r && r.isApproved !== false).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewsFilterStatus('PENDING')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${reviewsFilterStatus === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-amber-700'}`}
                  >
                    در انتظار تایید ({(reviews || []).filter(r => r && r.isApproved === false).length})
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-400 font-bold px-1.5 text-[10px]">دسته:</span>
                  <button
                    type="button"
                    onClick={() => setReviewsCategoryFilter('ALL')}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${reviewsCategoryFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    همه
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewsCategoryFilter('نظر')}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${reviewsCategoryFilter === 'نظر' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-sky-700'}`}
                  >
                    نظر
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewsCategoryFilter('پیشنهاد')}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${reviewsCategoryFilter === 'پیشنهاد' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-indigo-700'}`}
                  >
                    پیشنهاد
                  </button>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="font-extrabold text-sm text-slate-700">هیچ نظری در این بخش یافت نشد.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReviews.map((rev) => {
                  const isApproved = rev.isApproved !== false;
                  return (
                    <div
                      key={rev.id}
                      className={`p-4 rounded-2xl border transition space-y-3 flex flex-col justify-between ${
                        isApproved
                          ? 'bg-white border-slate-200/90 shadow-2xs'
                          : 'bg-amber-50/50 border-amber-200/90 ring-1 ring-amber-300/60 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Header Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                              👤 {rev.authorName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {rev.category || 'نظر'}
                            </span>
                          </div>

                          {/* Approval Status Badge */}
                          {isApproved ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>منتشر شده</span>
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>در انتظار تایید</span>
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <p className="text-xs text-slate-800 font-extrabold leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          {rev.content}
                        </p>

                        {/* Admin Reply if exists */}
                        {rev.reply && (
                          <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-xs space-y-1">
                            <span className="font-extrabold text-indigo-900 text-[10px] block">💬 پاسخ مدیریت:</span>
                            <p className="font-bold text-indigo-800 text-[11px]">{rev.reply}</p>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-slate-500" />
                            <span>{rev.likes} لایک</span>
                          </span>
                          <span>•</span>
                          <span>{rev.createdAt}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Approve/Publish Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleReviewApproval(rev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1 cursor-pointer border ${
                              isApproved
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                            }`}
                          >
                            {isApproved ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>خروج از انتشار</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>تایید و انتشار</span>
                              </>
                            )}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditReview(rev)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer border border-slate-200"
                            title="ویرایش نظر"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer border border-rose-200"
                            title="حذف نظر"
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
        </div>
      )}

      {/* EDIT REVIEW MODAL */}
      {editingReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 font-['Vazirmatn',sans-serif]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <span>ویرایش نظر / پاسخ مدیریت</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditReview} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">نام نویسنده:</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">دسته‌بندی:</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">متن نظر:</label>
                <textarea
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs p-3 rounded-xl focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-indigo-700 block mb-1">پاسخ مدیریت (نمایش در زیر نظر):</label>
                <textarea
                  rows={2}
                  value={editReply}
                  onChange={(e) => setEditReply(e.target.value)}
                  placeholder="پاسخ مدیریت را وارد نمایید..."
                  className="w-full bg-indigo-50/50 border border-indigo-200 focus:border-indigo-600 text-indigo-900 font-bold text-xs p-3 rounded-xl focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editApproved}
                    onChange={(e) => setEditApproved(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-xs font-bold text-slate-800">تایید و انتشار مستقیم روی سایت</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW REVIEW MODAL */}
      {showAddReviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 font-['Vazirmatn',sans-serif]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>افزودن نظر / رضایت جدید</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddReviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">نام نویسنده / مشتری:</label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="مثلاً: علی رضایی"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">دسته‌بندی:</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">متن نظر / تجربه خرید:</label>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="تجربه خرید یا نظر..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 text-slate-900 font-bold text-xs p-3 rounded-xl focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newApproved}
                    onChange={(e) => setNewApproved(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-xs font-bold text-slate-800">انتشار فوری در صفحه اصلی</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddReviewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  ثبت و ایجاد نظر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
