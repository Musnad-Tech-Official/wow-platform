import React from 'react';
import { View, Image } from 'react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';

export interface StatusBannerProps {
  status?: 'submitted' | 'needs_info' | 'approved' | 'rejected' | string;
  title?: string;
  description?: string;
}

export function StatusBanner({
  status = 'submitted',
  title,
  description,
}: StatusBannerProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const defaultTitle =
    status === 'approved'
      ? 'تم اعتماد النشاط التجاري!'
      : status === 'needs_info'
      ? 'مطلوب معلومات إضافية'
      : status === 'rejected'
      ? 'تم رفض طلب التأهيل'
      : 'طلبك قيد المراجعة';

  const defaultDesc =
    status === 'approved'
      ? 'تهانينا! أصبح نشاطك التجاري معتمدًا لدى WOW ويمكنك تفعيل الاشتراك وإدارة عروضك.'
      : status === 'needs_info'
      ? 'يرجى مراجعة ملاحظات الإدارة واستكمال المستندات المطلوبة لإعادة التقييم.'
      : status === 'rejected'
      ? 'يرجى مراجعة سبب الرفض في الملاحظات والتواصل مع فريق الدعم إذا لزم الأمر.'
      : 'نتابع حالة تأهيل نشاطك. سنخبرك بالنتيجة أو بأي متطلبات جديدة من الإدارة.';

  return (
    <View
      className="w-full flex-row items-center gap-3.5 p-4 rounded-2xl border"
      style={{
        backgroundColor: isDark ? '#27272A' : '#FEFCE8',
        borderColor: isDark ? '#3F3F46' : '#FEF08A',
      }}
    >
      {/* Status Mascot */}
      <Image
        source={wowIllustrations.merchant.statusMascot}
        style={{ width: 88, height: 88 }}
        resizeMode="contain"
        accessibilityLabel="تميمة حالة تأهيل النشاط"
      />

      {/* Banner Text */}
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
          className="font-tajawal-bold text-lg leading-6"
          style={{ color: colors.foreground }}
        >
          {title || defaultTitle}
        </AppText>
        <AppText
          variant="caption"
          className="font-tajawal-medium text-xs leading-5"
          style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
        >
          {description || defaultDesc}
        </AppText>
      </View>
    </View>
  );
}
