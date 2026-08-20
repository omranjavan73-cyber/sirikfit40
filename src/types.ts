export interface ProductVariantItem {
  id: string;
  title: string;        // e.g. "120 Servings" or "Chocolate / 5 lbs"
  size?: string;
  flavor?: string;
  name?: string;
  url?: string;         // Sibling product URL for URL-based variant stores (e.g. Dr. Nutrition)
  priceAED: number;     // Variant-specific price
  priceAed?: number;
  originalPriceAED?: number;
  originalPriceAed?: number;
  priceToman?: number;
  weightKg?: number;
  image?: string;
  imageThumbnail?: string;
  inStock: boolean;
}

export interface ProductVariantMatrix {
  sizes: string[];      // e.g., ["1 kg", "1.8 kg", "5 lbs", "32 Servings"]
  flavors: string[];    // e.g., ["Chocolate Caramel", "Green Apple", "Vanilla"]
  items: ProductVariantItem[]; // Full matrix of options with individual pricing
  selectedVariant?: ProductVariantItem;
}

export interface NormalizedProduct {
  id: string;
  source: 'drnutrition' | 'gnc' | 'lifepharmacy' | 'generic';
  sourceUrl: string;
  canonicalUrl?: string;
  title: string;
  brand: string;
  currentPriceAED: number;
  originalPriceAED?: number;
  discountPercentage?: number;
  currency: 'AED';
  mainImage: string;
  galleryImages: string[];
  inStock: boolean;
  variants: ProductVariantMatrix;
  description: string;
  nutritionFacts?: Record<string, string>;
  ingredients?: string[];
  category?: string;
  scrapedAt: string;
}

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  postalCode?: string;
  createdAt: string;
}

export interface FinancialSettings {
  aedRate: number | null; // Tomans per AED (Active Exchange Rate)
  manualAedRate?: number; // Manual override rate
  autoUpdateRates?: boolean; // Enable automatic API fetch switch
  currencyApiUrl?: string; // Rate API endpoint
  cargoRatePerKg: number; // e.g., 35 AED per KG
  profitMargin: number; // e.g., 15 (%)
  minOrderAed?: number; // Deprecated: Minimum cart order in AED (e.g., 200)
  minOrderAmountToman?: number; // Minimum cart order in Toman (e.g., 5000000 or 0)
  minOrderLimitEnabled?: boolean; // Whether minimum order limit is enforced
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
  categoryKey?: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg?: number;
  profitMargin?: number;
  marginPercent?: number;
  priceToman?: number;
  originalPriceToman?: number;
  stockQuantity?: number;
  stockCount?: number;
  image?: string;
  url: string;
  storeName?: string;
  badge?: string;
  deliveryBadge?: string;
  section?: 'featured' | 'bestseller' | 'discount';
  isFeaturedInCalculator?: boolean;
  isPopularSample?: boolean;
  isPopular?: boolean;
  isActive: boolean;
  inStock?: boolean;
  description?: string;
  flavors?: string[];
  sizes?: string[];
}

export interface LocalInventoryItem {
  id: string;
  title: string;
  image: string;
  priceToman: number;
  originalPriceToman?: number;
  calculatedTomanOverride?: number;
  stockQuantity: number;
  stockCount?: number;
  category: string;
  categoryKey?: string;
  description?: string;
  deliveryBadge?: string;
  inStock: boolean;
  isIranWarehouse?: boolean;
  isLocalInventory?: boolean;
  isPopularSample?: boolean;
  isPopular?: boolean;
  priceAed?: number;
  weightKg?: number;
  marginPercent?: number;
  flavors?: string[];
  sizes?: string[];
  url?: string;
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
  showFaqSection?: boolean;
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
  showEnamad?: boolean;
  showSamandehi?: boolean;
  enamadHtml?: string;
  enamadCode?: string;
  enamadUrl?: string;
  samandehiHtml?: string;
  samandehiCode?: string;
  customBadgeImg?: string;
  customBadgeLink?: string;
  supportPhone?: string;
  headerPillSlogan?: string;
  heroMainHeadline?: string;
  heroHighlightWord?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
}

