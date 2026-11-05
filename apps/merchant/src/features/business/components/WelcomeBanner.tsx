import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, useWowColors } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { AppText } from '@wow/ui';

export interface WelcomeBannerProps {
  title?: string;
  description?: string;
}

export function WelcomeBanner({
  title = 'لنبدأ بإضافة نشاطك التجاري',
  description = 'أدخل البيانات الأساسية لنشاطك لإتمام طلب التأهيل.',
}: WelcomeBannerProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <View
      accessibilityRole="summary"
      className="w-full flex-row items-center justify-between overflow-hidden rounded-2xl border p-4"
      style={{
        backgroundColor: isDark ? '#2D2614' : '#FFFDF2',
        borderColor: isDark ? '#554116' : '#FEF08A',
      }}
    >
      <View className="min-w-0 flex-1 items-start gap-1 pr-3">
        <AppText
          variant="heading"
          className="font-tajawal-bold"
          style={{ color: isDark ? '#FEF08A' : colors.foreground }}
        >
          {title}
        </AppText>
        <AppText
          variant="caption"
          style={{ color: isDark ? '#E2E8F0' : colors.mutedForeground, lineHeight: 20 }}
        >
          {description}
        </AppText>
      </View>
      <View
        style={{
          width: 1,
          alignSelf: 'stretch',
          backgroundColor: isDark ? '#554116' : colors.border,
          marginHorizontal: 8,
        }}
      />
      <View
        accessibilityRole="image"
        accessibilityLabel="شخصية بيكن أمام المتجر"
        aria-label="شخصية بيكن أمام المتجر"
        className="shrink-0 items-center justify-center pl-1"
      >
        <Image
          source={wowIllustrations.merchant.onboardingBeaconStore}
          style={{ width: 140, height: 70, aspectRatio: 2 }}
          contentFit="contain"
          accessibilityLabel="شخصية بيكن أمام المتجر"
          alt="شخصية بيكن أمام المتجر"
        />
      </View>
    </View>
  );
}
