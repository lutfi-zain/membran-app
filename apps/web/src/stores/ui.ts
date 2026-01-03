import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// T056: UI store for theme and sidebar state
// T057: Configure persistence middleware for UI store

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  // State
  theme: Theme;
  sidebarOpen: boolean;
  notificationsOpen: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleNotifications: () => void;
  setNotificationsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: true,
      notificationsOpen: false,

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleNotifications: () => set((state) => ({ notificationsOpen: !state.notificationsOpen })),

      setNotificationsOpen: (open) => set({ notificationsOpen: open }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
