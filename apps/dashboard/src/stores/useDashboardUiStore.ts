import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StaffUser } from '../types/dashboard';

/**
 * Client-side UI and session state ONLY.
 * Server/API data lists (orders, stock, sync logs, outlets, QR codes) live strictly in TanStack Query.
 */
interface DashboardUiState {
  token: string | null;
  user: StaffUser | null;
  selectedOutletBusinessId: string | null;
  isAudioMuted: boolean;
  sidebarCollapsed: boolean;
  activePushToken: string | null;
  setSession: (token: string, user: StaffUser) => void;
  setUserProfile: (user: StaffUser) => void;
  clearSession: () => void;
  setSelectedOutletBusinessId: (outletBusinessId: string | null) => void;
  toggleAudioMuted: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePushToken: (fcmToken: string | null) => void;
}

export const useDashboardUiStore = create<DashboardUiState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      selectedOutletBusinessId: null,
      isAudioMuted: false,
      sidebarCollapsed: false,
      activePushToken: null,

      setSession: (token, user) =>
        set({
          token,
          user,
          selectedOutletBusinessId:
            user.role === 'OUTLET_STAFF' ? user.outletBusinessId : null,
        }),

      setUserProfile: (user) =>
        set((state) => ({
          user,
          selectedOutletBusinessId:
            user.role === 'OUTLET_STAFF'
              ? user.outletBusinessId
              : state.selectedOutletBusinessId,
        })),

      clearSession: () =>
        set({
          token: null,
          user: null,
          selectedOutletBusinessId: null,
          activePushToken: null,
        }),

      setSelectedOutletBusinessId: (outletBusinessId) =>
        set((state) => {
          if (state.user?.role === 'OUTLET_STAFF') {
            return { selectedOutletBusinessId: state.user.outletBusinessId };
          }
          return { selectedOutletBusinessId: outletBusinessId };
        }),

      toggleAudioMuted: () =>
        set((state) => ({ isAudioMuted: !state.isAudioMuted })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setActivePushToken: (activePushToken) => set({ activePushToken }),
    }),
    {
      name: 'sharon-dashboard-ui-session',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        selectedOutletBusinessId: state.selectedOutletBusinessId,
        isAudioMuted: state.isAudioMuted,
        sidebarCollapsed: state.sidebarCollapsed,
        activePushToken: state.activePushToken,
      }),
    },
  ),
);
