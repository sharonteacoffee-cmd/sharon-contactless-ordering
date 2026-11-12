import type {
  ContactlessOrder,
  CustomerAuthMode,
  MenuSyncMode,
  MenuSyncPreviewResult,
  MenuSyncResult,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  StaffRole,
} from '@sharon/shared';

export type { MenuSyncMode, MenuSyncPreviewResult, MenuSyncResult };

export interface StaffUser {
  userId: string;
  businessId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  outletId: string | null;
  outletBusinessId: string | null;
  outletName: string | null;
  outletSlug: string | null;
}

export interface AuthLoginData {
  accessToken: string;
  user: StaffUser;
}

export interface OutletConfig {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  operatingHours: string;
  isActive: boolean;
  isOrderingEnabled: boolean;
  customerAuthMode: CustomerAuthMode;
  requireCustomerPhone: boolean;
  requireCustomerName: boolean;
  paymentProvider: PaymentProvider;
  demoAutoVerifyPayment: boolean;
  upiVpa: string;
  upiPayeeName: string;
  estimatedPrepTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface OutletStockItem {
  menuItemId: string;
  externalMainId?: string | null;
  categorySlug: string;
  categoryName?: string;
  name: string;
  slug: string;
  basePrice: number;
  customPrice: number | null;
  effectivePrice: number;
  imageUrl: string | null;
  isVegetarian?: boolean;
  isBestseller?: boolean;
  isAvailable: boolean;
  updatedAt: string;
}

export interface MenuSyncLog {
  id?: string;
  businessId: string;
  syncedBy?: string | null;
  syncedByName?: string | null;
  itemsSynced: number;
  sourceUrl: string;
  status: string;
  createdAt: string;
}

export interface QrCodeRecord {
  id?: string;
  businessId: string;
  outletId?: string;
  outletBusinessId: string;
  outletName: string;
  outletSlug: string;
  qrToken: string;
  qrUrl?: string;
  label: string;
  isActive: boolean;
  scansCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderHistoryFilters {
  page: number;
  limit: number;
  outletBusinessId?: string | null;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
}

export interface OrderHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OrderHistoryResponse {
  items: ContactlessOrder[];
  pagination: OrderHistoryPagination;
}
