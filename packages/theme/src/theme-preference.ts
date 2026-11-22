/** Shared, dependency-free theme preference contract for web and native. */
export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const WOW_THEME_STORAGE_KEY = 'wow.theme.mode.v1';

export function parseThemePreference(value: string | null | undefined): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : 'system';
}

export function resolveThemePreference(
  mode: ThemeMode,
  systemTheme: 'light' | 'dark' | null
): ResolvedTheme {
  return mode === 'system'
    ? (systemTheme === 'dark' ? 'dark' : 'light')
    : mode;
}
