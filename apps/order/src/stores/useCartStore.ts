import { create } from 'zustand';
import type { SelectedModifier } from '@sharon/shared';
import type { CartItem, CustomerProfile } from '@/types/order';

const CUSTOMER_PROFILE_STORAGE_KEY = 'sharon_customer_profile_v1';
const CART_STORAGE_KEY = 'sharon_cart_state_v1';

interface PersistedCartPayload {
  outletSlug: string | null;
  tableOrToken: string;
  qrToken: string | null;
  items: CartItem[];
  notes: string;
}

function loadCustomerProfile(): CustomerProfile {
  try {
    const raw = window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY);
    if (!raw) {
      return { customerName: '', customerPhone: '' };
    }
    const parsed = JSON.parse(raw) as Partial<CustomerProfile>;
    return {
      customerName: typeof parsed.customerName === 'string' ? parsed.customerName : '',
      customerPhone: typeof parsed.customerPhone === 'string' ? parsed.customerPhone : '',
      otpVerificationToken:
        typeof parsed.otpVerificationToken === 'string' ? parsed.otpVerificationToken : undefined,
    };
  } catch {
    return { customerName: '', customerPhone: '' };
  }
}

function saveCustomerProfile(profile: CustomerProfile): void {
  try {
    window.localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors in restricted mobile browsers
  }
}

function loadCartPayload(): PersistedCartPayload {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return {
        outletSlug: null,
        tableOrToken: 'Counter Pickup',
        qrToken: null,
        items: [],
        notes: '',
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedCartPayload>;
    return {
      outletSlug: typeof parsed.outletSlug === 'string' ? parsed.outletSlug : null,
      tableOrToken:
        typeof parsed.tableOrToken === 'string' && parsed.tableOrToken.trim()
          ? parsed.tableOrToken
          : 'Counter Pickup',
      qrToken: typeof parsed.qrToken === 'string' ? parsed.qrToken : null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    };
  } catch {
    return {
      outletSlug: null,
      tableOrToken: 'Counter Pickup',
      qrToken: null,
      items: [],
      notes: '',
    };
  }
}

function saveCartPayload(payload: PersistedCartPayload): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

function buildModifierSignature(modifiers: SelectedModifier[]): string {
  return [...modifiers]
    .map((m) => m.optionId)
    .sort()
    .join('|');
}

export interface AddCartItemInput {
  outletSlug: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  itemNote?: string;
}

interface CartStoreState {
  outletSlug: string | null;
  tableOrToken: string;
  qrToken: string | null;
  items: CartItem[];
  notes: string;
  customerProfile: CustomerProfile;
  setOutletContext: (params: {
    outletSlug: string;
    tableOrToken?: string | null;
    qrToken?: string | null;
  }) => void;
  addItem: (input: AddCartItemInput) => void;
  updateItemQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  setOrderNotes: (notes: string) => void;
  setTableOrToken: (tableOrToken: string) => void;
  setCustomerProfile: (profile: CustomerProfile) => void;
  setOtpVerificationToken: (token: string | undefined) => void;
  clearCart: () => void;
}

const initialCart = loadCartPayload();

