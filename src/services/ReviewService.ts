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
  content: string;
  createdAt: string;
  likes: number;
  dislikes?: number;
  category?: 'پیشنهاد' | 'انتقاد' | 'نظر';
  reply?: string;
  adminReply?: string;
  isApproved?: boolean;
  status?: 'approved' | 'pending';
  timestamp?: number;
}

export const DEFAULT_PUBLIC_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-default-1',
    authorName: 'علی رضایی',
    content: 'تجربه بسیار خوبی از خرید مکمل داشتم. ارسال سریع و بسته‌بندی کاملاً اورجینال و پلمپ بود.',
    createdAt: '۲ ساعت پیش',
    likes: 14,
    category: 'نظر',
    isApproved: true,
    status: 'approved',
    timestamp: Date.now() - 7200000
  },
  {
    id: 'rev-default-2',
    authorName: 'سارا احمدی',
    content: 'پیشنهاد می‌کنم تنوع پروتئین‌های ایزوله بیشتر بشه، پشتیبانی واتساپ هم خیلی پاسخگو بودن.',
    createdAt: '۵ ساعت پیش',
    likes: 9,
    category: 'پیشنهاد',
    isApproved: true,
    status: 'approved',
    timestamp: Date.now() - 18000000
  },
  {
    id: 'rev-default-3',
    authorName: 'محمدرضا کریمی',
    content: 'قیمت‌ها با توجه به نرخ درهم دبی و اصالت کالاها واقعاً منصفانه‌ست. ممنون از سیریک فیت.',
    createdAt: '۱ روز پیش',
    likes: 18,
    category: 'نظر',
    reply: 'با سلام و احترام، رضایت شما افتخار مجموعه سیریک فیت پرو است. سپاس از اعتماد شما.',
    adminReply: 'با سلام و احترام، رضایت شما افتخار مجموعه سیریک فیت پرو است. سپاس از اعتماد شما.',
    isApproved: true,
    status: 'approved',
    timestamp: Date.now() - 86400000
  }
];

const LOCAL_STORAGE_KEY = 'sirikfit_user_reviews';

