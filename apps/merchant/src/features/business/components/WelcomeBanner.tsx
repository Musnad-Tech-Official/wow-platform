import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
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
  const viewport = useWowViewport();
  const isDark = resolvedTheme === 'dark';

  const isSmallMobile = viewport.width <= 340;
  const isMobile = viewport.width < 600;

  const imageWidth = isSmallMobile ? 96 : isMobile ? 112 : 140;
  const imageHeight = isSmallMobile ? 48 : isMobile ? 56 : 70;

  return (
    <View
      accessibilityRole="summary"
      className="w-full flex-row items-center justify-between overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: isDark ? '#2D2614' : '#FFFDF2',
        borderColor: isDark ? '#554116' : '#FEF08A',
        padding: isMobile ? 12 : 16,
      }}
    >
      <View className="min-w-0 flex-1 items-start gap-1 pr-2">
        <AppText
          variant="heading"
          className="font-tajawal-bold"
          style={{
            color: isDark ? '#FEF08A' : colors.foreground,
            fontSize: isSmallMobile ? 15 : isMobile ? 16 : 18,
            lineHeight: isSmallMobile ? 22 : isMobile ? 24 : 26,
          }}
        >
          {title}
        </AppText>
        <AppText
          variant="caption"
          style={{
            color: isDark ? '#E2E8F0' : colors.mutedForeground,
            fontSize: isSmallMobile ? 12 : 13,
            lineHeight: isSmallMobile ? 18 : 20,
          }}
        >
          {description}
        </AppText>
      </View>
      <View
        style={{
          width: 1,
          alignSelf: 'stretch',
          backgroundColor: isDark ? '#554116' : colors.border,
          marginHorizontal: isSmallMobile ? 6 : isMobile ? 8 : 12,
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
          style={{ width: imageWidth, height: imageHeight, aspectRatio: 2 }}
          contentFit="contain"
          accessibilityLabel="شخصية بيكن أمام المتجر"
          alt="شخصية بيكن أمام المتجر"
        />
      </View>
    </View>
  );
}
