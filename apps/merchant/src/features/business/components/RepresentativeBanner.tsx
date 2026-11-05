import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { AppText } from '@wow/ui';

export interface RepresentativeBannerProps {
  title?: string;
  description?: string;
}

export function RepresentativeBanner({
  title = 'حدّد ممثلك المفوض',
  description = 'أدخل بيانات الشخص الذي سيدير النشاط أو يمثله رسميًا عند الحاجة.',
}: RepresentativeBannerProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const viewport = useWowViewport();
  const isDark = resolvedTheme === 'dark';

  const isSmallMobile = viewport.width <= 340;
  const isMobile = viewport.width < 600;

  // Beacon composite artwork has natural aspect ratio 1815:866 (~2.096)
  const imageWidth = isSmallMobile ? 96 : isMobile ? 115 : 140;
  const imageHeight = isSmallMobile ? 46 : isMobile ? 55 : 67;

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
      {/* Right side in RTL: Title & Subtitle */}
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

      {/* Vertical Divider */}
      <View
        style={{
          width: 1,
          alignSelf: 'stretch',
          backgroundColor: isDark ? '#554116' : colors.border,
          marginHorizontal: isSmallMobile ? 6 : isMobile ? 8 : 12,
        }}
      />

      {/* Left side in RTL: Authoritative Beacon Delegate Illustration */}
      <View
        accessibilityRole="image"
        accessibilityLabel="شخصية بيكن مع بطاقة المفوض"
        aria-label="شخصية بيكن مع بطاقة المفوض"
        className="shrink-0 items-center justify-center pl-1"
      >
        <Image
          source={wowIllustrations.merchant.onboardingBeaconDelegate}
          style={{ width: imageWidth, height: imageHeight, aspectRatio: 1815 / 866 }}
          contentFit="contain"
          accessibilityLabel="شخصية بيكن مع بطاقة المفوض"
          alt="شخصية بيكن مع بطاقة المفوض"
        />
      </View>
    </View>
  );
}