export type GatewayProvider = 'zibal';

export interface PaymentGatewayConfig {
  activeGateway: 'zibal';
  zibalMerchantId: string;
  zibalSandbox: boolean;
  callbackUrl: string;
  successMessage?: string;
  merchantId?: string;
  isSandbox?: boolean;
  updatedAt?: string;
}

export interface GatewayProviderConfig extends PaymentGatewayConfig {}

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
  minOrderAmountToman?: number;
  minOrderLimitEnabled?: boolean;
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
  name?: string;
  iconUrl?: string;
  imageUrl?: string;
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
  showReviews?: boolean;
  showComments?: boolean;
  showStores?: boolean;
  showBreakdown?: boolean;
  showLocalInventory?: boolean;
  showAnnouncementBanner?: boolean;
  showSupportSection?: boolean;
  showTopPromo?: boolean;
  showTrustBadges?: boolean;
  showEnamad?: boolean;
  showSamandehi?: boolean;
  showFaqSection?: boolean;
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
  showFaqSection?: boolean;
  showTopPromo?: boolean;
  showTrustBadges?: boolean;
  showEnamad?: boolean;
  showSamandehi?: boolean;
  enamadHtml?: string;
  enamadCode?: string;
  enamadUrl?: string;
  samandehiHtml?: string;
  samandehiCode?: string;
  customBadgeImg?: string;
  customBadgeLink?: string;
  popularSamplesOrder?: string[];
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
  postalCode?: string;
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
  paymentRefNumber?: string;
  trackId?: string;
  paidAt?: string;
  paymentGateway?: string;
  paymentDetails?: any;
  paymentFailureReason?: string;
  selectedOption?: string;
  discountCode?: string;
  discountAmountToman?: number;
  isLocalInventory?: boolean;
  status?: string;
}

export interface ScrapedProductResult {
  id: string;
  title: string;
  brand?: string;
  sourceStore: string;
  sourceUrl: string;
  mainImage: string;
  galleryImages: string[]; // Array of full-res and secondary photo URLs
  videos?: string[];       // Product videos if available
  basePriceAED: number;
  calculatedPriceToman: number;
  inStock: boolean;
  variants: ProductVariantItem[];
  variantMatrix?: ProductVariantMatrix;
  variantGroups?: VariantGroupsStructure;
  features?: string[];
  description?: string;
}

export interface VariantOption {
  id: string;
  label?: string; // e.g., "Double Rich Chocolate" or "5 lbs / 2.27 kg"
  name: string;   // for backward compatibility & direct access
  nameFa?: string;
  type?: 'flavor' | 'size' | 'color' | 'general' | 'style' | 'generic';
  inStock: boolean; // Strict in-stock validation
  price?: number;
  priceAed?: number; // for backward compatibility
  priceAED?: number;
  originalPrice?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  currency?: string;
  imageUrl?: string;
  image?: string; // for backward compatibility
  sku?: string;
  url?: string;
}

export interface VariantGroupsStructure {
  flavors?: VariantOption[];
  sizes?: VariantOption[];
  others?: VariantOption[];
}

export interface ProductData {
  title: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  description: string;
  features?: string[];
  images: string[];
  videos?: string[];
  variantGroups: VariantGroupsStructure;
  isAvailable: boolean;
  sourceUrl: string;
}

export interface VariantDimension {
  id: string;
  name: string;
  type: 'flavor' | 'size' | 'color' | 'style' | 'generic';
  options: VariantOption[];
}

