import React, { ReactNode } from 'react';
import { Header } from '../components/Header';
import { FloatingSupportWidget } from '../components/common/FloatingSupportWidget';

export interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] dark:bg-zinc-950 text-slate-900 dark:text-white font-['Vazirmatn',sans-serif]">
      {children}
      <FloatingSupportWidget />
    </div>
  );
};

export default MainLayout;
