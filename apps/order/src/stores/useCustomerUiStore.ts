import { create } from 'zustand';

interface CustomerUiStoreState {
  activeCategorySlug: string;
  searchQuery: string;
  customizingMenuItemId: string | null;
  isCartDrawerOpen: boolean;
  isVerificationDrawerOpen: boolean;
  setActiveCategorySlug: (slug: string) => void;
  setSearchQuery: (query: string) => void;
  openModifierModal: (menuItemId: string) => void;
  closeModifierModal: () => void;
  setCartDrawerOpen: (open: boolean) => void;
  setVerificationDrawerOpen: (open: boolean) => void;
  resetMenuFilters: () => void;
}

export const useCustomerUiStore = create<CustomerUiStoreState>((set) => ({
  activeCategorySlug: 'all',
  searchQuery: '',
  customizingMenuItemId: null,
  isCartDrawerOpen: false,
  isVerificationDrawerOpen: false,

  setActiveCategorySlug: (slug) => set({ activeCategorySlug: slug }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  openModifierModal: (menuItemId) => set({ customizingMenuItemId: menuItemId }),
  closeModifierModal: () => set({ customizingMenuItemId: null }),
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
  setVerificationDrawerOpen: (open) => set({ isVerificationDrawerOpen: open }),
  resetMenuFilters: () => set({ activeCategorySlug: 'all', searchQuery: '' }),
}));
