import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { Appearance, Platform, View, useColorScheme } from 'react-native';
import { VariableContextProvider } from 'nativewind';
import { wowColorSchemes } from './tokens';
import {
  WOW_THEME_STORAGE_KEY,
  parseThemePreference,
  resolveThemePreference,
  type ThemeMode,
  type ResolvedTheme,
} from './theme-preference';
export type { ThemeMode } from './theme-preference';

/**
 * Storage is injected by each app rather than importing app-owned native
 * modules into the shared workspace theme package.
 * Expo SecureStore is supported on iOS and Android; web uses localStorage.
 */
export interface ThemePreferenceStorage {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
}

const themes = {
  light: {
    '--color-primary': wowColorSchemes.light.primary,
    '--color-primary-foreground': wowColorSchemes.light.primaryForeground,
    '--color-background': wowColorSchemes.light.background,
    '--color-surface': wowColorSchemes.light.surface,
    '--color-foreground': wowColorSchemes.light.foreground,
    '--color-muted-foreground': wowColorSchemes.light.mutedForeground,
    '--color-border': wowColorSchemes.light.border,
  },
  dark: {
    '--color-primary': wowColorSchemes.dark.primary,
    '--color-primary-foreground': wowColorSchemes.dark.primaryForeground,
    '--color-background': wowColorSchemes.dark.background,
    '--color-surface': wowColorSchemes.dark.surface,
    '--color-foreground': wowColorSchemes.dark.foreground,
    '--color-muted-foreground': wowColorSchemes.dark.mutedForeground,
    '--color-border': wowColorSchemes.dark.border,
  },
};

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const emptySubscribe = () => () => {};

function applyPlatformTheme(mode: ThemeMode, systemTheme: 'light' | 'dark' | null) {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return;
    const isDark = mode === 'system' ? systemTheme === 'dark' : mode === 'dark';
    // NativeWind v5's web dark: selector uses the class variant below.
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } else {
    // NativeWind v5 observes React Native Appearance, including the OS setting.
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }
}

export function ThemeProvider({
  children,
  storage,
}: {
  children: ReactNode;
  storage?: ThemePreferenceStorage;
}) {
  const systemTheme = useColorScheme();
  const [mode, setModeValue] = useState<ThemeMode>('system');
  const [hasHydrated, setHasHydrated] = useState(false);
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Load before rendering app routes: no incorrect theme flash or SSR
  // localStorage access. Invalid/old values safely fall back to system.
  useEffect(() => {
    let active = true;

    async function restorePreference() {
      let restored: ThemeMode = 'system';
      try {
        const value = Platform.OS === 'web'
          ? (typeof window === 'undefined'
            ? null
            : window.localStorage.getItem(WOW_THEME_STORAGE_KEY))
          : (storage ? await storage.getItemAsync(WOW_THEME_STORAGE_KEY) : null);
        restored = parseThemePreference(value);
      } catch {
        // Storage may be blocked/private; retain the system preference.
      }
      if (!active) return;
      applyPlatformTheme(restored, Appearance.getColorScheme());
      setModeValue(restored);
      setHasHydrated(true);
    }

    void restorePreference();
    return () => { active = false; };
    // Storage is a stable module object. A system theme change must NOT
    // trigger a new persistence read and overwrite the user's live choice.
  }, [storage]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeValue(next);
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(WOW_THEME_STORAGE_KEY, next);
        }
      } catch {
        // A blocked storage write does not prevent an in-memory theme change.
      }
    } else if (storage) {
      void storage.setItemAsync(WOW_THEME_STORAGE_KEY, next).catch(() => {
        // Keep UI usable when device persistence is temporarily unavailable.
      });
    }
  }, [storage]);

  const resolvedTheme: ResolvedTheme = resolveThemePreference(
    mode,
    Platform.OS === 'web' && !isClient ? 'light' : systemTheme
  );

  useEffect(() => {
    if (hasHydrated) applyPlatformTheme(mode, systemTheme);
  }, [hasHydrated, mode, systemTheme]);

  const contextValue = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode]
  );

  if (!hasHydrated) return null;

  return (
    <ThemeContext.Provider value={contextValue}>
      <VariableContextProvider value={themes[resolvedTheme]}>
        <View className={resolvedTheme === 'dark' ? 'dark' : 'light'} style={{ flex: 1 }}>
          {children}
        </View>
      </VariableContextProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}

/** Semantic colors for JS-driven React Native styles and SVG icons. */
export function useWowColors() {
  const { resolvedTheme } = useTheme();
  return wowColorSchemes[resolvedTheme];
}