export const useCartStore = create<CartStoreState>((set, get) => ({
  outletSlug: initialCart.outletSlug,
  tableOrToken: initialCart.tableOrToken,
  qrToken: initialCart.qrToken,
  items: initialCart.items,
  notes: initialCart.notes,
  customerProfile: loadCustomerProfile(),

  setOutletContext: ({ outletSlug, tableOrToken, qrToken }) => {
    const current = get();
    const isSwitchingOutlet = current.outletSlug !== null && current.outletSlug !== outletSlug;
    const nextItems = isSwitchingOutlet ? [] : current.items;
    const nextNotes = isSwitchingOutlet ? '' : current.notes;
    const nextTable =
      tableOrToken && tableOrToken.trim()
        ? tableOrToken.trim()
        : isSwitchingOutlet
          ? 'Counter Pickup'
          : current.tableOrToken;
    const nextQr =
      qrToken !== undefined ? qrToken : isSwitchingOutlet ? null : current.qrToken;

    const updated: PersistedCartPayload = {
      outletSlug,
      tableOrToken: nextTable,
      qrToken: nextQr,
      items: nextItems,
      notes: nextNotes,
    };
    saveCartPayload(updated);
    set(updated);
  },

  addItem: (input) => {
    const current = get();
    const baseItems = current.outletSlug === input.outletSlug ? current.items : [];
    const signature = `${input.menuItemId}::${buildModifierSignature(input.selectedModifiers)}::${(input.itemNote ?? '').trim()}`;

    const existingIdx = baseItems.findIndex((item) => item.cartItemId === signature);
    let nextItems: CartItem[];

    if (existingIdx >= 0) {
      nextItems = baseItems.map((item, idx) =>
        idx === existingIdx
          ? { ...item, quantity: Math.min(50, item.quantity + input.quantity) }
          : item,
      );
    } else {
      nextItems = [
        ...baseItems,
        {
          cartItemId: signature,
          menuItemId: input.menuItemId,
          name: input.name,
          basePrice: input.basePrice,
          imageUrl: input.imageUrl,
          quantity: Math.min(50, Math.max(1, input.quantity)),
          selectedModifiers: input.selectedModifiers,
          itemNote: input.itemNote?.trim() || undefined,
        },
      ];
    }

    const updated: PersistedCartPayload = {
      outletSlug: input.outletSlug,
      tableOrToken: current.tableOrToken,
      qrToken: current.qrToken,
      items: nextItems,
      notes: current.outletSlug === input.outletSlug ? current.notes : '',
    };
    saveCartPayload(updated);
    set(updated);
  },

  updateItemQuantity: (cartItemId, quantity) => {
    const current = get();
    const nextItems =
      quantity <= 0
        ? current.items.filter((item) => item.cartItemId !== cartItemId)
        : current.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: Math.min(50, quantity) }
              : item,
          );

    const updated: PersistedCartPayload = {
      outletSlug: current.outletSlug,
      tableOrToken: current.tableOrToken,
      qrToken: current.qrToken,
      items: nextItems,
      notes: current.notes,
    };
    saveCartPayload(updated);
    set({ items: nextItems });
  },

  removeItem: (cartItemId) => {
    const current = get();
    const nextItems = current.items.filter((item) => item.cartItemId !== cartItemId);
    const updated: PersistedCartPayload = {
      outletSlug: current.outletSlug,
      tableOrToken: current.tableOrToken,
      qrToken: current.qrToken,
      items: nextItems,
      notes: current.notes,
    };
    saveCartPayload(updated);
    set({ items: nextItems });
  },

  setOrderNotes: (notes) => {
    const current = get();
    saveCartPayload({
      outletSlug: current.outletSlug,
      tableOrToken: current.tableOrToken,
      qrToken: current.qrToken,
      items: current.items,
      notes,
    });
    set({ notes });
  },

  setTableOrToken: (tableOrToken) => {
    const current = get();
    const normalized = tableOrToken.trim() || 'Counter Pickup';
    saveCartPayload({
      outletSlug: current.outletSlug,
      tableOrToken: normalized,
      qrToken: current.qrToken,
      items: current.items,
      notes: current.notes,
    });
    set({ tableOrToken: normalized });
  },

  setCustomerProfile: (profile) => {
    saveCustomerProfile(profile);
    set({ customerProfile: profile });
  },

  setOtpVerificationToken: (token) => {
    const nextProfile: CustomerProfile = {
      ...get().customerProfile,
      otpVerificationToken: token,
    };
    saveCustomerProfile(nextProfile);
    set({ customerProfile: nextProfile });
  },

  clearCart: () => {
    const current = get();
    const updated: PersistedCartPayload = {
      outletSlug: current.outletSlug,
      tableOrToken: current.tableOrToken,
      qrToken: current.qrToken,
      items: [],
      notes: '',
    };
    saveCartPayload(updated);
    set({ items: [], notes: '' });
  },
}));
