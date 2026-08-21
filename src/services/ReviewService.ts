import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface ReviewItem {
  id: string;
  authorName: string;
  text: string;
  content: string;
  rating: number;
  likesCount: number;
  likes: number;
  dislikes?: number;
  category?: 'پیشنهاد' | 'انتقاد' | 'نظر';
  status: 'approved' | 'pending' | 'rejected';
  isApproved: boolean;
  adminReply: string | null;
  reply?: string;
  createdAt: string;
  updatedAt: string;
  timestamp?: number;
}

export const DEFAULT_PUBLIC_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-default-1',
    authorName: 'علی رضایی',
    text: 'تجربه بسیار خوبی از خرید مکمل داشتم. ارسال سریع و بسته‌بندی کاملاً اورجینال و پلمپ بود.',
    content: 'تجربه بسیار خوبی از خرید مکمل داشتم. ارسال سریع و بسته‌بندی کاملاً اورجینال و پلمپ بود.',
    rating: 5,
    likesCount: 14,
    likes: 14,
    category: 'نظر',
    isApproved: true,
    status: 'approved',
    adminReply: null,
    reply: '',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    timestamp: Date.now() - 7200000
  },
  {
    id: 'rev-default-2',
    authorName: 'سارا احمدی',
    text: 'پیشنهاد می‌کنم تنوع پروتئین‌های ایزوله بیشتر بشه، پشتیبانی واتساپ هم خیلی پاسخگو بودن.',
    content: 'پیشنهاد می‌کنم تنوع پروتئین‌های ایزوله بیشتر بشه، پشتیبانی واتساپ هم خیلی پاسخگو بودن.',
    rating: 5,
    likesCount: 9,
    likes: 9,
    category: 'پیشنهاد',
    isApproved: true,
    status: 'approved',
    adminReply: null,
    reply: '',
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    updatedAt: new Date(Date.now() - 18000000).toISOString(),
    timestamp: Date.now() - 18000000
  },
  {
    id: 'rev-default-3',
    authorName: 'محمدرضا کریمی',
    text: 'قیمت‌ها با توجه به نرخ درهم دبی و اصالت کالاها واقعاً منصفانه‌ست. ممنون از سیریک فیت.',
    content: 'قیمت‌ها با توجه به نرخ درهم دبی و اصالت کالاها واقعاً منصفانه‌ست. ممنون از سیریک فیت.',
    rating: 5,
    likesCount: 18,
    likes: 18,
    category: 'نظر',
    adminReply: 'با سلام و احترام، رضایت شما افتخار مجموعه سیریک فیت پرو است. سپاس از اعتماد شما.',
    reply: 'با سلام و احترام، رضایت شما افتخار مجموعه سیریک فیت پرو است. سپاس از اعتماد شما.',
    isApproved: true,
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    timestamp: Date.now() - 86400000
  }
];

const LOCAL_STORAGE_KEY = 'sirikfit_user_comments';

function mapDocToReviewItem(id: string, data: any): ReviewItem {
  const isApproved = data.status === 'approved' || (data.status !== 'pending' && data.status !== 'rejected' && data.isApproved === true);
  const status: 'approved' | 'pending' | 'rejected' = isApproved ? 'approved' : (data.status === 'rejected' ? 'rejected' : 'pending');
  const textContent = data.text || data.content || '';
  const replyContent = data.adminReply || data.reply || null;
  const count = typeof data.likesCount === 'number' ? data.likesCount : (typeof data.likes === 'number' ? data.likes : 0);

  return {
    id,
    authorName: data.authorName || 'کاربر میهمان',
    text: textContent,
    content: textContent,
    rating: typeof data.rating === 'number' ? data.rating : 5,
    likesCount: count,
    likes: count,
    dislikes: data.dislikes || 0,
    category: data.category || 'نظر',
    status,
    isApproved: status === 'approved',
    adminReply: replyContent,
    reply: replyContent || '',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
    timestamp: data.timestamp || Date.now()
  };
}

