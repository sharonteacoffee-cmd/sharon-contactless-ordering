export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/Private/Auth/Login',
    GET_CURRENT_PROFILE: '/Private/Auth/GetCurrentProfile',
  },
  ORDER: {
    GET_LIVE_ORDERS: '/Private/Order/GetLiveOrders',
    GET_ORDER_HISTORY: '/Private/Order/GetOrderHistory',
    UPDATE_ORDER_STATUS: (orderBusinessId: string) =>
      `/Private/Order/UpdateOrderStatus/${encodeURIComponent(orderBusinessId)}`,
    VERIFY_ORDER_PAYMENT: (orderBusinessId: string) =>
      `/Private/Order/VerifyOrderPayment/${encodeURIComponent(orderBusinessId)}`,
  },
  OUTLET_STOCK: {
    GET_OUTLET_STOCK: (outletBusinessId: string) =>
      `/Private/OutletStock/GetOutletStock/${encodeURIComponent(outletBusinessId)}`,
    TOGGLE_ITEM_AVAILABILITY: (outletBusinessId: string, menuItemId: string) =>
      `/Private/OutletStock/ToggleItemAvailability/${encodeURIComponent(outletBusinessId)}/${encodeURIComponent(menuItemId)}`,
  },
  MENU_SYNC: {
    PREVIEW_FROM_WEBSITE: '/Private/MenuSync/PreviewFromWebsite',
    SYNC_FROM_WEBSITE: '/Private/MenuSync/SyncFromWebsite',
    GET_SYNC_LOGS: '/Private/MenuSync/GetSyncLogs',
  },
  QR_MASTER: {
    GET_QR_CODES: '/Private/QrMaster/GetQrCodes',
    GENERATE_QR_CODE: '/Private/QrMaster/GenerateQrCode',
    UPDATE_QR_STATUS: (qrBusinessId: string) =>
      `/Private/QrMaster/UpdateQrStatus/${encodeURIComponent(qrBusinessId)}`,
  },
  OUTLET: {
    GET_OUTLETS: '/Private/Outlet/GetOutlets',
    UPDATE_OUTLET_SETTINGS: (outletBusinessId: string) =>
      `/Private/Outlet/UpdateOutletSettings/${encodeURIComponent(outletBusinessId)}`,
  },
  USER: {
    GET_USERS: '/Private/User/GetUsers',
    CREATE_USER: '/Private/User/CreateUser',
    UPDATE_USER: (userBusinessId: string) =>
      `/Private/User/UpdateUser/${encodeURIComponent(userBusinessId)}`,
    TOGGLE_USER_STATUS: (userBusinessId: string) =>
      `/Private/User/ToggleUserStatus/${encodeURIComponent(userBusinessId)}`,
  },
  NOTIFICATION: {
    REGISTER_STAFF: '/Private/Notification/RegisterStaffDevice',
    UNREGISTER_STAFF: '/Private/Notification/UnregisterStaffDevice',
    GET_STATUS: '/Private/Notification/GetPushStatus',
  },
} as const;
