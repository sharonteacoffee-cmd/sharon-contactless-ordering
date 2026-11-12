export const queryKeys = {
  publicOutlets: ['publicOutlets'] as const,
  publicOutlet: (outletSlug: string, qrToken?: string | null) =>
    qrToken
      ? (['publicOutlet', outletSlug, qrToken] as const)
      : (['publicOutlet', outletSlug] as const),
  publicMenu: (outletSlug: string) => ['publicMenu', outletSlug] as const,
  publicOrder: (orderBusinessId: string) => ['publicOrder', orderBusinessId] as const,
  customerLookup: (phone: string) => ['customerLookup', phone] as const,
  customerProfile: ['customerProfile'] as const,
  customerOrders: ['customerOrders'] as const,
};
