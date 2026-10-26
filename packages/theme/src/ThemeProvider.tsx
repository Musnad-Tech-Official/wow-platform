import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useColorScheme } from 'react-native';
import { VariableContextProvider } from 'nativewind';

export type ThemeMode = 'system' | 'light' | 'dark';

type ResolvedTheme = 'light' | 'dark';

const themes = {
  light: {
    '--color-primary': '#F5B700',
    '--color-primary-foreground': '#171717',
    '--color-background': '#FFFFFF',
    '--color-surface': '#F4F4F5',
    '--color-foreground': '#18181B',
    '--color-muted-foreground': '#71717A',
    '--color-border': '#E4E4E7',
  },
  dark: {
    '--color-primary': '#FFD23F',
    '--color-primary-foreground': '#171717',
    '--color-background': '#101014',
    '--color-surface': '#202024',
    '--color-foreground': '#FAFAFA',
    '--color-muted-foreground': '#A1A1AA',
    '--color-border': '#3F3F46',
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