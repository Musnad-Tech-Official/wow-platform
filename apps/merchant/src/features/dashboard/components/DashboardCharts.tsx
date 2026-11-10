import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '@wow/ui';
import { useTheme } from '@wow/theme';

/**
 * Render only verifiable time-series data; never insert illustrative trends in production.
 */
export function SparklineTrend({ values, color = '#D97706' }: { values?: number[]; color?: string }) {
  if (!values || values.length === 0) {
    return <AppText variant="caption" muted className="text-center text-[10px]">الاتجاه غير متاح</AppText>;
  }
  const max = Math.max(1, ...values);
  return (
    <View className="w-full h-10 flex-row items-end justify-between px-1 pt-2">
      {values.map((val, idx) => (
        <View key={idx} className="items-center flex-1">
          <View className="w-1.5 rounded-full" style={{
            height: `${Math.max(4, Math.min(100, (val / max) * 100))}%`,
            backgroundColor: color,
          }} />
        </View>
      ))}
    </View>
  );
}

/** Accurate progress ring using SVG; percentage is derived from real current counts. */
export function DonutProportion({ percentage = 0, color = '#D97706' }: { percentage?: number; color?: string }) {
  const { resolvedTheme } = useTheme();
  const safePct = Math.min(100, Math.max(0, Number.isFinite(percentage) ? percentage : 0));
  const circumference = 2 * Math.PI * 26;
  return (
    <View className="w-16 h-16 self-center items-center justify-center my-1">
      <Svg width={64} height={64} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={26} stroke={resolvedTheme === 'dark' ? '#3F3F46' : '#E2E8F0'}
          strokeWidth={6} fill="none" />
        <Circle cx={32} cy={32} r={26} stroke={color} strokeWidth={6} fill="none"
          strokeDasharray={`${(safePct / 100) * circumference} ${circumference}`}
          strokeLinecap="round" rotation={-90} origin="32,32" />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color }}>
          {Math.round(safePct)}%
        </AppText>
      </View>
    </View>
  );
}

/** Optional real daily samples; absence is shown as unavailable, not simulated bars. */
export function WeekdayBarChart({
  data,
  color = '#3B82F6',
}: {
  data?: Array<{ label: string; value: number }>;
  color?: string;
}) {
  if (!data || data.length === 0) {
    return <AppText variant="caption" muted className="text-center text-[10px]">البيانات اليومية غير متاحة</AppText>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View className="w-full pt-1">
      <View className="h-10 flex-row items-end justify-between px-0.5">
        {data.map((item, idx) => (
          <View key={idx} className="items-center flex-1 mx-0.5">
            <View className="w-full max-w-[12px] rounded-t-sm" style={{
              height: `${Math.max(2, Math.min(100, (item.value / max) * 100))}%`, backgroundColor: color,
            }} />
          </View>
        ))}
      </View>
      <View className="flex-row items-center justify-between pt-1 border-t border-border mt-1">
        {data.map((item, idx) => (
          <View key={idx} className="flex-1 items-center">
            <AppText variant="caption" muted className="font-tajawal-medium text-[9px]">{item.label}</AppText>
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
