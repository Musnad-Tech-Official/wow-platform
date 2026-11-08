import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { AppText } from '@wow/ui';

export interface BranchesBannerProps {
  title?: string;
  description?: string;
}

export function BranchesBanner({
  title = 'أضف فروع نشاطك',
  description = 'أدخل مواقع الفروع التي تخدم عملاءك ضمن طلب التأهيل.',
}: BranchesBannerProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const viewport = useWowViewport();
  const isDark = resolvedTheme === 'dark';

  const isSmallMobile = viewport.width <= 340;
  const isMobile = viewport.width < 600;

  // Beacon mascot with store has natural square aspect ratio (1254x1254)
  const imageSize = isSmallMobile ? 68 : isMobile ? 80 : 96;

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

      {/* Left side in RTL: Authoritative Approved Store Mascot Illustration */}
      <View
        accessibilityRole="image"
        accessibilityLabel="شخصية بيكن مع مجسم المتجر والفروع"
        aria-label="شخصية بيكن مع مجسم المتجر والفروع"
        className="shrink-0 items-center justify-center pl-1"
      >
        <Image
          source={wowIllustrations.merchant.onboardingBeaconBranches}
          style={{ width: imageSize, height: imageSize, aspectRatio: 1 }}
          contentFit="contain"
          accessibilityLabel="شخصية بيكن مع مجسم المتجر والفروع"
          alt="شخصية بيكن مع مجسم المتجر والفروع"
        />
      </View>
    </View>
  );
}
