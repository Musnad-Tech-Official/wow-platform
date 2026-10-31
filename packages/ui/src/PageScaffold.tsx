import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { wowLayoutTokens } from '@wow/theme';
import { rtlProps } from './rtl';

export type PageScaffoldProps = Omit<ScrollViewProps, 'children' | 'contentContainerStyle'> & {
  children: ReactNode;
  /** Use false when the page supplies its own horizontal spacing. */
  padded?: boolean;
  maxWidth?: number;
};

/** Common RTL-safe, scrollable layout for Customer, Merchant and Admin. */
export function PageScaffold({
  children,
  padded = true,
  maxWidth = wowLayoutTokens.maxContentWidth,
  className,
  ...props
}: PageScaffoldProps) {
  return (
    <ScrollView
      {...rtlProps}
      {...props}
      className={`flex-1 bg-background ${className ?? ''}`}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: 32 }}
    >
      <View
        {...rtlProps}
        style={{
          width: '100%',
          maxWidth,
          paddingHorizontal: padded ? wowLayoutTokens.screenHorizontalPadding : 0,
          paddingTop: wowLayoutTokens.screenTopPadding,
        }}
        className="gap-6"
      >
        {children}
      </View>
    </ScrollView>
  );
}
