import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';

export interface OffersHeroBannerProps {
  onNewOfferPress?: () => void;
  onGuidePress?: () => void;
}

export function OffersHeroBanner({
  onNewOfferPress,
  onGuidePress,
}: OffersHeroBannerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <View
      className="w-full rounded-2xl border overflow-hidden p-4 mb-4"
      style={{
        backgroundColor: isDark ? '#27272A' : '#FEF08A',
        borderColor: isDark ? '#3F3F46' : '#FDE047',
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        {/* Offers Mascot Scene */}
        <Image
          source={wowIllustrations.merchant.offersMascot}
          style={{ width: 104, height: 98 }}
          resizeMode="contain"
          accessibilityLabel="تميمة إدارة العروض"
        />

        {/* Text and Actions */}
        <View className="flex-1 items-start gap-1">
          <AppText
            variant="heading"
            className="font-tajawal-bold text-xl leading-7"
            style={{ color: '#0F172D' }}
          >
            عروضك تحت السيطرة!
          </AppText>

          <AppText
            variant="caption"
            className="font-tajawal-medium text-xs leading-5"
            style={{ color: '#475569' }}
          >
            أنشئ عروضًا جديدة، وتابع مراجعتها وظهورها لعملائك من مكان واحد.
          </AppText>

          {/* Action Buttons Row */}
          <View className="flex-row items-center gap-2 mt-2">
            {/* Guide Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="دليل العروض"
              onPress={onGuidePress}
              className="px-3 py-1.5 rounded-xl border active:opacity-75"
              style={{
                backgroundColor: isDark ? '#3F3F46' : '#FFFFFF',
                borderColor: '#CBD5E1',
              }}
            >
              <AppText
                variant="caption"
                className="font-tajawal-bold text-xs"
                style={{ color: '#0F172D' }}
              >
                دليل العروض
              </AppText>
            </Pressable>

            {/* New Offer Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إنشاء عرض جديد"
              onPress={onNewOfferPress}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl active:opacity-85 shadow-sm"
              style={{ backgroundColor: '#0F172D' }}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              <AppText
                variant="label"
                className="font-tajawal-bold text-xs"
                style={{ color: '#FFFFFF' }}
              >
                + إنشاء عرض جديد
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
