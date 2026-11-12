import { create } from 'zustand';

const CUSTOMER_AUTH_STORAGE_KEY = 'sharon_customer_auth_v1';

export interface CustomerAuthPersistedState {
  customerAccessToken: string | null;
  customerBusinessId: string | null;
  fullName: string;
  phone: string;
}

function loadPersistedCustomerAuth(): CustomerAuthPersistedState {
  try {
    const raw = window.localStorage.getItem(CUSTOMER_AUTH_STORAGE_KEY);
    if (!raw) {
      return {
        customerAccessToken: null,
        customerBusinessId: null,
        fullName: '',
        phone: '',
      };
    }
    const parsed = JSON.parse(raw) as Partial<CustomerAuthPersistedState>;
    return {
      customerAccessToken:
        typeof parsed.customerAccessToken === 'string' && parsed.customerAccessToken.length > 0
          ? parsed.customerAccessToken
          : null,
      customerBusinessId:
        typeof parsed.customerBusinessId === 'string' && parsed.customerBusinessId.length > 0
          ? parsed.customerBusinessId
          : null,
      fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
    };
  } catch {
    return {
      customerAccessToken: null,
      customerBusinessId: null,
      fullName: '',
      phone: '',
    };
  }
}

function savePersistedCustomerAuth(state: CustomerAuthPersistedState): void {
  try {
    window.localStorage.setItem(CUSTOMER_AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in restricted mobile browsers
  }
}

interface CustomerAuthStore extends CustomerAuthPersistedState {
  setSession: (session: {
    customerAccessToken: string;
    customerBusinessId: string;
    fullName: string;
    phone: string;
  }) => void;
  setSavedIdentity: (identity: {
    fullName: string;
    phone: string;
    customerBusinessId?: string | null;
  }) => void;
  updateFullName: (fullName: string) => void;
  clearSession: () => void;
}

const initialState = loadPersistedCustomerAuth();

export const useCustomerAuthStore = create<CustomerAuthStore>((set, get) => ({
  ...initialState,

  setSession: (session) => {
    const next: CustomerAuthPersistedState = {
      customerAccessToken: session.customerAccessToken,
      customerBusinessId: session.customerBusinessId,
      fullName: session.fullName,
      phone: session.phone,
    };
    savePersistedCustomerAuth(next);
    set(next);
  },

  setSavedIdentity: ({ fullName, phone, customerBusinessId }) => {
    const current = get();
    const next: CustomerAuthPersistedState = {
      customerAccessToken: current.customerAccessToken,
      customerBusinessId:
        customerBusinessId !== undefined ? customerBusinessId : current.customerBusinessId,
      fullName,
      phone,
    };
    savePersistedCustomerAuth(next);
    set(next);
  },

  updateFullName: (fullName) => {
    const current = get();
    const next: CustomerAuthPersistedState = {
      ...current,
      fullName,
    };
    savePersistedCustomerAuth(next);
    set({ fullName });
  },

  clearSession: () => {
    const current = get();
    const next: CustomerAuthPersistedState = {
      customerAccessToken: null,
      customerBusinessId: null,
      fullName: current.fullName,
      phone: current.phone,
    };
    savePersistedCustomerAuth(next);
    set({ customerAccessToken: null, customerBusinessId: null });
  },
}));
