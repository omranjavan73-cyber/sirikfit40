import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AdminPanel } from './components/AdminPanel';
import { PaymentModal } from './components/PaymentModal';
import { AuthModal } from './components/AuthModal';
import { FinancialSettings, CmsConfig, CartItem } from './types';
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
      <Header
        aedRate={settings.aedRate}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => {}}
        onOpenAdmin={() => setActiveTab('admin')}
        onOpenAuth={() => setIsAuthOpen(true)}
        user={user}
      />

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
            {heroBannerUrl ? (
              <div className="rounded-3xl overflow-hidden shadow-md border border-slate-200">
                <img
                  src={heroBannerUrl}
                  alt="SIRIK FIT Banner"
                  className="w-full h-48 sm:h-64 object-cover"
                />
              </div>
            ) : (
              <div className="bg-slate-900 text-white rounded-3xl p-8 text-center space-y-3 shadow-lg">
                <h1 className="text-2xl font-black text-amber-400">فروشگاه تخصصی مکمل‌های ورزشی SIRIK FIT</h1>
                <p className="text-xs text-slate-300">ارسال مستقیم بهترین برندهای مکمل ورزشی و اورجینال</p>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center space-y-4">
              <h2 className="text-base font-extrabold text-slate-900">به سامانه SIRIK FIT خوش آمدید</h2>
              <p className="text-xs text-slate-500">
                جهت مدیریت محصولات، نرخ درهم، تنظیمات دیتابیس و پشتیبان‌گیری، روی لوگوی SIRIK FIT در هدر کلیک کنید.
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