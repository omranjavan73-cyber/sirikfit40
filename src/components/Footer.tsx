import React from 'react';
import { TrustBadgesSection } from './TrustBadgesSection';
import type { CmsConfig } from '../types';

interface FooterProps {
  cms?: CmsConfig | null;
  settings?: any;
}

export const Footer: React.FC<FooterProps> = ({ cms, settings }) => {
  return (
    <footer id="main-footer" className="w-full mt-10 mb-6 px-4 max-w-7xl mx-auto">
      <TrustBadgesSection cms={cms} settings={settings} />
    </footer>
  );
};
