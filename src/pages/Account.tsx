import React from 'react';
import { CustomerAccountView } from '../components/CustomerAccountView';
import type { User, Order } from '../types';

export interface AccountProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onLoginSuccess?: (user: User) => void;
  onPayPendingOrder?: (order: Order) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

/**
 * Account Page:
 * Enables phone-linked automated order binding and live tracking.
 * When authenticated, queries all orders matching customerPhone == userPhone (descending).
 */
export const Account: React.FC<AccountProps> = (props) => {
  return <CustomerAccountView {...props} />;
};

export default Account;
