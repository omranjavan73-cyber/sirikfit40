import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  PlusCircle,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  User as UserIcon,
  ShieldCheck,
  X,
  ChevronLeft,
  ArrowRight,
  HelpCircle,
  Tag,
  AlertTriangle
} from 'lucide-react';
import type { User, SupportTicket, TicketMessage } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';

interface UserSupportTicketsProps {
  currentUser: User;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

const CATEGORIES = [
  'سوال قبل از خرید',
  'گزارش مشکل',
  'پیگیری سفارش',
  'پیشنهاد و انتقاد',
  'سایر'
];

export const UserSupportTickets: React.FC<UserSupportTicketsProps> = ({ currentUser, showToast }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New Ticket Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply Form State
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Fetch tickets for current user
  const fetchTickets = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      // 1. Try local storage cache first
      if (typeof window !== 'undefined') {
        const localCache = localStorage.getItem(`sirikfit_tickets_${currentUser.id}`);
        if (localCache) {
          setTickets(JSON.parse(localCache));
        }
      }

      // 2. Fetch from Firestore if available
      if (db) {
        const ticketsRef = collection(db, 'tickets');
        const snap = await getDocs(ticketsRef);
        const userTickets: SupportTicket[] = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            data.userId === currentUser.id ||
            (currentUser.phoneNumber && data.userPhone === currentUser.phoneNumber)
          ) {
            userTickets.push({
              id: docSnap.id,
              ticketNumber: data.ticketNumber || `T-${docSnap.id.slice(0, 6).toUpperCase()}`,
              userId: data.userId || currentUser.id,
              userName: data.userName || currentUser.name,
              userPhone: data.userPhone || currentUser.phoneNumber,
              userEmail: data.userEmail || currentUser.email,
              subject: data.subject || 'بدون موضوع',
              category: data.category || 'عمومی',
              priority: data.priority || 'MEDIUM',
              status: data.status || 'PENDING',
              createdAt: data.createdAt || new Date().toLocaleDateString('fa-IR'),
              updatedAt: data.updatedAt || new Date().toLocaleDateString('fa-IR'),
              messages: data.messages || []
            });
          }
        });

        // Sort newest first
        userTickets.sort((a, b) => b.id.localeCompare(a.id));

        if (userTickets.length > 0) {
          setTickets(userTickets);
          try {
            localStorage.setItem(`sirikfit_tickets_${currentUser.id}`, JSON.stringify(userTickets));
          } catch (_e) {}
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentUser]);

  // Submit New Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !messageText.trim()) {
      if (showToast) showToast('لطفاً موضوع و متن تیکت را وارد نمایید', 'error');
      return;
    }

    setIsSubmitting(true);
    const nowPersian = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const ticketNum = `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialMsg: TicketMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'user',
      senderName: currentUser.name || 'کاربر',
      message: messageText.trim(),
      createdAt: nowPersian,
      timestamp: Date.now()
    };

    const newTicket: SupportTicket = {
      id: 'tkt-' + Date.now(),
      ticketNumber: ticketNum,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phoneNumber,
      userEmail: currentUser.email,
      subject: subject.trim(),
      category,
      priority,
      status: 'PENDING',
      createdAt: nowPersian,
      updatedAt: nowPersian,
      messages: [initialMsg]
    };

    try {
      if (db) {
        const docRef = await addDoc(collection(db, 'tickets'), newTicket);
        newTicket.id = docRef.id;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tickets');
    }

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    try {
      localStorage.setItem(`sirikfit_tickets_${currentUser.id}`, JSON.stringify(updated));
    } catch (_e) {}

    // Reset Form
    setSubject('');
    setMessageText('');
    setPriority('MEDIUM');
    setIsSubmitting(false);
    setActiveTab('list');

    if (showToast) showToast('تیکت پشتیبانی شما با موفقیت ثبت شد', 'success');
  };

  // Reply to selected ticket
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    const nowPersian = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const replyMsg: TicketMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'user',
      senderName: currentUser.name || 'کاربر',
      message: replyText.trim(),
      createdAt: nowPersian,
      timestamp: Date.now()
    };

    const updatedMessages = [...selectedTicket.messages, replyMsg];
    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      status: 'PENDING', // set back to pending admin response
      updatedAt: nowPersian,
      messages: updatedMessages
    };

    // Update state
    setSelectedTicket(updatedTicket);
    const updatedList = tickets.map((t) => (t.id === selectedTicket.id ? updatedTicket : t));
    setTickets(updatedList);
    try {
      localStorage.setItem(`sirikfit_tickets_${currentUser.id}`, JSON.stringify(updatedList));
    } catch (_e) {}

    // Update in Firestore
    try {
      if (db) {
        const tktRef = doc(db, 'tickets', selectedTicket.id);
        await updateDoc(tktRef, {
          status: 'PENDING',
          updatedAt: nowPersian,
          messages: updatedMessages
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tickets/${selectedTicket.id}`);
    }

    setReplyText('');
    setIsSendingReply(false);
    if (showToast) showToast('پاسخ شما ارسال شد', 'success');
  };

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
    <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-2xs space-y-5 font-['Vazirmatn',sans-serif]">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900">تیکت‌های پشتیبانی</h3>
            <p className="text-xs text-slate-500 font-medium">ارسال مستقیم پیام و درخواست‌های پشتیبانی به تیم فنی و بازرگانی</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => { setActiveTab('list'); setSelectedTicket(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list' && !selectedTicket
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>لیست تیکت‌ها ({tickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('new'); setSelectedTicket(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'new'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>ثبت تیکت جدید</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CREATE NEW TICKET FORM */}
      {activeTab === 'new' && (
        <form onSubmit={handleCreateTicket} className="space-y-4 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>ایجاد درخواست پشتیبانی جدید</span>
            </h4>
            <span className="text-[11px] font-bold text-slate-500">پاسخگویی سریع کمتر از ۲ ساعت</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Subject */}
            <div className="md:col-span-3">
              <label className="font-extrabold text-xs text-slate-900 block mb-1.5">
                موضوع تیکت <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="مثال: سوال در مورد نحوه محاسبه وزن مرسوله دبی"
                className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 text-xs font-bold p-3 rounded-xl focus:outline-none transition"
              />
            </div>

            {/* Category */}
            <div>
              <label className="font-extrabold text-xs text-slate-900 block mb-1.5">
                دسته‌بندی موضوع <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 text-xs font-bold p-3 rounded-xl focus:outline-none transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="font-extrabold text-xs text-slate-900 block mb-1.5">
                سطح اولویت <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 text-xs font-bold p-3 rounded-xl focus:outline-none transition"
              >
                <option value="HIGH">بالا (High - ضروری)</option>
                <option value="MEDIUM">متوسط (Medium - معمولی)</option>
                <option value="LOW">کم (Low - عمومی)</option>
              </select>
            </div>

            {/* Priority Display Indicator */}
            <div className="flex items-end">
              <div className="w-full bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">وضعیت اولویت:</span>
                {getPriorityBadge(priority)}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-extrabold text-xs text-slate-900 block mb-1.5">
              متن پیام و توضیحات کامل <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="توضیحات کامل درخواست یا سوال خود را بنویسید..."
              className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 text-xs font-bold p-3 rounded-xl focus:outline-none transition resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition px-3 py-2"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !messageText.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs px-6 py-3 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال ثبت...' : 'ارسال تیکت پشتیبانی'}</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 2: SELECTED TICKET DETAIL THREAD */}
      {selectedTicket && (
        <div className="space-y-4 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 md:p-5">
          {/* Thread Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md dir-ltr">
                    #{selectedTicket.ticketNumber}
                  </span>
                  <h4 className="font-black text-sm text-slate-900">{selectedTicket.subject}</h4>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  دسته‌بندی: <span className="text-slate-800 font-bold">{selectedTicket.category}</span> | تاریخ ثبت: {selectedTicket.createdAt}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {getPriorityBadge(selectedTicket.priority)}
              {getStatusBadge(selectedTicket.status)}
            </div>
          </div>

          {/* Conversation Messages Thread */}
          <div className="space-y-3 my-3 max-h-[450px] overflow-y-auto p-1">
            {selectedTicket.messages.map((msg) => {
              const isAdmin = msg.senderRole === 'admin';
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl border text-xs space-y-1.5 transition ${
                    isAdmin
                      ? 'bg-slate-900 text-white border-slate-800 mr-4 sm:mr-8 shadow-xs'
                      : 'bg-white text-slate-900 border-slate-200 ml-4 sm:ml-8 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b pb-2 border-slate-200/20">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isAdmin ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`font-black ${isAdmin ? 'text-emerald-400' : 'text-slate-900'}`}>
                        {isAdmin ? 'پشتیبانی سیریک فیت' : msg.senderName}
                      </span>
                    </div>
                    <span className={`text-[10px] font-medium ${isAdmin ? 'text-slate-400' : 'text-slate-400'}`}>
                      {msg.createdAt}
                    </span>
                  </div>

                  <p className="font-medium leading-relaxed whitespace-pre-wrap pt-1">{msg.message}</p>
                </div>
              );
            })}
          </div>

          {/* Reply Form (If Not Closed) */}
          {selectedTicket.status !== 'CLOSED' ? (
            <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-200 space-y-3">
              <label className="font-extrabold text-xs text-slate-900 block">ارسال پاسخ جدید:</label>
              <textarea
                rows={3}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="پاسخ یا توضیح تکمیلی خود را اینجا بنویسید..."
                className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 text-xs font-bold p-3 rounded-xl focus:outline-none transition resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">پاسخ‌های جدید سریعاً توسط مدیریت بررسی می‌شود.</span>
                <button
                  type="submit"
                  disabled={isSendingReply || !replyText.trim()}
                  className="bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black text-xs px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSendingReply ? 'در حال ارسال...' : 'ارسال پاسخ'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 bg-slate-200/80 border border-slate-300 rounded-xl text-center text-xs font-bold text-slate-700">
              این تیکت پشتیبانی توسط مدیریت بسته شده است. در صورت نیاز می‌توانید یک تیکت جدید ثبت نمایید.
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: TICKETS LIST */}
      {activeTab === 'list' && !selectedTicket && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-xs md:text-sm text-slate-800">هیچ تیکت پشتیبانی ثبت نشده است</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-1">جهت مطرح کردن سؤالات یا پیگیری امور، روی «ثبت تیکت جدید» کلیک کنید.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-xl transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>ارسال اولین تیکت</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md dir-ltr">
                        #{ticket.ticketNumber}
                      </span>
                      <h4 className="font-black text-xs md:text-sm text-slate-900 group-hover:text-emerald-700 transition">
                        {ticket.subject}
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium flex items-center gap-3">
                      <span>دسته: <strong className="text-slate-800">{ticket.category}</strong></span>
                      <span>•</span>
                      <span>تاریخ ثبت: {ticket.createdAt}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {getPriorityBadge(ticket.priority)}
                    {getStatusBadge(ticket.status)}
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
