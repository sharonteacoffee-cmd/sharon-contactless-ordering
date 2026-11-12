import type { CartItem } from '@/types/order';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrDecimalFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats an INR amount cleanly (e.g., "₹20" or "₹25.50").
 */
export function formatINR(amount: number, forceDecimals = false): string {
  if (!Number.isFinite(amount)) {
    return forceDecimals ? '₹0.00' : '₹0';
  }
  const hasFraction = Math.round(amount * 100) % 100 !== 0;
  return forceDecimals || hasFraction
    ? inrDecimalFormatter.format(amount)
    : inrFormatter.format(amount);
}

/**
 * Computes client-side display estimate for a single cart item.
 * Authoritative totals are always recalculated server-side on CreatePublicOrder.
 */
export function calculateCartItemUnitPrice(item: CartItem): number {
  const modifiersSum = item.selectedModifiers.reduce((acc, mod) => acc + mod.priceExtra, 0);
  return Math.max(0, item.basePrice + modifiersSum);
}

/**
 * Computes client-side display estimate for the entire cart tray.
 */
export function calculateCartDisplaySummary(items: CartItem[]): {
  totalItems: number;
  estimatedSubtotal: number;
} {
  let totalItems = 0;
  let estimatedSubtotal = 0;

  for (const item of items) {
    totalItems += item.quantity;
    estimatedSubtotal += calculateCartItemUnitPrice(item) * item.quantity;
  }

  return {
    totalItems,
    estimatedSubtotal,
  };
}
