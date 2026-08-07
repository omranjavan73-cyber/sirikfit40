export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  createdAt: string;
}

export interface FinancialSettings {
  aedRate: number; // e.g., 19500 Tomans per AED (Active Rate)
  manualAedRate?: number; // Manual override rate
  autoUpdateRates?: boolean; // Enable automatic API fetch switch
  currencyApiUrl?: string; // Rate API endpoint
  cargoRatePerKg: number; // e.g., 35 AED per KG
  profitMargin: number; // e.g., 15 (%)
  minOrderAed?: number; // Minimum cart order in AED (e.g., 200)
}

export interface StoreCardItem {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  url: string;
  image: string;
  badge?: string;
  enabled?: boolean;
  active?: boolean;
  samplePriceAed?: number;
  sampleWeightKg?: number;
}

export interface FeaturedDeal {
  id: string;
  title: string;
  brand?: string;
  category: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg?: number;
  image?: string;
  url: string;
  storeName?: string;
  badge?: string;
  section?: 'featured' | 'bestseller' | 'discount';
  isFeaturedInCalculator?: boolean;
  isActive: boolean;
}

export interface LocalInventoryItem {
  id: string;
  title: string;
  image: string;
  priceToman: number;
  originalPriceToman?: number;
  stockQuantity: number;
  category: string;
  description?: string;
  deliveryBadge?: string;
  inStock: boolean;
}

export interface HomePageSettings {
  topPromoText: string;
  showTopPromo: boolean;
  appTitle: string;
  appSubtitle: string;
  brandTitle?: string;
  brandSubtitle?: string;
  logoUrl?: string;
  calcBlackBadge: string;
  calcMainHeadline: string;
  calcSubtitle: string;
  calcScheduleBadge: string;
  telegramHandle: string;
  telegramLink: string;
  whatsappPhone?: string;
  whatsappLink?: string;
  officePhone: string;
  dubaiPhone?: string;
  showDubaiPhone?: boolean;
  showWhatsappCard?: boolean;
  telegramBotToken?: string;
  adminChatId?: string;
  telegramNotifyEnabled?: boolean;
  adminDestinationEmail?: string;
  emailNotifyEnabled?: boolean;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  resendApiKey?: string;
  supportHeadline: string;
  supportSubtitle: string;
  showSupportSection: boolean;
  showTelegramCard?: boolean;
  telegramTitle?: string;
  showEmailCard?: boolean;
  emailTitle?: string;
  showPhoneCard?: boolean;
  phoneTitle?: string;
  trustBadge1: string;
  trustBadge2: string;
  trustBadge3: string;
  headerPillSlogan?: string;
  heroMainHeadline?: string;
  heroHighlightWord?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
}

export type GatewayProvider = 'zarinpal' | 'zibal' | 'nextpay' | 'idpay' | 'card_to_card';

export interface PaymentGatewayConfig {
  activeGateway: GatewayProvider;
  merchantId: string;
  callbackUrl: string;
  isSandbox: boolean;
  cardToCard: {
    cardNumber: string;
    bankName: string;
    cardholderName: string;
    shabaNumber?: string;
  };
}

export interface GatewayProviderConfig {
  activeGateway: GatewayProvider;
  merchantId: string;
  callbackUrl: string;
  isSandbox: boolean;
  cardToCard: {
    cardNumber: string;
    bankName: string;
    cardholderName: string;
    shabaNumber?: string;
  };
}

export interface CommissionRule {
  id: string;
  minAmountAed: number;
  maxAmountAed: number | null; // null means 'Above' max
  commissionPercent: number;
  isEnabled: boolean;
}

export interface ShippingIncrementRule {
  id: string;
  itemNumber: number; // e.g. 2 for 2nd item, 3 for 3rd item
  additionalCostAed: number;
  isEnabled: boolean;
}

export interface PricingRulesConfig {
  baseCommission: {
    percentage: number;
    isEnabled: boolean;
  };
  commissionRules: CommissionRule[];
  shippingConfig: {
    baseShippingCostAed: number;
    minShippingCostAed: number;
    maxShippingCostAed: number;
  };
  shippingIncrementRules: ShippingIncrementRule[];
}

export interface WarehouseCategory {
  id: string;
  label: string;
  iconUrl?: string;
  filterKey: string;
}

export interface CmsConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroNotice: string;
  heroImage: string;
  showAnnouncementBanner?: boolean;
  announcementText?: string;
  announcementBadge?: string;
  announcementSlogans?: string[];
  stores: StoreCardItem[];
  deals?: FeaturedDeal[];
  showLocalInventory?: boolean;
  warehouseBannerTitle?: string;
  warehouseBannerSubtitle?: string;
  warehouseBannerTheme?: 'light' | 'dark' | 'emerald' | 'amber';
  warehouseBannerButtonText?: string;
  localInventory?: LocalInventoryItem[];
  warehouseCategories?: WarehouseCategory[];
  homeContent?: HomePageSettings;
  paymentGateway?: PaymentGatewayConfig;
  pricingRules?: PricingRulesConfig;
  apiConfig: {
    currencyApiUrl: string;
    autoUpdateRates: boolean;
    scraperEndpoint: string;
    geminiApiKey: string;
    geminiApiKey1?: string;
    geminiApiKey2?: string;
    geminiApiKey3?: string;
    geminiApiKeys?: string[];
    telegramBotToken?: string;
    adminChatId?: string;
    telegramNotifyEnabled?: boolean;
    adminDestinationEmail?: string;
    emailNotifyEnabled?: boolean;
    emailjsServiceId?: string;
    emailjsTemplateId?: string;
    emailjsPublicKey?: string;
    resendApiKey?: string;
    allowedDomains?: string[];
    enableDomainRestriction?: boolean;
    scraperApiKey?: string;
    enableScraperApi?: boolean;
  };
}

export type PaymentStatus = 'PAID' | 'PENDING' | 'FAILED';
export type ShippingStatus = 
  | 'PENDING_BUY' 
  | 'PURCHASED' 
  | 'DUBAI_WAREHOUSE' 
  | 'SHIPPED_IRAN' 
  | 'COMPLETED' 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'SHIPPED' 
  | 'DELIVERED';

export interface Order {
  id: string;
  userId?: string;
  trackingCode: string;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  notes?: string;
  productTitle: string;
  productUrl: string;
  productImage?: string;
  storeName?: string;
  priceAed: number;
  weightKg: number;
  aedRate: number;
  cargoRatePerKg: number;
  profitMargin: number;
  calculatedToman: number;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  createdAt: string;
  paymentRefId?: string;
  selectedOption?: string;
}

export interface ParsedProduct {
  title: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  weightKg: number;
  image?: string;
  galleryImages?: string[];
  storeName: string;
  category?: string;
  brand?: string;
  options?: string[];
  description?: string;
  aiExtracted?: boolean;
  fallback?: boolean;
}

export interface CartItem {
  id: string;
  title: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  weightKg: number;
  image?: string;
  storeName?: string;
  calculatedToman?: number;
  quantity: number;
  category?: string;
  brand?: string;
  selectedOption?: string;
  options?: string[];
  description?: string;
}

export type TabType = 'main' | 'inventory' | 'deals' | 'account' | 'admin' | 'detail' | 'cart';
