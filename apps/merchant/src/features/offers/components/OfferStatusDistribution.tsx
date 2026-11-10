import React from 'react';
import { View } from 'react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';

export interface OfferStatusDistributionProps {
  visibleCount?: number;
  pendingCount?: number;
  draftCount?: number;
  expiredCount?: number;
  needsChangesCount?: number;
  totalCount?: number;
  pausedCount?: number;
  isSyntheticPreview?: boolean;
}

export function OfferStatusDistribution({
  visibleCount = 0,
  pendingCount = 0,
  draftCount = 0,
  expiredCount = 0,
  needsChangesCount = 0,
  totalCount = 0,
  pausedCount = 0,
  isSyntheticPreview = false,
}: OfferStatusDistributionProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const total = totalCount > 0 ? totalCount : visibleCount + pendingCount + draftCount + expiredCount + needsChangesCount + pausedCount;
  const safeTotal = total > 0 ? total : 1;

  const visiblePct = (visibleCount / safeTotal) * 100;
  const pendingPct = (pendingCount / safeTotal) * 100;
  const draftPct = (draftCount / safeTotal) * 100;
  const expiredPct = (expiredCount / safeTotal) * 100;
  const needsChangesPct = (needsChangesCount / safeTotal) * 100;
  const pausedPct = (pausedCount / safeTotal) * 100;

  return (
    <View
      className="w-full rounded-2xl border p-4 mb-4 gap-3.5"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <AppText variant="caption" muted className="text-[11px]">
          {total} عرضًا • {isSyntheticPreview ? 'بيانات توضيحية' : 'بيانات فعلية'}
        </AppText>
        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          توزيع حالات العروض
        </AppText>
      </View>

      {/* Multi-Segmented Color Bar (RTL order: Green -> Amber -> Blue -> Navy -> Red) */}
      <View
        className="w-full h-2.5 rounded-full flex-row overflow-hidden"
        style={{ backgroundColor: total === 0 ? '#CBD5E1' : 'transparent' }}
      >
        {total > 0 ? (
          <>
            {/* ظاهر: Green */}
            <View style={{ width: `${visiblePct}%`, backgroundColor: '#10B981' }} />
            {/* قيد المراجعة: Amber */}
            <View style={{ width: `${pendingPct}%`, backgroundColor: '#F59E0B' }} />
            {/* مسودة: Blue */}
            <View style={{ width: `${draftPct}%`, backgroundColor: '#3B82F6' }} />
            {/* منتهي: Navy / Slate */}
            <View style={{ width: `${expiredPct}%`, backgroundColor: '#475569' }} />
            {/* متوقف: Neutral gray */}
            <View style={{ width: `${pausedPct}%`, backgroundColor: '#94A3B8' }} />
            {/* يحتاج تعديل: Red / Rose */}
            <View style={{ width: `${needsChangesPct}%`, backgroundColor: '#F43F5E' }} />
          </>
        ) : (
          <View className="w-full h-full bg-slate-200 dark:bg-zinc-700" />
        )}
      </View>

      {/* 5 Status Pill Boxes */}
      <View className="flex-row items-center justify-between gap-1.5 pt-1">
        {/* 1. يحتاج تعديل */}
        <View
          className="flex-1 items-center py-2 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#451B20' : '#FFF1F2',
            borderColor: isDark ? '#881337' : '#FFE4E6',
          }}
        >
          <AppText
            variant="heading"
            className="font-tajawal-bold text-base"
            style={{ color: '#E11D48' }}
          >
            {needsChangesCount}
          </AppText>
          <AppText
            variant="caption"
            className="font-tajawal-medium text-[10px] mt-0.5"
            style={{ color: '#E11D48' }}
          >
            يحتاج تعديل
          </AppText>
        </View>

        {/* 2. منتهي */}
        <View
          className="flex-1 items-center py-2 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#27272A' : '#F1F5F9',
            borderColor: isDark ? '#3F3F46' : '#E2E8F0',
          }}
        >
          <AppText
            variant="heading"
            className="font-tajawal-bold text-base"
            style={{ color: isDark ? '#D4D4D8' : '#334155' }}
          >
            {expiredCount}
          </AppText>
          <AppText
            variant="caption"
            className="font-tajawal-medium text-[10px] mt-0.5"
            style={{ color: isDark ? '#A1A1AA' : '#64748B' }}
          >
            منتهي
          </AppText>
        </View>

        {/* 3. مسودة */}
        <View
          className="flex-1 items-center py-2 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
            borderColor: isDark ? '#1D4ED8' : '#DBEAFE',
          }}
        >
          <AppText
            variant="heading"
            className="font-tajawal-bold text-base"
            style={{ color: '#2563EB' }}
          >
            {draftCount}
          </AppText>
          <AppText
            variant="caption"
            className="font-tajawal-medium text-[10px] mt-0.5"
            style={{ color: '#2563EB' }}
          >
            مسودة
          </AppText>
        </View>

        {/* 4. قيد المراجعة */}
        <View
          className="flex-1 items-center py-2 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#422006' : '#FEF3C7',
            borderColor: isDark ? '#B45309' : '#FDE68A',
          }}
        >
          <AppText
            variant="heading"
            className="font-tajawal-bold text-base"
            style={{ color: '#D97706' }}
          >
            {pendingCount}
          </AppText>
          <AppText
            variant="caption"
            className="font-tajawal-medium text-[10px] mt-0.5"
            style={{ color: '#D97706' }}
          >
            قيد المراجعة
          </AppText>
        </View>

        {/* 5. ظاهر */}
        <View
          className="flex-1 items-center py-2 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
            borderColor: isDark ? '#059669' : '#A7F3D0',
          }}
        >
          <AppText
            variant="heading"
            className="font-tajawal-bold text-base"
            style={{ color: '#059669' }}
          >
            {visibleCount}
          </AppText>
          <AppText
            variant="caption"
            className="font-tajawal-medium text-[10px] mt-0.5"
            style={{ color: '#059669' }}
          >
            ظاهر
          </AppText>
        </View>
      </View>
    </View>
  );
}
