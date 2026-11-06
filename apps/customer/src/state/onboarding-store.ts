import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_STORAGE_KEY = 'wow:customer:onboarding:v1';
export const ONBOARDING_STORAGE_VERSION = 1;

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  completedAt: string | null;
  hasHydrated: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      completedAt: null,
      hasHydrated: false,
      completeOnboarding: () =>
        set({
          hasCompletedOnboarding: true,
          completedAt: new Date().toISOString(),
        }),
      resetOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
          completedAt: null,
        }),
      setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? AsyncStorage : dummyStorage,
      ),
      version: ONBOARDING_STORAGE_VERSION,
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        completedAt: state.completedAt,
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (version !== ONBOARDING_STORAGE_VERSION || !persistedState || typeof persistedState !== 'object') {
          // Graceful fallback on version mismatch or corrupted storage
          return {
            hasCompletedOnboarding: false,
            completedAt: null,
            hasHydrated: true,
          };
        }
        const state = persistedState as Partial<OnboardingState>;
        return {
          hasCompletedOnboarding: Boolean(state.hasCompletedOnboarding),
          completedAt: typeof state.completedAt === 'string' ? state.completedAt : null,
          hasHydrated: true,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);