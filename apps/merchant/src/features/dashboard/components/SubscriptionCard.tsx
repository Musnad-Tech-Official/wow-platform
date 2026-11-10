import React from 'react';
import { View, Pressable } from 'react-native';
import { Crown } from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';

export interface SubscriptionCardProps {
  planName?: string;
  daysRemaining?: number;
  endsAtText?: string;
  progressPercentage?: number;
  onPressDetails?: () => void;
}

export function SubscriptionCard({
  planName = 'الفترة التجريبية',
  daysRemaining = 7,
  endsAtText = '28 نوفمبر 2026',
  progressPercentage = 75,
  onPressDetails,
}: SubscriptionCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <View className="w-full gap-3 mb-4">
      <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
        اشتراك النشاط
      </AppText>

      <View
        className="w-full rounded-2xl border p-4 gap-3.5"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between">
          {/* Days Left Badge */}
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
          >
            <AppText
              variant="caption"
              className="font-tajawal-bold text-xs"
              style={{ color: '#D97706' }}
            >
              {daysRemaining} أيام متبقية
            </AppText>
          </View>

          {/* Right side: Plan Name & Crown Icon */}
          <View className="flex-row items-center gap-2.5">
            <View className="items-end">
              <AppText variant="label" className="font-tajawal-bold text-sm">
                {planName}
              </AppText>
              <AppText variant="caption" muted className="text-[11px] mt-0.5">
                باقة النشاط الحالية
              </AppText>
            </View>

            <View
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
            >
              <Crown size={18} color="#D97706" />
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="w-full h-2 rounded-full overflow-hidden bg-border">
          <View
            style={{
              width: `${progressPercentage}%`,
              height: '100%',
              backgroundColor: '#FACC15',
            }}
          />
        </View>

        {/* Footer: Expiry date & Link */}
        <View className="flex-row items-center justify-between pt-1 border-t border-border">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="تفاصيل الاشتراك"
            onPress={onPressDetails}
            className="p-1 active:opacity-75"
          >
            <AppText
              variant="caption"
              className="font-tajawal-bold text-xs"
              style={{ color: colors.actionForeground || '#744A00' }}
            >
              تفاصيل الاشتراك ←
            </AppText>
          </Pressable>

          <AppText variant="caption" muted className="text-xs">
            ينتهي في {endsAtText}
          </AppText>
        </View>
      </View>
    </View>
  );
}
