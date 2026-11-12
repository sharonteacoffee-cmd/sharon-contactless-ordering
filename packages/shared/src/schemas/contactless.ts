import { z } from 'zod';

const indianMobileRegex = /^[6-9]\d{9}$/;

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(indianMobileRegex, 'Expected 10-digit Indian mobile number');

export const orderStatusSchema = z.enum([
  'RECEIVED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
]);

export const paymentStatusSchema = z.enum([
  'PAYMENT_PENDING',
  'UPI_CLAIMED_DEMO',
  'PAID_VERIFIED',
  'REFUNDED',
]);

export const paymentProviderSchema = z.enum([
  'DEMO_UPI_INTENT',
  'RAZORPAY',
  'CASHFREE',
]);

export const customerAuthModeSchema = z.enum([
  'DIRECT_GUEST',
  'OTP_VERIFIED',
]);

export const orderItemPayloadSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.number().int().min(1, 'Minimum quantity is 1').max(50, 'Maximum quantity per item is 50'),
  selectedModifierOptionIds: z.array(z.string().uuid('Invalid modifier option ID')).default([]),
});

export const createPublicOrderSchema = z.object({
  outletSlug: z.string().trim().min(1, 'Outlet slug is required').max(255),
  customerName: z.string().trim().min(1, 'Customer name is required').max(255).optional(),
  customerPhone: z
    .string()
    .trim()
    .regex(indianMobileRegex, 'Expected 10-digit Indian mobile number')
    .optional(),
  tableOrToken: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  otpVerificationToken: z.string().trim().min(1).optional(),
  items: z
    .array(orderItemPayloadSchema)
    .min(1, 'Order must contain at least one item')
    .max(50, 'Maximum 50 line items per order'),
});

export const submitDemoPaymentSchema = z.object({
  upiReturnDelayMs: z.number().int().min(0).max(60000).optional(),
  customerConfirmedPaid: z.literal(true, {
    errorMap: () => ({ message: 'Customer payment confirmation is required' }),
  }),
});

export const sendCustomerOtpSchema = z.object({
  outletSlug: z.string().trim().min(1, 'Outlet slug is required').max(255),
  customerPhone: z
    .string()
    .trim()
    .regex(indianMobileRegex, 'Expected 10-digit Indian mobile number'),
});

export const verifyCustomerOtpSchema = z.object({
  outletSlug: z.string().trim().min(1, 'Outlet slug is required').max(255),
  customerPhone: z
    .string()
    .trim()
    .regex(indianMobileRegex, 'Expected 10-digit Indian mobile number'),
  otpCode: z.string().trim().regex(/^\d{4,6}$/, 'OTP must be 4 to 6 digits'),
});

export const staffLoginSchema = z.object({
  email: z.string().trim().email('Valid email address is required').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(255),
});

export const toggleStockSchema = z.object({
  isAvailable: z.boolean(),
  customPrice: z.number().nonnegative('Custom price cannot be negative').max(100000).nullable().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: orderStatusSchema,
  notes: z.string().trim().max(500).optional(),
});

export const verifyPaymentSchema = z.object({
  paymentReference: z.string().trim().min(1).max(255).optional(),
  startPreparingImmediately: z.boolean().default(true),
});

export const generateQrSchema = z.object({
  outletBusinessId: z.string().trim().min(1, 'Outlet business ID is required').max(50),
  label: z.string().trim().min(1, 'QR label is required').max(255).default('Counter Standee'),
});

export const updateQrStatusSchema = z.object({
  isActive: z.boolean(),
  label: z.string().trim().min(1).max(255).optional(),
});

export const updateOutletSettingsSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  address: z.string().trim().min(1).max(1000).optional(),
  phone: z.string().trim().min(5).max(50).optional(),
  operatingHours: z.string().trim().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  isOrderingEnabled: z.boolean().optional(),
  customerAuthMode: customerAuthModeSchema.optional(),
  requireCustomerPhone: z.boolean().optional(),
  requireCustomerName: z.boolean().optional(),
  paymentProvider: paymentProviderSchema.optional(),
  demoAutoVerifyPayment: z.boolean().optional(),
  upiVpa: z.string().trim().min(3).max(255).optional(),
  upiPayeeName: z.string().trim().min(1).max(255).optional(),
  estimatedPrepTimeMinutes: z.number().int().min(1).max(180).optional(),
});

