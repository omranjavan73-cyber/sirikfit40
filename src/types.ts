export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  createdAt: string;
}

export interface FinancialSettings {
  aedRate: number | null; // Tomans per AED (Active Exchange Rate)
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
  subtitle?: string;
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
  isPopularSample?: boolean;
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
  isPopularSample?: boolean;
  priceAed?: number;
  weightKg?: number;
  marginPercent?: number;
  flavors?: string[];
  sizes?: string[];
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
  showTrustBadges?: boolean;
  enamadHtml?: string;
  samandehiHtml?: string;
  customBadgeImg?: string;
  customBadgeLink?: string;
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
  englishLabel?: string;
  isPinned?: boolean;
}

export interface HomeBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  title?: string;
  enabled?: boolean;
}

export interface DomainItem {
  domain: string;
  enabled: boolean;
}

export interface FeatureToggles {
  showReviews: boolean;
  showComments?: boolean;
  showStores: boolean;
  showBreakdown: boolean;
  showLocalInventory: boolean;
  showAnnouncementBanner: boolean;
  showSupportSection: boolean;
  showTopPromo: boolean;
  showTrustBadges?: boolean;
}

export interface CmsConfig {
  features?: FeatureToggles;
  heroTitle: string;
  heroSubtitle: string;
  heroNotice: string;
  heroImage: string;
  showAnnouncementBanner?: boolean;
  showPriceBreakdown?: boolean;
  showBreakdown?: boolean;
  showReviewsSection?: boolean;
  showReviews?: boolean;
  showComments?: boolean;
  showStores?: boolean;
  showSupportSection?: boolean;
  showTopPromo?: boolean;
  showTrustBadges?: boolean;
  enamadHtml?: string;
  samandehiHtml?: string;
  customBadgeImg?: string;
  customBadgeLink?: string;
  announcementText?: string;
  announcementBadge?: string;
  announcementSlogans?: string[];
  homeBanners?: HomeBanner[];
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
    domainItems?: DomainItem[];
    enableDomainRestriction?: boolean;
    scraperApiKey?: string;
    enableScraperApi?: boolean;
    puppeteerScraperUrl?: string;
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

export interface DiscountCode {
  id: string;
  code: string;                 // e.g. "OFF10", "OMRAN2026" (uppercase, trimmed)
  type: 'percent' | 'fixed';     // Percentage or Fixed Toman amount
  value: number;                // e.g. 15 for 15% OR 200000 for 200k Toman
  minOrderToman?: number;       // Optional minimum order criteria
  maxDiscountToman?: number;    // Optional ceiling for percentage discounts
  usageLimit?: number;          // Max total uses allowed (e.g. 100)
  usedCount: number;            // Current number of redemptions
  expiryDate?: string;          // ISO string date or YYYY-MM-DD
  isActive: boolean;            // Active status toggle
  applicableSection?: 'ALL' | 'IRAN_WAREHOUSE' | 'OFFERS'; // Section Scope: ALL, IRAN_WAREHOUSE, or OFFERS
  createdAt: number;
}

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
  discountCode?: string;
  discountAmountToman?: number;
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
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  flavor?: string; // e.g., "Green Apple", "Blue Raspberry", "Chocolate"
  size?: string;   // e.g., "50 Servings", "1 kg", "2.3 kg"
  priceAed?: number;
  priceToman?: number;
  inStock?: boolean;
}

export interface CartItem {
  id: string;
  cartItemId?: string;
  product?: any;
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
  selectedFlavor?: string;
  selectedSize?: string;
  selectedVariant?: ProductVariant;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  description?: string;
  isLocalInventory?: boolean;
  isDeal?: boolean;
}

export type TabType = 'main' | 'inventory' | 'deals' | 'account' | 'admin' | 'detail' | 'cart';

export interface TicketMessage {
  id: string;
  senderRole: 'user' | 'admin';
  senderName: string;
  message: string;
  createdAt: string;
  timestamp: number;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  subject: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'REPLIED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}
