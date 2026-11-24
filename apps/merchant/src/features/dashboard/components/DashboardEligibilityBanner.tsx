import React from 'react';
import { View } from 'react-native';
import { ShieldCheck, Check } from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';

export interface DashboardEligibilityBannerProps {
  isQualificationApproved: boolean;
  isSubscriptionActive: boolean;
  isSubscriptionKnown?: boolean;
  subscriptionKindText?: string;
}

export function DashboardEligibilityBanner({
  isQualificationApproved,
  isSubscriptionActive,
  isSubscriptionKnown = true,
  subscriptionKindText = 'الاشتراك تجريبي',
}: DashboardEligibilityBannerProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <View
      className="w-full rounded-2xl border p-4 mb-4 gap-2.5"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center justify-between">
        {/* Right side: Eligibility Label */}
        <View className="flex-row items-center gap-2">
          <View
            className="w-7 h-7 rounded-lg items-center justify-center"
            style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
          >
            <ShieldCheck size={16} color="#D97706" />
          </View>
          <AppText variant="label" className="font-tajawal-bold text-sm">
            أهلية النشاط
          </AppText>
        </View>

        {/* Left side: Status Badges */}
        <View className="flex-row items-center gap-2">
          {/* Qualification Badge */}
          <View
            className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
            style={{
              backgroundColor: isQualificationApproved
                ? isDark
                  ? '#064E3B'
                  : '#DCFCE7'
                : isDark
                ? '#422006'
                : '#FEF3C7',
            }}
          >
            {isQualificationApproved && (
              <Check size={12} color={isDark ? '#86EFAC' : '#166534'} strokeWidth={2.5} />
            )}
            <AppText
              variant="caption"
              className="font-tajawal-bold text-[11px]"
              style={{
                color: isQualificationApproved
                  ? isDark
                    ? '#86EFAC'
                    : '#166534'
                  : isDark
                  ? '#FDE047'
                  : '#D97706',
              }}
            >
              {isQualificationApproved ? 'التأهيل مكتمل' : 'قيد المراجعة'}
            </AppText>
          </View>

          {/* Subscription Badge */}
          <View
            className="rounded-full px-2.5 py-1"
            style={{
              backgroundColor: !isSubscriptionKnown ? colors.background : isSubscriptionActive
                ? isDark
                  ? '#422006'
                  : '#FEF3C7'
                : isDark
                ? '#451B20'
                : '#FEE2E2',
            }}
          >
            <AppText
              variant="caption"
              className="font-tajawal-bold text-[11px]"
              style={{
                color: !isSubscriptionKnown ? colors.mutedForeground : isSubscriptionActive
                  ? isDark
                    ? '#FDE047'
                    : '#D97706'
                  : isDark
                  ? '#FCA5A5'
                  : '#B91C1C',
              }}
            >
              {subscriptionKindText}
            </AppText>
          </View>
        </View>
      </View>

      <AppText variant="caption" muted className="text-[11px] leading-5 text-right">
        نشر كل عرض يعتمد أيضًا على حالة مراجعته والفروع وصلاحية الاشتراك.
      </AppText>
    </View>
  );
}