export const ReviewService = {
  /**
   * Subscribe to strictly approved reviews for public store view in real-time.
   */
  subscribeApprovedReviews(callback: (reviews: ReviewItem[]) => void): () => void {
    if (!db) {
      const cached = this.getCachedReviews().filter(r => r.isApproved !== false && r.status !== 'pending');
      callback(cached.length > 0 ? cached : DEFAULT_PUBLIC_REVIEWS);
      return () => {};
    }

    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, orderBy('createdAt', 'desc'), limit(100));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ReviewItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isApproved = data.isApproved === true || data.status === 'approved';
            if (isApproved) {
              list.push({
                id: docSnap.id,
                authorName: data.authorName || 'کاربر میهمان',
                content: data.content || '',
                createdAt: data.createdAt || 'چند لحظه پیش',
                likes: data.likes || 0,
                dislikes: data.dislikes || 0,
                category: data.category || 'نظر',
                reply: data.reply || data.adminReply || '',
                adminReply: data.adminReply || data.reply || '',
                isApproved: true,
                status: 'approved',
                timestamp: data.timestamp || Date.now()
              });
            }
          });

          if (list.length > 0) {
            callback(list);
            this.setCachedReviews(list);
          } else {
            callback(DEFAULT_PUBLIC_REVIEWS);
          }
        },
        (err) => {
          console.warn('Firestore reviews subscription warning:', err);
          const cached = this.getCachedReviews().filter(r => r.isApproved !== false && r.status !== 'pending');
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
   * Subscribe to all reviews (approved + pending) for Admin Panel.
   */
  subscribeAllReviews(callback: (reviews: ReviewItem[]) => void): () => void {
    if (!db) {
      callback(this.getCachedReviews());
      return () => {};
    }

    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, orderBy('createdAt', 'desc'), limit(150));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ReviewItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isApproved = data.status === 'approved' || (data.status !== 'pending' && data.isApproved === true);
            list.push({
              id: docSnap.id,
              authorName: data.authorName || 'کاربر میهمان',
              content: data.content || '',
              createdAt: data.createdAt || 'چند لحظه پیش',
              likes: data.likes || 0,
              dislikes: data.dislikes || 0,
              category: data.category || 'نظر',
              reply: data.reply || data.adminReply || '',
              adminReply: data.adminReply || data.reply || '',
              isApproved,
              status: isApproved ? 'approved' : 'pending',
              timestamp: data.timestamp || Date.now()
            });
          });

          callback(list.length > 0 ? list : DEFAULT_PUBLIC_REVIEWS);
          this.setCachedReviews(list.length > 0 ? list : DEFAULT_PUBLIC_REVIEWS);
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
   * Approve a review to immediately show in public store.
   */
  async approveReview(reviewId: string): Promise<void> {
    if (!reviewId) return;
    if (db && !reviewId.startsWith('rev-default-')) {
      try {
        const docRef = doc(db, 'reviews', reviewId);
        await updateDoc(docRef, {
          status: 'approved',
          isApproved: true
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Unapprove / move to pending to immediately hide from public store.
   */
  async unapproveReview(reviewId: string): Promise<void> {
    if (!reviewId) return;
    if (db && !reviewId.startsWith('rev-default-')) {
      try {
        const docRef = doc(db, 'reviews', reviewId);
        await updateDoc(docRef, {
          status: 'pending',
          isApproved: false
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Permanently delete a review document.
   */
  async deleteReview(reviewId: string): Promise<void> {
    if (!reviewId) return;
    if (db && !reviewId.startsWith('rev-default-')) {
      try {
        const docRef = doc(db, 'reviews', reviewId);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Reply to a review as Store Admin.
   */
  async replyToReview(reviewId: string, replyText: string): Promise<void> {
    if (!reviewId) return;
    if (db && !reviewId.startsWith('rev-default-')) {
      try {
        const docRef = doc(db, 'reviews', reviewId);
        await updateDoc(docRef, {
          reply: replyText.trim(),
          adminReply: replyText.trim()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * Save / update review details (author, content, category, status, reply).
   */
  async updateReview(reviewId: string, updates: Partial<ReviewItem>): Promise<void> {
    if (!reviewId) return;
    if (db && !reviewId.startsWith('rev-default-')) {
      try {
        const docRef = doc(db, 'reviews', reviewId);
        await updateDoc(docRef, {
          ...updates,
          status: updates.isApproved === true ? 'approved' : updates.status || (updates.isApproved === false ? 'pending' : undefined)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
        throw err;
      }
    }
  },

  /**
   * User submits a new review (starts as pending by default).
   */
  async submitUserReview(review: { authorName: string; content: string; category?: 'پیشنهاد' | 'انتقاد' | 'نظر' }): Promise<ReviewItem> {
    const newRev: ReviewItem = {
      id: 'rev-' + Date.now(),
      authorName: review.authorName.trim() || 'کاربر میهمان',
      content: review.content.trim(),
      createdAt: 'هم‌اکنون',
      likes: 0,
      dislikes: 0,
      category: review.category || (review.content.includes('پیشنهاد') ? 'پیشنهاد' : review.content.includes('انتقاد') ? 'انتقاد' : 'نظر'),
      isApproved: false,
      status: 'pending',
      timestamp: Date.now()
    };

    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'reviews'), {
          ...newRev,
          createdAt: new Date().toISOString()
        });
        newRev.id = docRef.id;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'reviews');
      }
    }

    return newRev;
  },

  /**
   * Like a review item.
   */
  async likeReview(reviewId: string, currentLikes: number): Promise<void> {
    if (!reviewId) return;
    if (db && !reviewId.startsWith('rev-default-')) {
      try {
        const docRef = doc(db, 'reviews', reviewId);
        await updateDoc(docRef, {
          likes: currentLikes + 1
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
      }
    }
  },

  getCachedReviews(): ReviewItem[] {
    if (typeof window === 'undefined') return DEFAULT_PUBLIC_REVIEWS;
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
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
    } catch (_e) {}
  }
};
