import type { CustomerAuthMode, PaymentProvider } from '@sharon/shared';

export interface OutletDbRow {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  image_url?: string | null;
  operating_hours: string;
  is_active: boolean;
  is_ordering_enabled: boolean;
  customer_auth_mode: CustomerAuthMode;
  require_customer_phone: boolean;
  require_customer_name: boolean;
  payment_provider: PaymentProvider;
  demo_auto_verify_payment: boolean;
  upi_vpa: string;
  upi_payee_name: string;
  estimated_prep_time_minutes: number;
  created_at: Date;
  updated_at: Date;
}
