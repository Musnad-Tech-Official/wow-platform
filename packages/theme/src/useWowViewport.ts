import { useWindowDimensions } from 'react-native';
import { wowResponsiveTokens } from './tokens';

/** Responsive viewport widths independent from Android/iOS/Web platform labels. */
export function useWowViewport() {
  const { width, height, fontScale } = useWindowDimensions();
  const size = width < wowResponsiveTokens.compact ? 'compact'
    : width < wowResponsiveTokens.desktop ? 'medium'
    : width < wowResponsiveTokens.wide ? 'desktop'
    : 'wide';
  return {
    width,
    height,
    fontScale,
    size,
    isCompact: size === 'compact',
    isDesktop: size === 'desktop' || size === 'wide',
  } as const;
}
