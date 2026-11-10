import React from 'react';
import { View } from 'react-native';
import { AppText } from '@wow/ui';
import { useTheme } from '@wow/theme';

/**
 * 1. Line Trend Sparkline Component
 */
export function SparklineTrend({ color = '#D97706' }: { color?: string }) {
  // Sparkline data points rendered using pure accessible React Native primitives
  const points = [20, 28, 22, 38, 30, 48, 55];
  const max = 60;
  const min = 15;

  return (
    <View className="w-full h-10 flex-row items-end justify-between px-1 pt-2">
      {points.map((val, idx) => {
        const heightPct = Math.max(15, Math.round(((val - min) / (max - min)) * 100));
        return (
          <View key={idx} className="items-center flex-1">
            <View
              className="w-1.5 rounded-full"
              style={{
                height: `${heightPct}%`,
                backgroundColor: color,
                opacity: idx === points.length - 1 ? 1 : 0.6 + idx * 0.06,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

/**
 * 2. Donut Proportion Component
 */
export function DonutProportion({
  percentage = 10,
  color = '#D97706',
}: {
  percentage?: number;
  color?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <View className="items-center justify-center my-1">
      <View
        className="w-16 h-16 rounded-full items-center justify-center border-4"
        style={{
          borderColor: color,
          borderLeftColor: isDark ? '#3F3F46' : '#E2E8F0',
          borderBottomColor: isDark ? '#3F3F46' : '#E2E8F0',
        }}
      >
        <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color }}>
          {percentage}%
        </AppText>
      </View>
    </View>
  );
}

/**
 * 3. 7-Day Vertical Bar Chart Component
 */
export function WeekdayBarChart({ color = '#3B82F6' }: { color?: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Days in Arabic: س (السبت), ج (الجمعة), خ (الخميس), ر (الأربعاء), ث (الثلاثاء), ن (الإثنين), ح (الأحد)
  const days = [
    { label: 'س', val: 75 },
    { label: 'ج', val: 90 },
    { label: 'خ', val: 50 },
    { label: 'ر', val: 65 },
    { label: 'ث', val: 40 },
    { label: 'ن', val: 80 },
    { label: 'ح', val: 95 },
  ];

  return (
    <View className="w-full pt-1">
      <View className="h-10 flex-row items-end justify-between px-0.5">
        {days.map((item, idx) => (
          <View key={idx} className="items-center flex-1 mx-0.5">
            <View
              className="w-full max-w-[12px] rounded-t-sm"
              style={{
                height: `${item.val}%`,
                backgroundColor: color,
                opacity: 0.75 + idx * 0.03,
              }}
            />
          </View>
        ))}
      </View>
      <View className="flex-row items-center justify-between pt-1 border-t border-border mt-1">
        {days.map((item, idx) => (
          <View key={idx} className="flex-1 items-center">
            <AppText
              variant="caption"
              className="font-tajawal-medium text-[9px]"
              style={{ color: isDark ? '#A1A1AA' : '#64748B' }}
            >
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * 4. Multi-Segmented Status Bar Component
 */
export function SegmentedStatusBar({
  openCount = 0,
  closedCount = 0,
}: {
  openCount?: number;
  closedCount?: number;
}) {
  const total = openCount + closedCount;
  const openPct = total > 0 ? (openCount / total) * 100 : 0;
  const closedPct = total > 0 ? (closedCount / total) * 100 : 0;

  return (
    <View className="w-full gap-2 pt-2">
      {/* 2-color bar */}
      <View
        className="w-full h-2.5 rounded-full flex-row overflow-hidden"
        style={{ backgroundColor: total === 0 ? '#CBD5E1' : 'transparent' }}
      >
        {total > 0 ? (
          <>
            <View
              style={{
                width: `${openPct}%`,
                backgroundColor: '#F43F5E',
              }}
            />
            <View
              style={{
                width: `${closedPct}%`,
                backgroundColor: '#10B981',
              }}
            />
          </>
        ) : (
          <View className="w-full h-full bg-slate-200 dark:bg-zinc-700" />
        )}
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-between pt-0.5">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F43F5E' }} />
          <AppText variant="caption" muted className="text-[10px]">
            {openCount} مفتوحة
          </AppText>
        </View>

        <View className="flex-row items-center gap-1.5">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
          <AppText variant="caption" muted className="text-[10px]">
            {closedCount} مغلقة
          </AppText>
        </View>
      </View>
    </View>
  );
}
