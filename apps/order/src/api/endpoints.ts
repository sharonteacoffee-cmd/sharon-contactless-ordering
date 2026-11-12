/**
 * Sharon PascalCase Public API Route Constants (/api/v1/Public/*).
 */
export const PUBLIC_ENDPOINTS = {
  GET_PUBLIC_OUTLETS: '/Public/Outlet/GetPublicOutlets',
  getPublicOutletBySlug: (outletSlug: string) =>
    `/Public/Outlet/GetPublicOutletBySlug/${encodeURIComponent(outletSlug)}`,
  getPublicMenu: (outletSlug: string) =>
    `/Public/Menu/GetPublicMenu/${encodeURIComponent(outletSlug)}`,
  SEND_CUSTOMER_OTP: '/Public/Auth/SendCustomerOtp',
  VERIFY_CUSTOMER_OTP: '/Public/Auth/VerifyCustomerOtp',
  CREATE_PUBLIC_ORDER: '/Public/Order/CreatePublicOrder',
  submitDemoPayment: (orderBusinessId: string) =>
    `/Public/Order/SubmitDemoPayment/${encodeURIComponent(orderBusinessId)}`,
  getPublicOrderById: (orderBusinessId: string) =>
    `/Public/Order/GetPublicOrderById/${encodeURIComponent(orderBusinessId)}`,
  CUSTOMER_LOOKUP_BY_PHONE: '/Public/Customer/LookupByPhone',
  CUSTOMER_SAVE_PROFILE: '/Public/Customer/SaveProfile',
  CUSTOMER_SEND_LOGIN_OTP: '/Public/Customer/SendLoginOtp',
  CUSTOMER_VERIFY_LOGIN_OTP: '/Public/Customer/VerifyLoginOtp',
  CUSTOMER_GET_MY_PROFILE: '/Public/Customer/GetMyProfile',
  CUSTOMER_UPDATE_MY_PROFILE: '/Public/Customer/UpdateMyProfile',
  CUSTOMER_GET_MY_ORDERS: '/Public/Customer/GetMyOrders',
  NOTIFICATION: {
    REGISTER_CUSTOMER: '/Public/Notification/RegisterCustomerDevice',
    UNREGISTER_CUSTOMER: '/Public/Notification/UnregisterCustomerDevice',
  },
} as const;
