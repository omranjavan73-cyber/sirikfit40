import React, { useState, useEffect } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { PaymentModal } from './components/PaymentModal';
import { AuthModal } from './components/AuthModal';
import { FinancialSettings, CmsConfig, CartItem, Product } from './types';
import { getSettingsFromFirestore, getCmsFromFirestore } from './firebase';

const DEFAULT_SETTINGS: FinancialSettings = {
  aedRate: 19500,
  profitMarginPercent: 15,
  shippingPerKgAed: 10,
  customsTaxPercent: 5,
  packingFeeToman: 50000,
  fixedShippingToman: 100000
};

export default function App() {
  const [settings, setSettings] = useState<FinancialSettings>(DEFAULT_SETTINGS);
  const [cms, setCms] = useState<CmsConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'admin'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadFirestoreData = async () => {
      try {
        const dbSettings = await getSettingsFromFirestore();
        if (dbSettings) setSettings(dbSettings);

        const dbCms = await getCmsFromFirestore();
        if (dbCms) setCms(dbCms);
      } catch (error) {
        console.error('Firestore load error:', error);
      }
    };

    loadFirestoreData();
  }, []);

  const heroBannerUrl = cms?.homeContent?.heroImageUrl || cms?.heroImage;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-['Vazirmatn',sans-serif] pb-24 dir-rtl">
      {/* هدر ساده و سبک */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setActiveTab(activeTab === 'admin' ? 'home' : 'admin')}
          >
            <span className="font-black text-xl text-slate-900 tracking-tight">SIRIK FIT</span>
            <span className="text-[10px] bg-slate-900 text-amber-400 px-2 py-0.5 rounded-full font-bold">PRO</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border">
              نرخ درهم: {settings.aedRate.toLocaleString('fa-IR')} تومان
            </span>
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="bg-slate-900 text-white px-3.5 py-1.5 rounded-xl"
            >
              {user ? 'حساب کاربری' : 'ورود / ثبت‌نام'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'admin' ? (
          <AdminPanel
            settings={settings}
            onUpdateSettings={setSettings}
            cms={cms}
            onUpdateCms={setCms}
          />
        ) : (
          <div className="space-y-6">
            {heroBannerUrl && (
              <div className="rounded-3xl overflow-hidden shadow-md border border-slate-200">
                <img
                  src={heroBannerUrl}
                  alt="SIRIK FIT Banner"
                  className="w-full h-48 sm:h-64 object-cover"
                />
              </div>
            )}

            <div className="bg-white border rounded-3xl p-6 text-center space-y-3">
              <h2 className="text-lg font-black text-slate-900">فروشگاه آنلاین مکمل‌های ورزشی SIRIK FIT</h2>
              <p className="text-xs text-slate-500 font-medium">
                جهت دسترسی به پنل مدیریت، روی برند SIRIK FIT در بالابار کلیک کنید.
              </p>
            </div>
          </div>
        )}
      </main>

      {isPaymentOpen && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          cart={cart}
          settings={settings}
          cms={cms}
          onSuccess={() => setCart([])}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onUserChange={setUser}
        />
      )}
    </div>
  );
}