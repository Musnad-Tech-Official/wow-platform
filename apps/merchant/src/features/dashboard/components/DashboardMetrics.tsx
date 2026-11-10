import React from 'react';
import { View } from 'react-native';
import {
  Tag,
  Clock,
  MessageSquare,
  AlertCircle,
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

  const pendingPercentage =
    totalOffersCount > 0 ? Math.round((pendingOffersCount / totalOffersCount) * 100) : 0;

  return (
    <View className="w-full gap-3 mb-4">
      <View className="flex-row items-center justify-between">
        <View className="rounded-xl border border-border px-3 py-2" style={{ backgroundColor: colors.surface }}>
          <AppText variant="caption" muted>الحالة الحالية</AppText>
        </View>
        <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
          نظرة على أداء نشاطك
        </AppText>
      </View>

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
              <AppText
                variant="caption"
                className="font-tajawal-bold text-[10px]"
                style={{ color: isDark ? '#86EFAC' : '#166534' }}
              >
                دون مقارنة تاريخية
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
              العدد الحالي
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
              {hasInquiriesTelemetry ? inquiriesCount : '—'}
            </AppText>
            <AppText variant="caption" muted className="text-[10px] mt-0.5">
              {hasInquiriesTelemetry ? 'بيانات الاستفسارات المسجلة' : 'إحصاءات الاستفسارات غير متاحة'}
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
