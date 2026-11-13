import React, { type PropsWithChildren } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { useTheme } from '@wow/theme';
import { PageHeader, AppText, AppButton } from '@wow/ui';
import { MerchantAppHeader, type MerchantAppHeaderProps } from './MerchantAppHeader';
import { MerchantBottomNav, type MerchantTab } from './MerchantBottomNav';
import { useActiveBusiness } from '../business/context/ActiveBusinessContext';

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
  scrollable = true,
  title,
  subtitle,
  extraRightBadge,
  showBusinessSelector = true,
}: MerchantScaffoldProps) {
  const { resolvedTheme } = useTheme();
  const { businessesError, refetchBusinesses, isSyntheticPreview } = useActiveBusiness();
  const isDark = resolvedTheme === 'dark';

  const businessLoadErrorPanel = businessesError && !isSyntheticPreview ? (
    <View className="rounded-2xl border border-amber-500/30 p-4 gap-2 mb-4">
      <AppText variant="label" className="font-tajawal-bold text-right">
        تعذّر تحميل الأنشطة المصرح بها
      </AppText>
      <AppText variant="caption" muted className="text-right">
        تعذر تأكيد الأنشطة والصلاحيات الحالية. أعد المحاولة قبل إجراء أي تعديل.
      </AppText>
      <AppButton title="إعادة تحميل الأنشطة" variant="outline" onPress={refetchBusinesses} />
    </View>
  ) : null;

  const pageHeading = title ? (
    <View style={{ marginBottom: 16 }}>
      <PageHeader title={title} description={subtitle} action={extraRightBadge} />
    </View>
  ) : null;

  return (
    <>
      <View
        className="flex-1 w-full bg-background"
        style={{
          backgroundColor: isDark ? '#101014' : '#F4F5F8',
          ...(Platform.OS === 'web' ? { direction: 'rtl' as const } : {}),
        }}
      >
        <View className="flex-1 w-full self-center" style={{ maxWidth }}>
          {/* Shared Merchant App Header */}
          <MerchantAppHeader showBusinessSelector={showBusinessSelector} />

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
              {pageHeading}
              {businessLoadErrorPanel}
              {children}
            </ScrollView>
          ) : (
            <View className="flex-1 w-full p-4">{pageHeading}{businessLoadErrorPanel}{children}</View>
          )}

          {/* Shared Merchant Bottom Navigation */}
          <MerchantBottomNav currentTab={currentTab} />
        </View>
      </View>
    </>
  );
}
