import type {
  ModifierGroup,
  OrderStatus,
  OutletPublicInfo,
  PaymentProvider,
  PaymentStatus,
  PublicMenuCategory,
  PublicMenuItem,
  SelectedModifier,
  UpiPayload,
} from '@sharon/shared';

export interface PublicMenuResponse {
  outlet?: OutletPublicInfo;
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
  modifierGroups: ModifierGroup[];
  upsellItems?: PublicMenuItem[];
}

export interface CreatePublicOrderResponse {
  orderBusinessId: string;
  orderNumber: string;
  paymentTransactionId: string | null;
  outletName: string;
  totalAmount: number;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  upiPayload?: UpiPayload;
  gatewayOrderId?: string;
  paymentSessionId?: string;
  createdAt: string;
}

export interface SubmitDemoPaymentResponse {
  orderBusinessId: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  updatedAt: string;
}

export interface SendCustomerOtpResponse {
  expiresInSeconds: number;
  devOtpPreview?: string;
}

export interface VerifyCustomerOtpResponse {
  otpVerificationToken: string;
  expiresInSeconds: number;
}

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  itemNote?: string;
}

export interface CustomerProfile {
  customerName: string;
  customerPhone: string;
  otpVerificationToken?: string;
}
