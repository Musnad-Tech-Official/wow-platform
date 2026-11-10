import React from 'react';
import { View, Image } from 'react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';

export interface ReviewBannerProps {
  title?: string;
  description?: string;
}

export function ReviewBanner({
  title = 'راجع طلبك قبل الإرسال',
  description = 'تحقق من اكتمال بيانات النشاط والمفوض والفروع والمستندات قبل إرسال الطلب للإدارة.',
}: ReviewBannerProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <View
      className="w-full flex-row items-center gap-3.5 p-4 rounded-2xl border"
      style={{
        backgroundColor: isDark ? '#27272A' : '#FEFCE8',
        borderColor: isDark ? '#3F3F46' : '#FEF08A',
      }}
    >
      {/* Review Mascot */}
      <Image
        source={wowIllustrations.merchant.reviewMascot}
        style={{ width: 88, height: 88 }}
        resizeMode="contain"
        accessibilityLabel="تميمة مراجعة طلب التأهيل"
      />

      {/* Banner Text */}
      <View className="flex-1 items-start gap-1">
        <AppText
          variant="heading"
          className="font-tajawal-bold text-lg leading-6"
          style={{ color: colors.foreground }}
        >
          {title}
        </AppText>
        <AppText
          variant="caption"
          className="font-tajawal-medium text-xs leading-5"
          style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
        >
          {description}
        </AppText>
      </View>
    </View>
  );
}
