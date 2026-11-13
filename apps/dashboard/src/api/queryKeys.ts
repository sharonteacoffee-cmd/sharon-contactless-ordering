import type { OrderHistoryFilters } from '../types/dashboard';

export const dashboardQueryKeys = {
  auth: {
    profile: ['auth', 'profile'] as const,
  },
  orders: {
    all: ['orders'] as const,
    live: (outletBusinessId: string | null) =>
      ['orders', 'live', outletBusinessId ?? 'ALL'] as const,
    history: (filters: OrderHistoryFilters) =>
      ['orders', 'history', filters] as const,
  },
  stock: {
    all: ['stock'] as const,
    byOutlet: (outletBusinessId: string) =>
      ['stock', 'outlet', outletBusinessId] as const,
  },
  menuSync: {
    logs: ['menuSync', 'logs'] as const,
  },
  qrMaster: {
    list: ['qrMaster', 'list'] as const,
  },
  outlets: {
    list: ['outlets', 'list'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters?: { categorySlug?: string; search?: string }) =>
      ['products', 'list', filters] as const,
    categories: ['products', 'categories'] as const,
  },
  users: {
    list: ['users', 'list'] as const,
  },
  notification: {
    status: ['notification', 'status'] as const,
  },
} as const;