export interface UniversalProduct {
  title: string;
  titleFa?: string;
  titleEn?: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg: number;
  image: string;
  images: string[];
  galleryImages: string[];
  videos?: string[];
  features?: string[];
  storeName: string;
  storeOrigin?: string;
  brand?: string;
  category?: string;
  description?: string;
  descriptionFa?: string;
  dimensions?: VariantDimension[];
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  variantMatrix?: ProductVariantMatrix;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  inStock?: boolean;
  selectedVariants?: Record<string, VariantOption>;
  rawSpecs?: Record<string, string>;
}

export interface ProductVariantOption {
  id: string;
  name: string;        // e.g. "وانیل / Vanilla", "2.27 kg (5 lbs)"
  nameFa?: string;     // Persian translated or cleaned name
  priceAed?: number;   // Specific price if variant has a different price
  priceAED?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  image?: string;      // Image specific to this variant/flavor
  inStock?: boolean;
  sku?: string;
  url?: string;
}

export interface ProductVariantGroup {
  id: string;
  name: string;        // e.g. "طعم (Flavor)", "وزن / سایز (Size / Weight)", "رنگ (Color)"
  type: 'flavor' | 'size' | 'color' | 'style' | 'generic';
  options: ProductVariantOption[];
}

export interface ScrapedProduct {
  title: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg: number;
  image?: string;
  galleryImages?: string[];
  storeName: string;
  brand?: string;
  category?: string;
  description?: string;
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  variantMatrix?: ProductVariantMatrix;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  inStock?: boolean;
  selectedVariants?: Record<string, ProductVariantOption>;
}

export interface ParsedProduct {
  title: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg: number;
  image?: string;
  galleryImages?: string[];
  storeName: string;
  category?: string;
  brand?: string;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  description?: string;
  aiExtracted?: boolean;
  fallback?: boolean;
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  variantMatrix?: ProductVariantMatrix;
}

export interface ProductVariant {
  id: string;
  title?: string;
  flavor?: string; // e.g., "Green Apple", "Blue Raspberry", "Chocolate"
  size?: string;   // e.g., "50 Servings", "1 kg", "2.3 kg"
  name?: string;
  priceAed?: number;
  priceAED?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  priceToman?: number;
  inStock?: boolean;
  image?: string;
  imageThumbnail?: string;
  url?: string;
}

export interface CartItem {
  id: string;
  cartItemId?: string;
  product?: any;
  title: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg: number;
  image?: string;
  galleryImages?: string[];
  storeName?: string;
  calculatedToman?: number;
  calculatedTomanOverride?: number;
  priceToman?: number;
  quantity: number;
  category?: string;
  brand?: string;
  selectedOption?: string;
  selectedFlavor?: string;
  selectedSize?: string;
  selectedVariant?: ProductVariant | ProductVariantItem;
  selectedVariants?: Record<string, ProductVariantOption>;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  variantMatrix?: ProductVariantMatrix;
  description?: string;
  isLocalInventory?: boolean;
  isIranWarehouse?: boolean;
  isDeal?: boolean;
}

export type TabType = 'main' | 'inventory' | 'deals' | 'account' | 'admin' | 'detail' | 'cart' | 'faq' | 'receipt';

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

export type ExpenseCategory =
  | 'CARGO_MONTHLY'
  | 'PACKAGING_SUPPLIES'
  | 'SUPPLIER_PAYMENT'
  | 'DISCOUNT_REBATE'
  | 'OPERATIONAL_MISC';

export interface FinancialExpense {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  currency: 'AED' | 'TOMAN';
  amountToman: number;
  amountAed?: number;
  date: string;
  timestamp: number;
  vendorName?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface AdminSecuritySettings {
  adminPasswordHash?: string;
  adminPassword?: string;
  passwordHash?: string;
  backupEmail?: string;
  adminEmail?: string;
  recoveryEmail?: string;
  updatedAt?: string;
  lastPasswordChange?: string;
  resetToken?: string;
  resetTokenExpires?: number;
  smtpConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromEmail: string;
    secure: boolean;
  };
}

export interface PasswordResetOtpState {
  step: 'REQUEST' | 'VERIFY';
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  error?: string;
  successMessage?: string;
}

