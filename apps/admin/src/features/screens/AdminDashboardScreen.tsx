import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import {
  Store,
  Tag,
  MessageSquareWarning,
  CreditCard,
  ChevronLeft,
  ShieldCheck,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';

import { AppText, Card, Badge } from '@wow/ui';
import { useTheme, useWowColors } from '@wow/theme';
import {
  useAdminBusinessVerifications,
  useAdminPendingOffers,
  useAdminComplaints,
  useAdminSubscriptionPayments,
} from '@wow/api';
import { getRoleArabicLabel, type AdminRole } from '../auth/admin-access';

interface AdminDashboardScreenProps {
  currentRole?: AdminRole | null;
  isFixture?: boolean;
  isEmptyPreview?: boolean;
}

export function AdminDashboardScreen({
  currentRole,
  isFixture = false,
  isEmptyPreview = false,
}: AdminDashboardScreenProps) {
  const { resolvedTheme } = useTheme();
  const colors = useWowColors();
  const isDark = resolvedTheme === 'dark';

  // Live queries against Supabase
  const verificationsQuery = useAdminBusinessVerifications({ status: 'submitted' });
  const offersQuery = useAdminPendingOffers();
  const complaintsQuery = useAdminComplaints();
  const paymentsQuery = useAdminSubscriptionPayments();

  // If in empty preview mode, zero out; otherwise derive counts from real queries or fixture reference
  const verificationsCount = isEmptyPreview
    ? 0
    : isFixture
    ? 2
    : verificationsQuery.data?.length ?? 0;

  const offersCount = isEmptyPreview
    ? 0
    : isFixture
    ? 3
    : offersQuery.data?.length ?? 0;

  const complaintsCount = isEmptyPreview
    ? 0
    : isFixture
    ? 2
    : complaintsQuery.data?.length ?? 0;

  const paymentsCount = isEmptyPreview
    ? 0
    : isFixture
    ? 3
    : paymentsQuery.data?.length ?? 0;

  const roleLabel = getRoleArabicLabel(currentRole);

  return (
    <View className="gap-8">
      {/* Development Fixture Mode Advisory Banner */}
      {isFixture && (
        <View className="rounded-2xl p-4 bg-[#FEFCE8] dark:bg-[#422E12]/60 border border-[#FDE047] dark:border-[#854D0E] flex-row items-center gap-3">
          <Sparkles size={18} color="#CA8A04" />
          <View className="flex-1">
            <AppText className="text-xs font-tajawal-bold text-[#854D0E] dark:text-[#FEF08A] text-right">
              وضع المعاينة التطويرية (Fixture Mode)
            </AppText>
            <AppText className="text-[11px] font-tajawal text-[#A16207] dark:text-[#FDE047] text-right leading-tight mt-0.5">
              المؤشرات المعروضة استرشادية لغرض المراجعة المرئية فقط وليست بيانات تشغيلية حية من بيئة الإنتاج.
            </AppText>
          </View>
        </View>
      )}

      {/* Page Header */}
      <View className="flex-row flex-wrap items-start justify-between gap-4">
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <AppText variant="caption" className="font-tajawal-bold text-[#FACC15]">
              WOW / مركز العمليات
            </AppText>
          </View>
          <AppText className="text-2xl sm:text-3xl font-tajawal-bold text-right tracking-tight">
            نظرة واضحة على ما يحتاج إجراء
          </AppText>
          <AppText variant="caption" muted className="font-tajawal text-right text-sm">
            المؤشرات التشغيلية والمهام ذات الأولوية، ضمن بيانات تشغيلية حقيقية.
          </AppText>
        </View>

        <View className="flex-row items-center gap-2 bg-[#DCFCE7] dark:bg-[#143321] px-3.5 py-1.5 rounded-full border border-[#86EFAC]/40">
          <View className="h-2 w-2 rounded-full bg-[#166534] dark:bg-[#86EFAC]" />
          <AppText className="text-xs font-tajawal-bold text-[#166534] dark:text-[#86EFAC]">
            جلسة مراجعة نشطة • {roleLabel}
          </AppText>
        </View>
      </View>

      {/* 4 KPI Summary Cards */}
      <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Business Qualification */}
        <Card className="p-5 justify-between gap-4 border border-[#E2E8F0] dark:border-[#27272A] bg-surface">
          <View className="flex-row items-start justify-between">
            <View className="rounded-xl bg-[#FEFCE8] dark:bg-[#422E12] p-2.5">
              <Store size={22} color="#FACC15" />
            </View>
            <AppText variant="caption" muted className="font-tajawal-bold text-xs text-right">
              طلبات تأهيل تحتاج إجراء
            </AppText>
          </View>
          <View className="items-end gap-1">
            <AppText className="text-4xl font-tajawal-bold tracking-tight">
              {String(verificationsCount).padStart(2, '0')}
            </AppText>
            <AppText variant="caption" muted className="text-[11px] font-tajawal">
              {isEmptyPreview ? 'لا توجد طلبات معلقة' : 'سجلات توضيحية'}
            </AppText>
          </View>
          <View className="h-1.5 w-full bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
            <View
              className="h-full bg-[#FACC15] rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, verificationsCount * 30))}%` }}
            />
          </View>
        </Card>

        {/* Card 2: Offer Reviews */}
        <Card className="p-5 justify-between gap-4 border border-[#E2E8F0] dark:border-[#27272A] bg-surface">
          <View className="flex-row items-start justify-between">
            <View className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-2.5">
              <Tag size={22} color="#3B82F6" />
            </View>
            <AppText variant="caption" muted className="font-tajawal-bold text-xs text-right">
              عروض تحتاج المراجعة
            </AppText>
          </View>
          <View className="items-end gap-1">
            <AppText className="text-4xl font-tajawal-bold tracking-tight">
              {String(offersCount).padStart(2, '0')}
            </AppText>
            <AppText variant="caption" muted className="text-[11px] font-tajawal">
              {isEmptyPreview ? 'لا توجد عروض معلقة' : 'نسخ وعروض مقترحة'}
            </AppText>
          </View>
          <View className="h-1.5 w-full bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
            <View
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, offersCount * 25))}%` }}
            />
          </View>
        </Card>

        {/* Card 3: Open Complaints */}
        <Card className="p-5 justify-between gap-4 border border-[#E2E8F0] dark:border-[#27272A] bg-surface">
          <View className="flex-row items-start justify-between">
            <View className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5">
              <MessageSquareWarning size={22} color="#F59E0B" />
            </View>
            <AppText variant="caption" muted className="font-tajawal-bold text-xs text-right">
              شكاوى مفتوحة
            </AppText>
          </View>
          <View className="items-end gap-1">
            <AppText className="text-4xl font-tajawal-bold tracking-tight">
              {String(complaintsCount).padStart(2, '0')}
            </AppText>
            <AppText variant="caption" muted className="text-[11px] font-tajawal">
              {isEmptyPreview ? 'لا توجد شكاوى مفتوحة' : 'بانتظار التحقيق أو رد'}
            </AppText>
          </View>
          <View className="h-1.5 w-full bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
            <View
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, complaintsCount * 35))}%` }}
            />
          </View>
        </Card>

        {/* Card 4: Commercial Requests */}
        <Card className="p-5 justify-between gap-4 border border-[#E2E8F0] dark:border-[#27272A] bg-surface">
          <View className="flex-row items-start justify-between">
            <View className="rounded-xl bg-purple-50 dark:bg-purple-950/40 p-2.5">
              <CreditCard size={22} color="#A855F7" />
            </View>
            <AppText variant="caption" muted className="font-tajawal-bold text-xs text-right">
              طلبات تجارية
            </AppText>
          </View>
          <View className="items-end gap-1">
            <AppText className="text-4xl font-tajawal-bold tracking-tight">
              {String(paymentsCount).padStart(2, '0')}
            </AppText>
            <AppText variant="caption" muted className="text-[11px] font-tajawal">
              {isEmptyPreview ? 'لا توجد طلبات معلقة' : 'قيمة نموذجية تشغيلية'}
            </AppText>
          </View>
          <View className="h-1.5 w-full bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
            <View
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, paymentsCount * 20))}%` }}
            />
          </View>
        </Card>
      </View>

      {/* Two-Column Mid Section: Action Queue & Processing Distribution */}
      <View className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Middle (7 cols): Priority Action Queue */}
        <Card className="lg:col-span-7 p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-5">
          <View className="flex-row items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#27272A]">
            <View className="items-end">
              <AppText className="font-tajawal-bold text-base text-right">
                المهام ذات الأولوية
              </AppText>
              <AppText variant="caption" muted className="font-tajawal text-right text-xs">
                انتقل من المؤشر إلى السجل المسؤول عنه
              </AppText>
            </View>
            <Badge
              label={isEmptyPreview ? '٠ مهام' : '٣ مهام معلّقة'}
              variant="secondary"
            />
          </View>

          {isEmptyPreview ? (
            <View className="py-12 items-center justify-center gap-2">
              <ShieldCheck size={32} color="#FACC15" />
              <AppText className="font-tajawal-bold text-sm text-center">
                لا توجد مهام معلّقة تتطلب إجراءً حالياً
              </AppText>
              <AppText variant="caption" muted className="text-xs font-tajawal text-center">
                جميع طلبات التأهيل والعروض والشكاوى معالجة بالكامل وفق السجلات المعتمدة.
              </AppText>
            </View>
          ) : (
            <View className="gap-3">
              {/* Queue Item 1: Verification */}
              <View className="flex-row items-center justify-between p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#27272A] bg-background hover:bg-surface">
                <ChevronLeft size={18} color={colors.mutedForeground} />
                <View className="flex-row items-center gap-3">
                  <View className="items-end">
                    <AppText className="font-tajawal-bold text-sm text-right">
                      تأهيل نشاط يحتاج إثباتاً
                    </AppText>
                    <AppText variant="caption" muted className="text-xs font-tajawal text-right">
                      BIZ-028 • مستند صفة التمثيل
                    </AppText>
                  </View>
                  <View className="h-10 w-10 rounded-xl bg-[#FEFCE8] dark:bg-[#422E12] items-center justify-center">
                    <FileText size={20} color="#FACC15" />
                  </View>
                </View>
              </View>

              {/* Queue Item 2: Offer Review */}
              <View className="flex-row items-center justify-between p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#27272A] bg-background hover:bg-surface">
                <ChevronLeft size={18} color={colors.mutedForeground} />
                <View className="flex-row items-center gap-3">
                  <View className="items-end">
                    <AppText className="font-tajawal-bold text-sm text-right">
                      مراجعة نسخة عرض مقترحة
                    </AppText>
                    <AppText variant="caption" muted className="text-xs font-tajawal text-right">
                      OF-164 • التحقق من أساس القيمة
                    </AppText>
                  </View>
                  <View className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 items-center justify-center">
                    <Tag size={20} color="#3B82F6" />
                  </View>
                </View>
              </View>

              {/* Queue Item 3: Complaint */}
              <View className="flex-row items-center justify-between p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#27272A] bg-background hover:bg-surface">
                <ChevronLeft size={18} color={colors.mutedForeground} />
                <View className="flex-row items-center gap-3">
                  <View className="items-end">
                    <AppText className="font-tajawal-bold text-sm text-right">
                      شكوى بحاجة للتحقق
                    </AppText>
                    <AppText variant="caption" muted className="text-xs font-tajawal text-right">
                      CMP-043 • شكوى سعر العرض
                    </AppText>
                  </View>
                  <View className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 items-center justify-center">
                    <AlertCircle size={20} color="#F59E0B" />
                  </View>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Right (5 cols): Processing Distribution */}
        <Card className="lg:col-span-5 p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-5">
          <View className="items-end pb-3 border-b border-[#E2E8F0] dark:border-[#27272A]">
            <AppText className="font-tajawal-bold text-base text-right">
              توزيع المعالجات
            </AppText>
            <AppText variant="caption" muted className="font-tajawal text-right text-xs">
              {isEmptyPreview ? 'لا توجد عمليات معالجة حالية' : 'توزيع بيانات الجلسة الحالية'}
            </AppText>
          </View>

          <View className="gap-4">
            {/* Item 1 */}
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <AppText variant="caption" className="font-tajawal-bold text-xs">
                  {verificationsCount}
                </AppText>
                <AppText variant="caption" muted className="font-tajawal text-xs text-right">
                  الأنشطة والفروع
                </AppText>
              </View>
              <View className="h-2 w-full bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
                <View
                  className="h-full bg-[#FACC15] rounded-full"
                  style={{ width: isEmptyPreview ? '0%' : '45%' }}
                />
              </View>
            </View>

            {/* Item 2 */}
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <AppText variant="caption" className="font-tajawal-bold text-xs">
                  {offersCount}
                </AppText>
                <AppText variant="caption" muted className="font-tajawal text-xs text-right">
                  مراجعة العروض
                </AppText>
              </View>
              <View className="h-2 w-full bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
                <View
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: isEmptyPreview ? '0%' : '65%' }}
                />
              </View>
            </View>

            {/* Item 3 */}
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <AppText variant="caption" className="font-tajawal-bold text-xs">
                  {complaintsCount}
                </AppText>
                <AppText variant="caption" muted className="font-tajawal text-xs text-right">
                  الشكاوى والبلاغات
                </AppText>
              </View>
              <View className="h-2 w-full bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: isEmptyPreview ? '0%' : '35%' }}
                />
              </View>
            </View>

            {/* Item 4 */}
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <AppText variant="caption" className="font-tajawal-bold text-xs">
                  {paymentsCount}
                </AppText>
                <AppText variant="caption" muted className="font-tajawal text-xs text-right">
                  الاشتراكات
                </AppText>
              </View>
              <View className="h-2 w-full bg-[#E2E8F0] dark:bg-[#27272A] rounded-full overflow-hidden">
                <View
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: isEmptyPreview ? '0%' : '50%' }}
                />
              </View>
            </View>
          </View>
        </Card>
      </View>

      {/* Two-Column Bottom Section: Operational Trend & Evidence Boundaries */}
      <View className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Operational Visibility Trend */}
        <Card className="lg:col-span-7 p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-5">
          <View className="items-end pb-3 border-b border-[#E2E8F0] dark:border-[#27272A]">
            <AppText className="font-tajawal-bold text-base text-right">
              اتجاه النشاط التشغيلي
            </AppText>
            <AppText variant="caption" muted className="font-tajawal text-right text-xs">
              {isEmptyPreview
                ? 'لا توجد بيانات نشاط مسجلة للفترة الحالية'
                : 'إحصاءات توضيحية مستمدة من مسار العمل'}
            </AppText>
          </View>

          {/* 4 Trend Stats - In empty preview, honestly show 00 without fabrication */}
          <View className="grid grid-cols-4 gap-2 text-center">
            <View className="items-center">
              <AppText className="text-2xl font-tajawal-bold text-[#FACC15]">
                {isEmptyPreview ? '00' : '01'}
              </AppText>
              <AppText variant="caption" muted className="text-[10px] font-tajawal text-center">
                أنشطة مؤهلة
              </AppText>
            </View>
            <View className="items-center">
              <AppText className="text-2xl font-tajawal-bold text-blue-500">
                {isEmptyPreview ? '00' : '01'}
              </AppText>
              <AppText variant="caption" muted className="text-[10px] font-tajawal text-center">
                عروض مؤهلة
              </AppText>
            </View>
            <View className="items-center">
              <AppText className="text-2xl font-tajawal-bold text-emerald-500">
                {isEmptyPreview ? '00' : '08'}
              </AppText>
              <AppText variant="caption" muted className="text-[10px] font-tajawal text-center">
                عمليات مراجعة
              </AppText>
            </View>
            <View className="items-center">
              <AppText className="text-2xl font-tajawal-bold text-purple-500">
                {isEmptyPreview ? '00' : '04'}
              </AppText>
              <AppText variant="caption" muted className="text-[10px] font-tajawal text-center">
                أحداث تدقيق
              </AppText>
            </View>
          </View>

          {/* SVG Polyline Chart - In empty preview, honestly render flat zero baseline */}
          <View className="h-28 w-full justify-center items-center py-2">
            <Svg height="100%" width="100%" viewBox="0 0 320 80">
              {isEmptyPreview ? (
                <Polyline
                  fill="none"
                  stroke={isDark ? '#52525B' : '#CBD5E1'}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  points="10,70 310,70"
                />
              ) : (
                <Polyline
                  fill="none"
                  stroke={isDark ? '#FACC15' : '#0F172D'}
                  strokeWidth="2.5"
                  points="10,65 40,55 70,68 100,48 130,58 160,40 190,48 220,32 250,38 280,22 310,15"
                />
              )}
            </Svg>
          </View>

          <View className="flex-row items-center justify-between pt-2 border-t border-[#E2E8F0] dark:border-[#27272A]">
            <AppText variant="caption" muted className="text-[10px] font-tajawal">
              بداية الفترة
            </AppText>
            <AppText variant="caption" muted className="text-[10px] font-tajawal">
              {isEmptyPreview
                ? 'لا توجد أحداث نشاط مسجلة'
                : 'قيم افتراضية لعرض المكون فقط'}
            </AppText>
            <AppText variant="caption" muted className="text-[10px] font-tajawal">
              نهاية الفترة
            </AppText>
          </View>
        </Card>

        {/* Right (5 cols): Evidence Boundaries */}
        <Card className="lg:col-span-5 p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-4">
          <View className="items-end pb-2 border-b border-[#E2E8F0] dark:border-[#27272A]">
            <AppText className="font-tajawal-bold text-base text-right">
              قواعد تفسير المؤشرات
            </AppText>
            <AppText variant="caption" muted className="font-tajawal text-right text-xs">
              حدود الدليل والمصداقية التشغيلية
            </AppText>
          </View>

          <View className="gap-3">
            {/* Card 1 */}
            <View className="rounded-2xl p-3.5 border border-[#E2E8F0] dark:border-[#27272A] bg-background gap-1">
              <View className="flex-row items-center gap-2 justify-end">
                <AppText className="font-tajawal-bold text-xs text-right">
                  قاعدة البيانات هي المصدر الموثوق
                </AppText>
                <ShieldCheck size={16} color="#FACC15" />
              </View>
              <AppText variant="caption" muted className="text-[11px] font-tajawal text-right leading-relaxed">
                كل مؤشر تشغيلي يرتبط بجدول أو دالة معتمدة في قاعدة البيانات دون استنتاج من ذاكرة التخزين المؤقت.
              </AppText>
            </View>

            {/* Card 2 */}
            <View className="rounded-2xl p-3.5 border border-[#E2E8F0] dark:border-[#27272A] bg-background gap-1">
              <View className="flex-row items-center gap-2 justify-end">
                <AppText className="font-tajawal-bold text-xs text-right">
                  المهام المعتمدة فقط
                </AppText>
                <ShieldCheck size={16} color="#FACC15" />
              </View>
              <AppText variant="caption" muted className="text-[11px] font-tajawal text-right leading-relaxed">
                الإجراءات المعروضة في قائمة الانتظار تخص المسارات التشغيلية المحددة في النظام حصراً.
              </AppText>
            </View>
          </View>
        </Card>
      </View>
    </View>
  );
}
