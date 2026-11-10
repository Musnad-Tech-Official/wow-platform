import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import {
  Tag,
  Clock,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  TrendingUp,
} from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import {
  SparklineTrend,
  DonutProportion,
  WeekdayBarChart,
  SegmentedStatusBar,
} from './DashboardCharts';

export interface DashboardMetricsProps {
  visibleOffersCount?: number;
  pendingOffersCount?: number;
  totalOffersCount?: number;
  inquiriesCount?: number;
  inquiriesTrend?: string;
  hasInquiriesTelemetry?: boolean;
  complaintsCount?: number;
  openComplaintsCount?: number;
  closedComplaintsCount?: number;
  isSyntheticPreview?: boolean;
}

export function DashboardMetrics({
  visibleOffersCount = 0,
  pendingOffersCount = 0,
  totalOffersCount = 0,
  inquiriesCount = 0,
  inquiriesTrend = '—',
  hasInquiriesTelemetry = false,
  complaintsCount = 0,
  openComplaintsCount = 0,
  closedComplaintsCount = 0,
  isSyntheticPreview = false,
}: DashboardMetricsProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [period, setPeriod] = useState<'30' | '7' | '90'>('30');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const pendingPercentage =
    totalOffersCount > 0 ? Math.round((pendingOffersCount / totalOffersCount) * 100) : 0;

  return (
    <View className="w-full gap-3 mb-4">
      {/* Header with Period Filter */}
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`الفترة: آخر ${period} يومًا`}
          onPress={() => setPeriodDropdownOpen(!periodDropdownOpen)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border active:opacity-75"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <ChevronDown size={14} color={isDark ? '#A1A1AA' : '#64748B'} />
          <Clock size={14} color={isDark ? '#A1A1AA' : '#64748B'} />
          <AppText variant="caption" className="font-tajawal-bold text-xs">
            آخر {period} يومًا
          </AppText>
        </Pressable>

        <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
          نظرة على أداء نشاطك
        </AppText>
      </View>

      {/* Period Dropdown Selection */}
      {periodDropdownOpen && (
        <View
          className="w-full flex-row items-center justify-around p-2 rounded-xl border mb-1"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          {(['7', '30', '90'] as const).map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityLabel={`آخر ${p} يومًا`}
              onPress={() => {
                setPeriod(p);
                setPeriodDropdownOpen(false);
              }}
              className="px-3 py-1 rounded-lg"
              style={{
                backgroundColor: period === p ? '#FACC15' : 'transparent',
              }}
            >
              <AppText
                variant="caption"
                className="font-tajawal-bold text-xs"
                style={{
                  color: period === p ? '#0F172D' : colors.foreground,
                }}
              >
                آخر {p} يومًا
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      {/* 2x2 Grid */}
      <View className="w-full flex-row flex-wrap gap-3">
        {/* Card 1: العروض الظاهرة */}
        <View
          className="rounded-2xl border p-3.5 justify-between"
          style={{
            width: '48%',
            flexGrow: 1,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            minHeight: 160,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View
              className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
              style={{ backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }}
            >
              <TrendingUp size={10} color={isDark ? '#86EFAC' : '#166534'} />
              <AppText
                variant="caption"
                className="font-tajawal-bold text-[10px]"
                style={{ color: isDark ? '#86EFAC' : '#166534' }}
              >
                12% ↗
              </AppText>
            </View>
            <View
              className="w-7 h-7 rounded-lg items-center justify-center"
              style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
            >
              <Tag size={15} color="#D97706" />
            </View>
          </View>

          <View className="items-end my-1">
            <AppText variant="caption" muted className="text-[11px]">
              العروض الظاهرة
            </AppText>
            <AppText variant="heading" className="font-tajawal-bold text-2xl mt-0.5">
              {visibleOffersCount}
            </AppText>
            <AppText variant="caption" muted className="text-[10px] mt-0.5">
              مقارنة بالفترة السابقة
            </AppText>
          </View>

          {/* Line Trend */}
          <SparklineTrend color="#D97706" />
        </View>

        {/* Card 2: قيد المراجعة */}
        <View
          className="rounded-2xl border p-3.5 justify-between"
          style={{
            width: '48%',
            flexGrow: 1,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            minHeight: 160,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="items-start">
              <AppText variant="caption" muted className="text-[11px]">
                قيد المراجعة
              </AppText>
            </View>
            <View
              className="w-7 h-7 rounded-lg items-center justify-center"
              style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
            >
              <Clock size={15} color="#D97706" />
            </View>
          </View>

          <View className="items-end my-1">
            <AppText variant="heading" className="font-tajawal-bold text-2xl">
              {pendingOffersCount}
            </AppText>
            <AppText variant="caption" muted className="text-[10px] mt-0.5">
              من أصل {totalOffersCount} عرضًا
            </AppText>
          </View>

          {/* Donut Proportion */}
          <DonutProportion percentage={pendingPercentage} color="#D97706" />

          <AppText variant="caption" muted className="text-center text-[9px]">
            حصة العروض قيد المراجعة
          </AppText>
        </View>

        {/* Card 3: الاستفسارات */}
        <View
          className="rounded-2xl border p-3.5 justify-between"
          style={{
            width: '48%',
            flexGrow: 1,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            minHeight: 160,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View
              className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
              style={{
                backgroundColor: hasInquiriesTelemetry
                  ? isDark
                    ? '#064E3B'
                    : '#DCFCE7'
                  : isDark
                  ? '#27272A'
                  : '#F1F5F9',
              }}
            >
              {hasInquiriesTelemetry && <TrendingUp size={10} color={isDark ? '#86EFAC' : '#166534'} />}
              <AppText
                variant="caption"
                className="font-tajawal-bold text-[10px]"
                style={{
                  color: hasInquiriesTelemetry
                    ? isDark
                      ? '#86EFAC'
                      : '#166534'
                    : isDark
                    ? '#A1A1AA'
                    : '#64748B',
                }}
              >
                {hasInquiriesTelemetry ? inquiriesTrend : 'قيد الإعداد'}
              </AppText>
            </View>
            <View
              className="w-7 h-7 rounded-lg items-center justify-center"
              style={{ backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' }}
            >
              <MessageSquare size={15} color="#2563EB" />
            </View>
          </View>

          <View className="items-end my-1">
            <AppText variant="caption" muted className="text-[11px]">
              الاستفسارات
            </AppText>
            <AppText variant="heading" className="font-tajawal-bold text-2xl mt-0.5">
              {inquiriesCount}
            </AppText>
            <AppText variant="caption" muted className="text-[10px] mt-0.5">
              {hasInquiriesTelemetry ? 'آخر 7 أيام' : 'لا تتوفر استفسارات مسجلة'}
            </AppText>
          </View>

          {/* 7-Day Bar Chart */}
          <WeekdayBarChart color="#3B82F6" />
        </View>

        {/* Card 4: الشكاوى المرتبطة */}
        <View
          className="rounded-2xl border p-3.5 justify-between"
          style={{
            width: '48%',
            flexGrow: 1,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            minHeight: 160,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View
              className="rounded-full px-2 py-0.5"
              style={{
                backgroundColor:
                  openComplaintsCount > 0
                    ? isDark
                      ? '#451B20'
                      : '#FEE2E2'
                    : isDark
                    ? '#064E3B'
                    : '#DCFCE7',
              }}
            >
              <AppText
                variant="caption"
                className="font-tajawal-bold text-[10px]"
                style={{
                  color:
                    openComplaintsCount > 0
                      ? isDark
                        ? '#FCA5A5'
                        : '#B91C1C'
                      : isDark
                      ? '#86EFAC'
                      : '#166534',
                }}
              >
                {openComplaintsCount > 0 ? 'تحتاج متابعة' : 'لا توجد شكاوى'}
              </AppText>
            </View>
            <View
              className="w-7 h-7 rounded-lg items-center justify-center"
              style={{
                backgroundColor:
                  openComplaintsCount > 0
                    ? isDark
                      ? '#451B20'
                      : '#FEE2E2'
                    : isDark
                    ? '#064E3B'
                    : '#DCFCE7',
              }}
            >
              <AlertCircle
                size={15}
                color={openComplaintsCount > 0 ? '#DC2626' : '#166534'}
              />
            </View>
          </View>

          <View className="items-end my-1">
            <AppText variant="caption" muted className="text-[11px]">
              الشكاوى المرتبطة
            </AppText>
            <AppText variant="heading" className="font-tajawal-bold text-2xl mt-0.5">
              {complaintsCount}
            </AppText>
            <AppText variant="caption" muted className="text-[10px] mt-0.5">
              توزيع الحالات الحالية
            </AppText>
          </View>

          {/* Segmented Status Bar */}
          <SegmentedStatusBar
            openCount={openComplaintsCount}
            closedCount={closedComplaintsCount}
          />
        </View>
      </View>
    </View>
  );
}
