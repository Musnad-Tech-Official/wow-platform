import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import {
  useTheme,
  useWowViewport,
  wowAppCanvases,
  wowLayoutTokens,
  type WowAppKind,
} from '@wow/theme';
import { rtlProps } from './rtl';

export type PageScaffoldProps = Omit<ScrollViewProps, 'children' | 'contentContainerStyle'> & {
  children: ReactNode;
  padded?: boolean;
  maxWidth?: number;
  app?: WowAppKind;
};

/** Responsive shell only; app navigation/header/table layout is composed by each product. */
export function PageScaffold({
  children,
  padded = true,
  app = 'customer',
  maxWidth,
  className,
  style,
  ...props
}: PageScaffoldProps) {
  const viewport = useWowViewport();
  const { resolvedTheme } = useTheme();
  const horizontalPadding = viewport.isCompact ? 16 : viewport.isDesktop ? 32 : 24;
  const contentWidth = maxWidth ?? wowLayoutTokens.pageMaxWidth[app];
  const backgroundColor = resolvedTheme === 'dark' ? undefined : wowAppCanvases[app];
  return (
    <ScrollView
      {...rtlProps}
      {...props}
      keyboardShouldPersistTaps="handled"
      className={`flex-1 bg-background ${className ?? ''}`}
      style={[backgroundColor ? { backgroundColor } : undefined, style]}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: 32 }}
    >
      <View
        {...rtlProps}
        style={{
          width: '100%',
          maxWidth: contentWidth,
          paddingHorizontal: padded ? horizontalPadding : 0,
          paddingTop: wowLayoutTokens.screenTopPadding,
        }}
        className="gap-6"
      >
        {children}
      </View>
    </ScrollView>
  );
}
