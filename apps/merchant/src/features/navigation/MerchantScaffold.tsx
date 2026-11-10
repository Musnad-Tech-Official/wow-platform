import React, { type PropsWithChildren } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { useTheme } from '@wow/theme';
import { ActiveBusinessProvider } from '../business/context/ActiveBusinessContext';
import { MerchantAppHeader, type MerchantAppHeaderProps } from './MerchantAppHeader';
import { MerchantBottomNav, type MerchantTab } from './MerchantBottomNav';

export interface MerchantScaffoldProps extends PropsWithChildren, MerchantAppHeaderProps {
  currentTab: MerchantTab;
  maxWidth?: number;
  initialBusinessId?: string | null;
  scrollable?: boolean;
}

export function MerchantScaffold({
  children,
  currentTab,
  maxWidth = 640,
  initialBusinessId,
  scrollable = true,
  ...headerProps
}: MerchantScaffoldProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <ActiveBusinessProvider initialBusinessId={initialBusinessId}>
      <View
        className="flex-1 w-full bg-background"
        style={{
          backgroundColor: isDark ? '#101014' : '#F4F5F8',
          ...(Platform.OS === 'web' ? { direction: 'rtl' as const } : {}),
        }}
      >
        <View className="flex-1 w-full self-center" style={{ maxWidth }}>
          {/* Shared Merchant App Header */}
          <MerchantAppHeader {...headerProps} />

          {/* Main Content */}
          {scrollable ? (
            <ScrollView
              className="flex-1 w-full"
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                paddingBottom: 24,
              }}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View className="flex-1 w-full p-4">{children}</View>
          )}

          {/* Shared Merchant Bottom Navigation */}
          <MerchantBottomNav currentTab={currentTab} />
        </View>
      </View>
    </ActiveBusinessProvider>
  );
}
