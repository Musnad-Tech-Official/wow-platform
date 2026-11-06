import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GUEST_STORAGE_KEY = 'wow:customer:guest:v1';
export const GUEST_STORAGE_VERSION = 1;

export interface GuestState {
  hasChosenGuest: boolean;
  guestChosenAt: string | null;
  hasHydrated: boolean;
  enterGuest: () => void;
  exitGuest: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      hasChosenGuest: false,
      guestChosenAt: null,
      hasHydrated: false,
      enterGuest: () =>
        set({
          hasChosenGuest: true,
          guestChosenAt: new Date().toISOString(),
        }),
      exitGuest: () =>
        set({
          hasChosenGuest: false,
          guestChosenAt: null,
        }),
      setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),
    }),
    {
      name: GUEST_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? AsyncStorage : dummyStorage,
      ),
      version: GUEST_STORAGE_VERSION,
      partialize: (state) => ({
        hasChosenGuest: state.hasChosenGuest,
        guestChosenAt: state.guestChosenAt,
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (version !== GUEST_STORAGE_VERSION || !persistedState || typeof persistedState !== 'object') {
          // Graceful fallback on version mismatch or corrupted storage
          return {
            hasChosenGuest: false,
            guestChosenAt: null,
            hasHydrated: true,
          };
        }
        const state = persistedState as Partial<GuestState>;
        return {
          hasChosenGuest: Boolean(state.hasChosenGuest),
          guestChosenAt: typeof state.guestChosenAt === 'string' ? state.guestChosenAt : null,
          hasHydrated: true,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);