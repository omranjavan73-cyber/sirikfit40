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
   * Subscribe to strictly approved reviews for public store view in real-time.
   */
  subscribeApprovedReviews(callback: (reviews: ReviewItem[]) => void): () => void {
    if (!db) {
      const cached = this.getCachedReviews().filter(r => r.status === 'approved' || r.isApproved === true);
      callback(cached.length > 0 ? cached : DEFAULT_PUBLIC_REVIEWS);
      return () => {};
    }

    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('isApproved', '==', true), limit(100));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ReviewItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.isApproved === true || data.status === 'approved') {
              list.push(mapDocToReviewItem(docSnap.id, data));
            }
          });

          if (list.length > 0) {
            callback(list);
            this.setCachedReviews(list);
          } else {
            // Check comments collection fallback
            const commentsRef = collection(db, 'comments');
            getDocs(query(commentsRef, where('status', '==', 'approved'), limit(50))).then((cSnap) => {
              if (!cSnap.empty) {
                const cList: ReviewItem[] = [];
                cSnap.forEach(d => cList.push(mapDocToReviewItem(d.id, d.data())));
                callback(cList);
              } else {
                callback(DEFAULT_PUBLIC_REVIEWS);
              }
            }).catch(() => callback(DEFAULT_PUBLIC_REVIEWS));
          }
        },
        (err) => {
          console.warn('Reviews subscription warning, falling back to comments:', err);
          const cached = this.getCachedReviews().filter(r => r.status === 'approved' || r.isApproved === true);
          callback(cached.length > 0 ? cached : DEFAULT_PUBLIC_REVIEWS);
        }
      );

      return unsubscribe;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'reviews');
      callback(DEFAULT_PUBLIC_REVIEWS);
      return () => {};
    }
  },

  /**
   * Subscribe to all reviews (approved + pending + rejected) for Admin Panel in real time.
   */
  subscribeAllReviews(callback: (reviews: ReviewItem[]) => void): () => void {
    if (!db) {
      callback(this.getCachedReviews());
      return () => {};
    }

    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, limit(200));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ReviewItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push(mapDocToReviewItem(docSnap.id, docSnap.data()));
          });

          if (list.length > 0) {
            list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            callback(list);
            this.setCachedReviews(list);
          } else {
            // Check comments collection fallback
            const commentsRef = collection(db, 'comments');
            getDocs(query(commentsRef, limit(100))).then((cSnap) => {
              if (!cSnap.empty) {
                const cList: ReviewItem[] = [];
                cSnap.forEach(d => cList.push(mapDocToReviewItem(d.id, d.data())));
                cList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                callback(cList);
              } else {
                callback(DEFAULT_PUBLIC_REVIEWS);
              }
            }).catch(() => callback(DEFAULT_PUBLIC_REVIEWS));
          }
        },
        (err) => {
          console.warn('Admin reviews subscription warning:', err);
          callback(this.getCachedReviews());
        }
      );

      return unsubscribe;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'reviews');
      callback(this.getCachedReviews());
      return () => {};
    }
  },

  /**
   * Approve a review: Updates Firestore documents in both 'reviews' and 'comments'
   */
  async approveReview(reviewId: string): Promise<void> {
    if (!reviewId) return;
    const nowIso = new Date().toISOString();
    const payload = {
      status: 'approved',
      isApproved: true,
      updatedAt: nowIso
    };

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', reviewId), payload, { merge: true });
        await setDoc(doc(db, 'comments', reviewId), payload, { merge: true }).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Unpublish / move review to pending
   */
  async unapproveReview(reviewId: string): Promise<void> {
    if (!reviewId) return;
    const nowIso = new Date().toISOString();
    const payload = {
      status: 'pending',
      isApproved: false,
      updatedAt: nowIso
    };

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', reviewId), payload, { merge: true });
        await setDoc(doc(db, 'comments', reviewId), payload, { merge: true }).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Permanently delete a review document from Firestore.
   */
  async deleteReview(reviewId: string): Promise<void> {
    if (!reviewId) return;
    if (db) {
      try {
        await deleteDoc(doc(db, 'reviews', reviewId));
        await deleteDoc(doc(db, 'comments', reviewId)).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Reply to a review as Store Admin
   */
  async replyToReview(reviewId: string, replyText: string): Promise<void> {
    if (!reviewId) return;
    const nowIso = new Date().toISOString();
    const trimmed = replyText.trim();
    const payload = {
      adminReply: trimmed,
      reply: trimmed,
      updatedAt: nowIso
    };

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', reviewId), payload, { merge: true });
        await setDoc(doc(db, 'comments', reviewId), payload, { merge: true }).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Update full review details in Firestore.
   */
  async updateReview(reviewId: string, updates: Partial<ReviewItem>): Promise<void> {
    if (!reviewId) return;
    const nowIso = new Date().toISOString();
    const payload: any = {
      ...updates,
      updatedAt: nowIso
    };
    if (updates.content && !updates.text) payload.text = updates.content;
    if (updates.text && !updates.content) payload.content = updates.text;
    if (updates.reply && !updates.adminReply) payload.adminReply = updates.reply;
    if (updates.adminReply && !updates.reply) payload.reply = updates.adminReply;

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', reviewId), payload, { merge: true });
        await setDoc(doc(db, 'comments', reviewId), payload, { merge: true }).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Batch save all reviews to Firestore
   */
  async batchSaveReviews(reviewsList: ReviewItem[]): Promise<void> {
    if (!db || !Array.isArray(reviewsList)) return;
    const nowIso = new Date().toISOString();
    for (const item of reviewsList) {
      const payload = {
        authorName: item.authorName || 'کاربر میهمان',
        text: item.content || item.text || '',
        content: item.content || item.text || '',
        rating: item.rating || 5,
        likesCount: item.likesCount || 0,
        likes: item.likes || 0,
        category: item.category || 'نظر',
        status: item.isApproved ? 'approved' : item.status || 'pending',
        isApproved: item.isApproved ?? (item.status === 'approved'),
        adminReply: item.adminReply || item.reply || null,
        reply: item.reply || item.adminReply || '',
        createdAt: item.createdAt || nowIso,
        updatedAt: nowIso,
        timestamp: item.timestamp || Date.now()
      };
      try {
        await setDoc(doc(db, 'reviews', item.id), payload, { merge: true });
        await setDoc(doc(db, 'comments', item.id), payload, { merge: true }).catch(() => {});
      } catch (e) {
        console.warn(`Error batch saving review ${item.id}:`, e);
      }
    }
  },

  /**
   * Public user submits a new review (starts strictly as pending).
   */
  async submitUserReview(review: { authorName: string; content?: string; text?: string; category?: 'پیشنهاد' | 'انتقاد' | 'نظر'; rating?: number }): Promise<ReviewItem> {
    const rawText = (review.text || review.content || '').trim();
    const nowIso = new Date().toISOString();
    const generatedId = 'rev-' + Date.now();
    const newReviewData = {
      id: generatedId,
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

    if (db) {
      try {
        await setDoc(doc(db, 'reviews', generatedId), newReviewData, { merge: true });
        await setDoc(doc(db, 'comments', generatedId), newReviewData, { merge: true }).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'reviews');
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
