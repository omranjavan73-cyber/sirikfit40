import React from 'react';
import { CustomerAccountView } from './CustomerAccountView';
import type { User, Order } from '../types';

interface OrderHistoryViewProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onPayPendingOrder?: (order: Order) => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = (props) => {
  return (
    <CustomerAccountView
      currentUser={props.currentUser}
      onOpenAuthModal={props.onOpenAuthModal}
      onLogout={() => {}}
      onPayPendingOrder={props.onPayPendingOrder}
    />
  );
};
