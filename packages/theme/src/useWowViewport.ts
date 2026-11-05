import { useSyncExternalStore } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { wowResponsiveTokens } from './tokens';

const emptySubscribe = () => () => {};

/** Responsive viewport widths independent from Android/iOS/Web platform labels. */
export function useWowViewport() {
  const { width, height, fontScale } = useWindowDimensions();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const effectiveWidth = (Platform.OS === 'web' && !isClient) ? 390 : width;
  const size = effectiveWidth < wowResponsiveTokens.compact ? 'compact'
    : effectiveWidth < wowResponsiveTokens.desktop ? 'medium'
    : effectiveWidth < wowResponsiveTokens.wide ? 'desktop'
    : 'wide';
  return {
    width: effectiveWidth,
    height,
    fontScale,
    size,
    isCompact: size === 'compact',
    isDesktop: size === 'desktop' || size === 'wide',
  } as const;
}
