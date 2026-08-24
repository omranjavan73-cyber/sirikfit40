import React from 'react';
import { PaymentReceipt } from '../components/PaymentReceipt';

export const PaymentReceiptPage: React.FC = () => {
  return (
    <PaymentReceipt
      onNavigateHome={() => {
        window.location.href = '/';
      }}
      onNavigateAccount={() => {
        window.location.href = '/?tab=account';
      }}
    />
  );
};

export default PaymentReceiptPage;
