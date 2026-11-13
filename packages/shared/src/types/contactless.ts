export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PAYMENT_PENDING'
  | 'UPI_CLAIMED_DEMO'
  | 'PAID_VERIFIED'
  | 'REFUNDED';

export type PaymentProvider = 'DEMO_UPI_INTENT' | 'RAZORPAY' | 'CASHFREE';

export type PaymentMethod = 'UPI' | 'CASH' | 'ONLINE';

export type CustomerAuthMode = 'DIRECT_GUEST' | 'OTP_VERIFIED';

export type StaffRole = 'MD' | 'OUTLET_STAFF';

/**
 * Sanitized public outlet DTO (strictly excludes UPI VPA, PG keys, and internal operational flags).
 */
export interface OutletPublicInfo {
  businessId: string;
  name: string;
  slug: string;
  address: string;
  imageUrl?: string | null;
  operatingHours: string;
  isOrderingEnabled: boolean;
  customerAuthMode: CustomerAuthMode;
  requireCustomerPhone: boolean;
  requireCustomerName: boolean;
  paymentProvider: PaymentProvider;
  estimatedPrepTimeMinutes: number;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface PublicMenuItem {
  id: string;
  categorySlug: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isBestseller: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  priceExtra: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  displayType: 'RADIO' | 'CHECKBOX';
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  sortOrder: number;
  options: ModifierOption[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceExtra: number;
}

/**
 * Client-submitted order line item payload (prices are never accepted from clients).
 */
export interface OrderItemPayload {
  menuItemId: string;
  quantity: number;
  selectedModifierOptionIds: string[];
}

/**
 * Server-resolved immutable order line item stored inside orders.items JSONB.
 */
export interface OrderLineItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiersTotal: number;
  lineTotal: number;
  selectedModifiers: SelectedModifier[];
}

export interface UpiPayload {
  upiUri: string;
  payeeName: string;
  amountFormatted: string;
}

export interface ContactlessOrder {
  id: string;
  orderBusinessId: string;
  paymentTransactionId: string | null;
  orderNumber: string;
  outletId: string;
  outletBusinessId?: string;
  outletName?: string;
  customerName: string;
  customerPhone: string;
  tableOrToken: string | null;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentProvider: PaymentProvider;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  orderStatus: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sanitized customer-facing order tracking DTO (masks phone number and strips internal fields).
 */
export interface OrderTrackingInfo {
  orderBusinessId: string;
  orderNumber: string;
  outletBusinessId: string;
  outletName: string;
  outletSlug: string;
  customerName: string;
  maskedCustomerPhone: string;
  tableOrToken: string | null;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  upiPayload?: UpiPayload;
  estimatedPrepTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
  timestampUtc: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  timestampUtc: string;
}

export interface OrderNewSocketEvent {
  outletId: string;
  outletBusinessId: string;
  orderBusinessId: string;
  orderNumber: string;
  customerName: string;
  tableOrToken: string | null;
  items: OrderLineItem[];
  totalAmount: number;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  notes: string | null;
  createdAt: string;
}

export interface OrderStatusUpdatedSocketEvent {
  outletId: string;
  orderBusinessId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  updatedAt: string;
}

export interface OrderPaymentVerifiedSocketEvent {
  outletId: string;
  orderBusinessId: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentReference: string | null;
  verifiedAt: string;
}

export interface OutletStockChangedSocketEvent {
  outletId: string;
  outletSlug: string;
  menuItemId: string;
  isAvailable: boolean;
  customPrice: number | null;
  updatedAt: string;
}

export interface SocketEventPayloads {
  'order:new': OrderNewSocketEvent;
  'order:status_updated': OrderStatusUpdatedSocketEvent;
  'order:payment_verified': OrderPaymentVerifiedSocketEvent;
  'outlet:stock_changed': OutletStockChangedSocketEvent;
}

export interface SocketServerToClientEvents {
  'order:new': (payload: OrderNewSocketEvent) => void;
  'order:status_updated': (payload: OrderStatusUpdatedSocketEvent) => void;
  'order:payment_verified': (payload: OrderPaymentVerifiedSocketEvent) => void;
  'outlet:stock_changed': (payload: OutletStockChangedSocketEvent) => void;
}

export interface ManagedUserRecord {
  businessId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  outletBusinessId: string | null;
  outletName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLookupResult {
  found: boolean;
  fullName: string | null;
}

export interface CustomerProfileDto {
  businessId: string;
  fullName: string;
  phone: string;
  maskedPhone: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderHistoryItem {
  orderBusinessId: string;
  orderNumber: string;
  outletBusinessId: string;
  outletName: string;
  outletSlug: string;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
}

export interface CustomerLoginResult {
  customerAccessToken: string;
  expiresInSeconds: number;
  customer: CustomerProfileDto;
}

export interface SendCustomerLoginOtpResult {
  expiresInSeconds: number;
  devOtpPreview?: string;
}

export type MenuSyncMode = 'REPLACE_ALL' | 'KEEP_EXISTING';

export interface MenuSyncPreviewChange {
  localName: string;
  upstreamName: string;
  localSlug: string;
  upstreamSlug: string;
  localPrice: number;
  upstreamPrice: number;
  imageChanged: boolean;
  categorySlug: string;
}

export interface MenuSyncPreviewStaleItem {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  price: number;
  imageUrl: string | null;
}

export interface MenuSyncPreviewResult {
  sourceUrl: string;
  upstreamCount: number;
  categoriesCount: number;
  localTotalCount: number;
  matchedCount: number;
  newCount: number;
  mismatchCount: number;
  staleCount: number;
  duplicateCount: number;
  changedItems: MenuSyncPreviewChange[];
  staleItems: MenuSyncPreviewStaleItem[];
  checkedAt: string;
}

export interface MenuSyncResult {
  syncBusinessId: string;
  syncMode: MenuSyncMode;
  itemsSynced: number;
  categoriesSynced: number;
  insertedCount: number;
  updatedCount: number;
  deletedCount: number;
  deduplicatedCount: number;
  sourceUrl: string;
  status: string;
  syncedAt: string;
}

export type PushTargetRole = 'CUSTOMER' | 'STAFF';

export interface RegisterPushTokenResult {
  tokenBusinessId: string;
  targetRole: PushTargetRole;
  fcmConfigured: boolean;
  registeredAt: string;
}

export interface PushNotificationStatus {
  fcmConfigured: boolean;
  activeDeviceCount: number;
}

export interface UploadResult {
  url: string;
  key?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
}

export interface MasterMenuItemRecord {
  id: string;
  externalMainId: string | null;
  categorySlug: string;
  categoryName?: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isBestseller: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategoryRecord {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}