export const staffRoleSchema = z.enum(['OUTLET_STAFF', 'MD']);

const optionalNullableOutletBusinessIdSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  z.string().trim().min(1).max(50).nullable().optional(),
);

const optionalUpdatePasswordSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .optional(),
);

export const createUserSchema = z
  .object({
    email: z.string().trim().email('Valid email address is required').max(255),
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(120, 'Full name must be at most 120 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
    role: staffRoleSchema,
    outletBusinessId: optionalNullableOutletBusinessIdSchema,
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (
      data.role === 'OUTLET_STAFF' &&
      (!data.outletBusinessId || data.outletBusinessId.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outletBusinessId'],
        message: 'Outlet is required for outlet staff',
      });
    }
  });

export const updateUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(120, 'Full name must be at most 120 characters')
      .optional(),
    role: staffRoleSchema.optional(),
    outletBusinessId: optionalNullableOutletBusinessIdSchema,
    isActive: z.boolean().optional(),
    password: optionalUpdatePasswordSchema,
  })
  .superRefine((data, ctx) => {
    if (data.role === 'OUTLET_STAFF' && data.outletBusinessId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outletBusinessId'],
        message: 'Outlet is required for outlet staff',
      });
    }
  });

export const toggleUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const lookupCustomerByPhoneSchema = z.object({
  phone: indianPhoneSchema,
});

export const saveCustomerProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(120, 'Full name must be at most 120 characters'),
  phone: indianPhoneSchema,
});

export const sendCustomerLoginOtpSchema = z.object({
  phone: indianPhoneSchema,
});

export const verifyCustomerLoginOtpSchema = z.object({
  phone: indianPhoneSchema,
  otpCode: z.string().trim().regex(/^\d{4,6}$/, 'OTP must be 4 to 6 digits'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(120, 'Full name must be at most 120 characters')
    .optional(),
});

export const updateCustomerProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(120, 'Full name must be at most 120 characters'),
});

export const menuSyncModeSchema = z.enum(['REPLACE_ALL', 'KEEP_EXISTING']);

export const syncFromWebsiteSchema = z.object({
  syncMode: menuSyncModeSchema.default('REPLACE_ALL'),
});

export const registerCustomerPushTokenSchema = z.object({
  fcmToken: z.string().trim().min(20).max(4096),
  orderBusinessId: z.string().trim().min(5).max(50).optional(),
  outletSlug: z.string().trim().min(1).max(100).optional(),
});

export const registerStaffPushTokenSchema = z.object({
  fcmToken: z.string().trim().min(20).max(4096),
  outletBusinessId: z.string().trim().min(5).max(50).optional(),
});

export const unregisterPushTokenSchema = z.object({
  fcmToken: z.string().trim().min(20).max(4096),
});

export type CreatePublicOrderInput = z.infer<typeof createPublicOrderSchema>;
export type SubmitDemoPaymentInput = z.infer<typeof submitDemoPaymentSchema>;
export type SendCustomerOtpInput = z.infer<typeof sendCustomerOtpSchema>;
export type VerifyCustomerOtpInput = z.infer<typeof verifyCustomerOtpSchema>;
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type ToggleStockInput = z.infer<typeof toggleStockSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type GenerateQrInput = z.infer<typeof generateQrSchema>;
export type UpdateQrStatusInput = z.infer<typeof updateQrStatusSchema>;
export type UpdateOutletSettingsInput = z.infer<typeof updateOutletSettingsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>;
export type LookupCustomerByPhoneInput = z.infer<typeof lookupCustomerByPhoneSchema>;
export type SaveCustomerProfileInput = z.infer<typeof saveCustomerProfileSchema>;
export type SendCustomerLoginOtpInput = z.infer<typeof sendCustomerLoginOtpSchema>;
export type VerifyCustomerLoginOtpInput = z.infer<typeof verifyCustomerLoginOtpSchema>;
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
export type SyncFromWebsiteInput = z.infer<typeof syncFromWebsiteSchema>;
export type RegisterCustomerPushTokenInput = z.infer<typeof registerCustomerPushTokenSchema>;
export type RegisterStaffPushTokenInput = z.infer<typeof registerStaffPushTokenSchema>;
export type UnregisterPushTokenInput = z.infer<typeof unregisterPushTokenSchema>;
