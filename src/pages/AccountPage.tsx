import React from 'react';
import { CustomerAccountView } from '../components/CustomerAccountView';
import { User, Order } from '../types';

interface AccountPageProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onLoginSuccess?: (user: User) => void;
  onPayPendingOrder?: (order: Order) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const AccountPage: React.FC<AccountPageProps> = (props) => {
  return <CustomerAccountView {...props} />;
};

export default AccountPage;