export const ReviewService = {
  /**
   * Subscribe to strictly approved comments for public store view in real-time.
   */
  subscribeApprovedReviews(callback: (reviews: ReviewItem[]) => void): () => void {
    if (!db) {
      const cached = this.getCachedReviews().filter(r => r.status === 'approved');
      callback(cached.length > 0 ? cached : DEFAULT_PUBLIC_REVIEWS);
      return () => {};
    }

    try {
      const commentsRef = collection(db, 'comments');
      // Query comments with status == 'approved' ordered by createdAt desc
      const q = query(commentsRef, where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(100));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ReviewItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Safeguard: strictly verify status === 'approved'
            if (data.status === 'approved' || (data.status !== 'pending' && data.isApproved === true)) {
              list.push(mapDocToReviewItem(docSnap.id, data));
            }
          });

          // Client-side safeguard
          const publicComments = list.filter(c => c.status === 'approved');

          if (publicComments.length > 0) {
            callback(publicComments);
            this.setCachedReviews(publicComments);
          } else {
            // Also check legacy reviews collection if comments collection is empty
            this.fetchLegacyReviewsFallback((legacyList) => {
              const approvedLegacy = legacyList.filter(c => c.status === 'approved');
              if (approvedLegacy.length > 0) {
                callback(approvedLegacy);
              } else {
                callback(DEFAULT_PUBLIC_REVIEWS);
              }
            });
          }
        },
        (err) => {
          console.warn('Firestore comments subscription warning, falling back to client filter:', err);
          // Fallback query without orderBy if index is building
          try {
            const simpleQ = query(commentsRef, where('status', '==', 'approved'), limit(100));
            onSnapshot(simpleQ, (snap) => {
              const fallbackList: ReviewItem[] = [];
              snap.forEach((docSnap) => {
                const item = mapDocToReviewItem(docSnap.id, docSnap.data());
                if (item.status === 'approved') fallbackList.push(item);
              });
              const publicComments = fallbackList.filter(c => c.status === 'approved');
              callback(publicComments.length > 0 ? publicComments : DEFAULT_PUBLIC_REVIEWS);
            }, () => {
              const cached = this.getCachedReviews().filter(r => r.status === 'approved');
              callback(cached.length > 0 ? cached : DEFAULT_PUBLIC_REVIEWS);
            });
          } catch (_fallbackErr) {
            const cached = this.getCachedReviews().filter(r => r.status === 'approved');
            callback(cached.length > 0 ? cached : DEFAULT_PUBLIC_REVIEWS);
          }
        }
      );

      return unsubscribe;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'comments');
      callback(DEFAULT_PUBLIC_REVIEWS);
      return () => {};
    }
  },

  /**
   * Helper fallback to check legacy reviews collection if comments is empty
   */
  async fetchLegacyReviewsFallback(cb: (reviews: ReviewItem[]) => void) {
    if (!db) return;
    try {
      const snap = await getDocs(query(collection(db, 'reviews'), limit(50)));
      if (!snap.empty) {
        const legacyList: ReviewItem[] = [];
        snap.forEach((docSnap) => {
          const item = mapDocToReviewItem(docSnap.id, docSnap.data());
          if (item.status === 'approved') legacyList.push(item);
        });
        if (legacyList.length > 0) cb(legacyList);
      }
    } catch (_e) {}
  },

  /**
   * Subscribe to all comments (approved + pending + rejected) for Admin Panel in real time.
   */
  subscribeAllReviews(callback: (reviews: ReviewItem[]) => void): () => void {
    if (!db) {
      callback(this.getCachedReviews());
      return () => {};
    }

    try {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(150));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ReviewItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push(mapDocToReviewItem(docSnap.id, docSnap.data()));
          });

          if (list.length > 0) {
            callback(list);
            this.setCachedReviews(list);
          } else {
            // Check legacy collection
            const reviewsRef = collection(db, 'reviews');
            getDocs(query(reviewsRef, limit(100))).then((revSnap) => {
              if (!revSnap.empty) {
                const legacyList: ReviewItem[] = [];
                revSnap.forEach((d) => legacyList.push(mapDocToReviewItem(d.id, d.data())));
                callback(legacyList);
              } else {
                callback(DEFAULT_PUBLIC_REVIEWS);
              }
            }).catch(() => callback(DEFAULT_PUBLIC_REVIEWS));
          }
        },
        (err) => {
          console.warn('Admin comments subscription warning, trying fallback without order:', err);
          try {
            onSnapshot(collection(db, 'comments'), (snap) => {
              const fallbackList: ReviewItem[] = [];
              snap.forEach((docSnap) => fallbackList.push(mapDocToReviewItem(docSnap.id, docSnap.data())));
              callback(fallbackList.length > 0 ? fallbackList : DEFAULT_PUBLIC_REVIEWS);
            }, () => {
              callback(this.getCachedReviews());
            });
          } catch (_e) {
            callback(this.getCachedReviews());
          }
        }
      );

      return unsubscribe;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'comments');
      callback(this.getCachedReviews());
      return () => {};
    }
  },

  /**
   * Approve a comment: Updates Firestore document with { status: 'approved', updatedAt: ... }
   */
  async approveReview(commentId: string): Promise<void> {
    if (!commentId) return;
    if (db && !commentId.startsWith('rev-default-')) {
      const nowIso = new Date().toISOString();
      try {
        const commentRef = doc(db, 'comments', commentId);
        await setDoc(commentRef, {
          status: 'approved',
          isApproved: true,
          updatedAt: nowIso
        }, { merge: true });

        // Sync legacy collection if exists
        try {
          await updateDoc(doc(db, 'reviews', commentId), {
            status: 'approved',
            isApproved: true,
            updatedAt: nowIso
          });
        } catch (_legacyErr) {}
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
        throw err;
      }
    }
  },

  /**
   * Unpublish / move comment to pending: Updates Firestore document with { status: 'pending', updatedAt: ... }
   */
  async unapproveReview(commentId: string): Promise<void> {
    if (!commentId) return;
    if (db && !commentId.startsWith('rev-default-')) {
      const nowIso = new Date().toISOString();
      try {
        const commentRef = doc(db, 'comments', commentId);
        await setDoc(commentRef, {
          status: 'pending',
          isApproved: false,
          updatedAt: nowIso
        }, { merge: true });

        // Sync legacy collection if exists
        try {
          await updateDoc(doc(db, 'reviews', commentId), {
            status: 'pending',
            isApproved: false,
            updatedAt: nowIso
          });
        } catch (_legacyErr) {}
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
        throw err;
      }
    }
  },

  /**
   * Permanently delete a comment document from Firestore.
   */
  async deleteReview(commentId: string): Promise<void> {
    if (!commentId) return;
    if (db && !commentId.startsWith('rev-default-')) {
      try {
        await deleteDoc(doc(db, 'comments', commentId));
        try {
          await deleteDoc(doc(db, 'reviews', commentId));
        } catch (_legacyErr) {}
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `comments/${commentId}`);
        throw err;
      }
    }
  },

  /**
   * Reply to a comment as Store Admin: Updates Firestore with { adminReply: ..., updatedAt: ... }
   */
  async replyToReview(commentId: string, replyText: string): Promise<void> {
    if (!commentId) return;
    if (db && !commentId.startsWith('rev-default-')) {
      const nowIso = new Date().toISOString();
      const trimmed = replyText.trim();
      try {
        const commentRef = doc(db, 'comments', commentId);
        await setDoc(commentRef, {
          adminReply: trimmed,
          reply: trimmed,
          updatedAt: nowIso
        }, { merge: true });

        try {
          await updateDoc(doc(db, 'reviews', commentId), {
            adminReply: trimmed,
            reply: trimmed,
            updatedAt: nowIso
          });
        } catch (_legacyErr) {}
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
        throw err;
      }
    }
  },

  /**
   * Update full comment details in Firestore.
   */
  async updateReview(commentId: string, updates: Partial<ReviewItem>): Promise<void> {
    if (!commentId) return;
    if (db && !commentId.startsWith('rev-default-')) {
      const nowIso = new Date().toISOString();
      const payload: any = {
        ...updates,
        updatedAt: nowIso
      };
      if (updates.content && !updates.text) payload.text = updates.content;
      if (updates.text && !updates.content) payload.content = updates.text;
      if (updates.reply && !updates.adminReply) payload.adminReply = updates.reply;
      if (updates.adminReply && !updates.reply) payload.reply = updates.adminReply;

      try {
        const commentRef = doc(db, 'comments', commentId);
        await setDoc(commentRef, payload, { merge: true });

        try {
          await updateDoc(doc(db, 'reviews', commentId), payload);
        } catch (_legacyErr) {}
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
        throw err;
      }
    }
  },

  /**
   * Public user submits a new comment (starts strictly as pending).
   */
  async submitUserReview(review: { authorName: string; content?: string; text?: string; category?: 'پیشنهاد' | 'انتقاد' | 'نظر'; rating?: number }): Promise<ReviewItem> {
    const rawText = (review.text || review.content || '').trim();
    const nowIso = new Date().toISOString();
    const newCommentData = {
      authorName: review.authorName.trim() || 'کاربر میهمان',
      text: rawText,
      content: rawText,
      rating: review.rating || 5,
      likesCount: 0,
      likes: 0,
      dislikes: 0,
      category: review.category || (rawText.includes('پیشنهاد') ? 'پیشنهاد' : rawText.includes('انتقاد') ? 'انتقاد' : 'نظر'),
      status: 'pending' as const,
      isApproved: false,
      adminReply: null,
      reply: '',
      createdAt: nowIso,
      updatedAt: nowIso,
      timestamp: Date.now()
    };

    let generatedId = 'comm-' + Date.now();

    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'comments'), newCommentData);
        generatedId = docRef.id;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'comments');
      }
    }

    return {
      id: generatedId,
      ...newCommentData
    };
  },

  /**
   * Like a comment item.
   */
  async likeReview(commentId: string, currentLikes: number): Promise<void> {
    if (!commentId) return;
    if (db && !commentId.startsWith('rev-default-')) {
      const nowIso = new Date().toISOString();
      const updatedCount = currentLikes + 1;
      try {
        const commentRef = doc(db, 'comments', commentId);
        await setDoc(commentRef, {
          likesCount: updatedCount,
          likes: updatedCount,
          updatedAt: nowIso
        }, { merge: true });

        try {
          await updateDoc(doc(db, 'reviews', commentId), {
            likes: updatedCount,
            likesCount: updatedCount,
            updatedAt: nowIso
          });
        } catch (_legacyErr) {}
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
      }
    }
  },

  getCachedReviews(): ReviewItem[] {
    if (typeof window === 'undefined') return DEFAULT_PUBLIC_REVIEWS;
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('sirikfit_user_reviews');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_e) {}
    return DEFAULT_PUBLIC_REVIEWS;
  },

  setCachedReviews(reviews: ReviewItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reviews));
      localStorage.setItem('sirikfit_user_reviews', JSON.stringify(reviews));
    } catch (_e) {}
  }
};
