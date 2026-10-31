import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useColorScheme } from 'react-native';
import { VariableContextProvider } from 'nativewind';
import { wowColorSchemes } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

type ResolvedTheme = 'light' | 'dark';

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

const ThemeContext = createContext<ThemeContextValue | null>(
  null
);

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const systemTheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const resolvedTheme: ResolvedTheme =
    mode === 'system'
      ? systemTheme === 'dark'
        ? 'dark'
        : 'light'
      : mode;

  const contextValue = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <VariableContextProvider value={themes[resolvedTheme]}>
        {children}
      </VariableContextProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider'
    );
  }

  return context;
}
/** Semantic colors for JS-driven React Native styles and SVG icons. */
export function useWowColors() {
  const { resolvedTheme } = useTheme();
  return wowColorSchemes[resolvedTheme];
}
