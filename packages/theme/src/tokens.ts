/** WOW approved visual contract. Changes require comparison with approved screen previews. */
export const wowColorSchemes = {
  light: {
    primary: '#FACC15',
    primaryForeground: '#0F172D',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    foreground: '#0F172D',
    mutedForeground: '#5C6B80',
    border: '#E8EBF0',
    actionForeground: '#744A00',
    focusRing: '#744A00',
    controlBorder: '#858B98',
    success: '#166534',
    successSurface: '#DCFCE7',
    warning: '#854D0E',
    warningSurface: '#FEF9C3',
    danger: '#B91C1C',
    dangerSurface: '#FEE2E2',
    info: '#1D4ED8',
    infoSurface: '#DBEAFE',
    neutral: '#52525B',
    neutralSurface: '#F1F5F9',
  },
  dark: {
    primary: '#FACC15',
    primaryForeground: '#0F172D',
    background: '#101014',
    surface: '#202024',
    foreground: '#FAFAFA',
    mutedForeground: '#A1A1AA',
    border: '#3F3F46',
    actionForeground: '#FACC15',
    focusRing: '#FACC15',
    controlBorder: '#A1A1AA',
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

export const wowBrandColors = {
  yellow: '#FACC15',
  yellowHover: '#FDE047',
  yellowPale: '#FEFCE8',
  navy: '#0F172D',
} as const;

export const wowAppCanvases = {
  customer: '#F5F6F8',
  merchant: '#F4F5F8',
  admin: '#F6F7F6',
} as const;

export type WowAppKind = keyof typeof wowAppCanvases;
export type WowResolvedTheme = keyof typeof wowColorSchemes;
export type WowStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const wowLayoutTokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  minTouchSize: 48,
  screenHorizontalPadding: 20,
  screenTopPadding: 24,
  // Kept for backwards compatibility; use page-specific limits when possible.
  maxContentWidth: 1080,
  pageMaxWidth: { customer: 1240, merchant: 1440, admin: 1560 },
} as const;

/** Width-based breakpoints: platform === web does not imply desktop-sized viewport. */
export const wowResponsiveTokens = {
  compact: 600,
  desktop: 1024,
  wide: 1440,
} as const;

export const wowTypography = {
  family: {
    regular: 'Tajawal-Regular',
    medium: 'Tajawal-Medium',
    bold: 'Tajawal-Bold',
  },
  size: { caption: 12, label: 14, body: 16, heading: 20, title: 30 },
} as const;
