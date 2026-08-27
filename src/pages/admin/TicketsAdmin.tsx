import React from 'react';
import { AdminSupportTickets } from '../../components/AdminSupportTickets';

interface TicketsAdminProps {
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const TicketsAdmin: React.FC<TicketsAdminProps> = ({ showToast }) => {
  return <AdminSupportTickets showToast={showToast} />;
};

export default TicketsAdmin;
