import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@wow/ui';
import { useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';

export interface DashboardBannerProps {
  onNewOfferPress?: () => void;
}

export function DashboardBanner({ onNewOfferPress }: DashboardBannerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { activeBusinessId, isSyntheticPreview } = useActiveBusiness();

  const handleNewOffer = () => {
    if (onNewOfferPress) {
      onNewOfferPress();
    } else {
      router.push({
        pathname: '/offers',
        params: {
          ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
          ...(isSyntheticPreview ? { preview: '1' } : {}),
        },
      });
    }
  };

  return (
    <View
      className="w-full rounded-2xl border overflow-hidden p-4 mb-4"
      style={{
        backgroundColor: isDark ? '#27272A' : '#FEF08A',
        borderColor: isDark ? '#3F3F46' : '#FDE047',
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        {/* Mascot */}
        <Image
          source={wowIllustrations.merchant.dashboardMascot}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
          accessibilityLabel="تميمة لوحة التاجر"
        />

        {/* Hero Content */}
        <View className="flex-1 items-start gap-1">
          <View
            className="rounded-full px-2 py-0.5 mb-0.5"
            style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
          >
            <AppText
              variant="caption"
              className="font-tajawal-bold text-[10px]"
              style={{ color: '#D97706' }}
            >
              WOW • FOR BUSINESS
            </AppText>
          </View>

          <AppText
            variant="heading"
            className="font-tajawal-bold text-xl leading-7"
            style={{ color: isDark ? '#FFFFFF' : '#0F172D' }}
          >
            أعمالك بصورة أوضح
          </AppText>

          <AppText
            variant="caption"
            className="font-tajawal-medium text-xs leading-5"
            style={{ color: isDark ? '#D4D4D8' : '#475569' }}
          >
            راقب نشاطك وعروضك، واعرف ما يحتاج إلى إجراء اليوم.
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إنشاء عرض جديد"
            onPress={handleNewOffer}
            className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-xl mt-2 active:opacity-85 shadow-sm"
            style={{ backgroundColor: '#0F172D' }}
          >
            
            <AppText
              variant="label"
              className="font-tajawal-bold text-xs"
              style={{ color: '#FFFFFF' }}
            >
              إدارة العروض
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
