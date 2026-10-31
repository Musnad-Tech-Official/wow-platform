/**
 * WOW's cross-platform design contract. Keep these values in sync with
 * packages/theme/theme.css, which registers NativeWind class names.
 *
 * Semantic tokens are used for component states instead of ad-hoc hex values.
 * No UI element should infer authorization from a color or status badge.
 */
export const wowColorSchemes = {
  light: {
    primary: '#F5B700',
    primaryForeground: '#171717',
    background: '#FFFFFF',
    surface: '#F4F4F5',
    foreground: '#18181B',
    mutedForeground: '#71717A',
    border: '#E4E4E7',
    success: '#166534',
    successSurface: '#DCFCE7',
    warning: '#854D0E',
    warningSurface: '#FEF9C3',
    danger: '#B91C1C',
    dangerSurface: '#FEE2E2',
    info: '#1D4ED8',
    infoSurface: '#DBEAFE',
    neutral: '#52525B',
    neutralSurface: '#E4E4E7',
  },
  dark: {
    primary: '#FFD23F',
    primaryForeground: '#171717',
    background: '#101014',
    surface: '#202024',
    foreground: '#FAFAFA',
    mutedForeground: '#A1A1AA',
    border: '#3F3F46',
    success: '#86EFAC',
    successSurface: '#143321',
    warning: '#FDE047',
    warningSurface: '#422E12',
    danger: '#FCA5A5',
    dangerSurface: '#451B20',
    info: '#93C5FD',
    infoSurface: '#172554',
    neutral: '#D4D4D8',
    neutralSurface: '#3F3F46',
  },
} as const;

export type WowResolvedTheme = keyof typeof wowColorSchemes;
export type WowStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const wowLayoutTokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  minTouchSize: 48,
  screenHorizontalPadding: 20,
  screenTopPadding: 24,
  maxContentWidth: 1080,
} as const;

export const wowTypography = {
  family: {
    regular: 'Tajawal-Regular',
    medium: 'Tajawal-Medium',
    bold: 'Tajawal-Bold',
  },
  size: { caption: 12, label: 14, body: 16, heading: 20, title: 30 },
} as const;
