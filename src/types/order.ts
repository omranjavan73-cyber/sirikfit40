import type { PaymentStatus, ShippingStatus } from '../types';

export type { PaymentStatus, ShippingStatus };

export interface OrderItem {
  id: string;
  title: string;
  variant?: string;
  quantity: number;
  priceToman: number;
  priceAED?: number;
  imageUrl?: string;
  sourceUrl?: string;
  [key: string]: any;
}

export interface CustomerDetails {
  fullName: string;
  phone: string;
  postalCode: string;
  fullAddress: string;
  notes?: string;
  [key: string]: any;
}

export interface Order {
  id: string;
  orderId?: string;
  orderNumber?: string;
  trackingCode: string;
  userId?: string;
  customerName: string;
  phoneNumber: string;
  customerPhone: string; // Standardized normalized 11-digit mobile (e.g. 09121234567)
  deliveryAddress: string;
  shippingAddress?: string;
  postalCode?: string;
  notes?: string;
  productTitle: string;
  productUrl: string;
  productImage?: string;
  storeName?: string;
  priceAed: number;
  weightKg: number;
  aedRate?: number;
  cargoRatePerKg?: number;
  profitMargin?: number;
  calculatedToman: number;
  totalToman?: number;
  totalAmountToman?: number;
  totalPrice?: number;
  paymentStatus: PaymentStatus | string;
  shippingStatus: ShippingStatus | string;
  orderStatus?: string;
  status?: string;
  paymentMethod?: string;
  items: OrderItem[];
  customer?: CustomerDetails;
  createdAt: string | number;
  updatedAt?: string | number;
  paymentRefId?: string;
  paymentRefNumber?: string;
  trackId?: string;
  paidAt?: string;
  paymentGateway?: string;
  gateway?: string;
  selectedOption?: string;
  discountCode?: string;
  discountAmountToman?: number;
  isLocalInventory?: boolean;
  [key: string]: any;
}
