import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronDown,
  Info,
} from 'lucide-react-native';
import { useWowColors, useTheme, useWowViewport } from '@wow/theme';
import { AppButton, AppText, PageScaffold } from '@wow/ui';
import { StatusBanner } from './StatusBanner';
import {
  useBusinessQualificationStatus,
  type UseBusinessQualificationStatusProps,
} from '../hooks/useBusinessQualificationStatus';

export function BusinessQualificationStatusScreen(props: UseBusinessQualificationStatusProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const viewport = useWowViewport();

  const {
    activeBusinessId,
    business,
    displayRequestId,
    status,
    verificationStatusLabel,
    businessStatusLabel,
    canContinueToDashboard,
    branchCountText,
    submittedAtText,
    updatedAtText,
    merchantFeedback,
    isSyntheticPreview,
  } = useBusinessQualificationStatus(props);

  const isApproved = status === 'approved';
  const isNeedsInfo = status === 'needs_info';
  const isRejected = status === 'rejected';
  const isPending = status === 'submitted';
  const isDraft = status === 'draft';

  const handleBack = () => {
    router.replace({
      pathname: '/',
      params: {
        ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  const handleViewDetails = () => {
    router.push({
      pathname: '/business/onboarding/review',
      params: {
        ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
        readOnly: '1',
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  const handleGoDashboard = () => {
    router.replace({
      pathname: '/',
      params: {
        ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  const handleRevise = () => {
    router.push({
      pathname: '/business/onboarding/review',
      params: {
        ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  return (
    <PageScaffold app="merchant" maxWidth={600} className="bg-background">
      {/* 1. Header Bar */}
      <View className="w-full flex-row items-center justify-between gap-2.5 pt-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={handleBack}
            className="min-h-12 min-w-12 items-center justify-center rounded-xl active:opacity-75"
            style={{
              width: 48,
              height: 48,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
          </Pressable>

          <View className="min-w-0 flex-1 items-start gap-0.5">
            <AppText variant="caption" muted className="font-tajawal-medium">
              طلب تأهيل النشاط التجاري
            </AppText>
            <AppText
              variant="heading"
              className="font-tajawal-bold"
              accessibilityRole="header"
              style={{
                fontSize: viewport.width <= 340 ? 17 : viewport.width < 420 ? 19 : 24,
                lineHeight: viewport.width <= 340 ? 24 : viewport.width < 420 ? 26 : 32,
              }}
            >
              حالة التأهيل
            </AppText>
          </View>
        </View>

        {/* Top Badge */}
        <View
          accessibilityLabel="متابعة الطلب"
          className="shrink-0 rounded-full px-3 py-1.5"
          style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
        >
          <AppText
            variant="caption"
            className="font-tajawal-bold"
            style={{ color: isDark ? '#FDE047' : '#D97706', fontSize: 12 }}
          >
            متابعة الطلب
          </AppText>
        </View>
      </View>

      {/* 2. Business Selector Card */}
      <View
        className="w-full flex-row items-center justify-between p-3 rounded-2xl border"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <ChevronDown size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
        <View className="flex-row items-center gap-2.5">
          <View className="items-end">
            <AppText variant="caption" muted className="text-[11px]">
              النشاط الحالي
            </AppText>
            <AppText variant="label" className="font-tajawal-bold text-sm">
              {business?.name || '—'}
            </AppText>
            <AppText variant="caption" muted className="text-[10px]">
              حالة النشاط: {businessStatusLabel}
            </AppText>
          </View>
          <View
            className="w-8 h-8 rounded-lg items-center justify-center"
            style={{ backgroundColor: isDark ? '#27272A' : '#F1F5F9' }}
          >
            <Building2 size={16} color={colors.foreground} />
          </View>
        </View>
      </View>

      {/* 3. Status Mascot Banner */}
      <StatusBanner status={status} />

      {/* 4. Request Status Section */}
      <View className="w-full gap-3 pt-1">
        <View className="items-start gap-1">
          <AppText variant="caption" muted className="font-tajawal-medium text-xs">
            الحالة الفعلية للطلب
          </AppText>
          <AppText variant="heading" className="font-tajawal-bold text-lg">
            حالة طلب التأهيل
          </AppText>
        </View>

        {/* Status Highlight Card */}
        <View
          className="w-full rounded-2xl border p-4 gap-3.5"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View
              className="rounded-full px-3 py-1"
              style={{
                backgroundColor: isApproved
                  ? isDark
                    ? '#064E3B'
                    : '#DCFCE7'
                  : isNeedsInfo
                  ? isDark
                    ? '#451B20'
                    : '#FEE2E2'
                  : isDark
                  ? '#422006'
                  : '#FEF3C7',
              }}
            >
              <AppText
                variant="caption"
                className="font-tajawal-bold text-xs"
                style={{
                  color: isApproved
                    ? isDark
                      ? '#86EFAC'
                      : '#166534'
                    : isNeedsInfo
                    ? isDark
                      ? '#FCA5A5'
                      : '#B91C1C'
                    : '#D97706',
                }}
              >
                {isApproved
                  ? 'تم الاعتماد ✓'
                  : isNeedsInfo
                  ? 'مطلوب معلومات إضافية'
                  : isRejected
                  ? 'مرفوض'
                  : isDraft ? 'لم يُرسل بعد' : 'قيد المراجعة'}
              </AppText>
            </View>

            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{
                backgroundColor: isApproved
                  ? isDark
                    ? '#064E3B'
                    : '#DCFCE7'
                  : isDark
                  ? '#422006'
                  : '#FEF3C7',
              }}
            >
              {isApproved ? (
                <CheckCircle2 size={22} color={isDark ? '#86EFAC' : '#166534'} />
              ) : isNeedsInfo || isRejected ? (
                <AlertCircle size={22} color="#DC2626" />
              ) : (
                <Clock size={22} color="#D97706" />
              )}
            </View>
          </View>

          <AppText
            variant="body"
            className="font-tajawal-medium text-xs leading-5 text-right text-muted-foreground"
          >
            {isApproved
              ? 'تمت مراجعة بيانات نشاطك واعتماد طلب التأهيل بنجاح.'
              : isNeedsInfo
              ? 'يحتاج فريق الإدارة إلى مستندات أو معلومات إضافية لاستكمال المراجعة.'
              : isRejected
              ? 'لم يستوفِ الطلب متطلبات التأهيل. يرجى مراجعة الملاحظات أدناه.'
              : 'تم استلام طلبك، ويجري فريق الإدارة مراجعته حاليًا. لا يلزمك إجراء إضافي في الوقت الحالي.'}
          </AppText>

          {/* 3-Step Progress Track */}
          <View className="w-full flex-row items-center justify-between pt-3 border-t border-border">
            {/* Step 3: صدور القرار */}
            <View className="items-center gap-1.5 flex-1">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isApproved
                    ? '#166534'
                    : isRejected
                    ? '#DC2626'
                    : isDark
                    ? '#27272A'
                    : '#F1F5F9',
                }}
              >
                {isApproved ? (
                  <CheckCircle2 size={16} color="#FFFFFF" />
                ) : (
                  <AppText
                    variant="caption"
                    className="font-tajawal-bold text-xs"
                    style={{
                      color: isRejected
                        ? '#FFFFFF'
                        : isDark
                        ? '#A1A1AA'
                        : '#64748B',
                    }}
                  >
                    3
                  </AppText>
                )}
              </View>
              <AppText variant="caption" className="font-tajawal-bold text-[11px]">
                صدور القرار
              </AppText>
              <AppText variant="caption" muted className="text-[10px]">
                {isApproved
                  ? 'تم الاعتماد'
                  : isRejected
                  ? 'تم الرفض'
                  : 'لم يصدر بعد'}
              </AppText>
            </View>

            {/* Connecting Line 2 */}
            <View
              className="h-0.5 flex-1 mx-1"
              style={{
                backgroundColor: isApproved ? '#166534' : colors.border,
              }}
            />

            {/* Step 2: قيد المراجعة */}
            <View className="items-center gap-1.5 flex-1">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isApproved
                    ? '#166534'
                    : isPending
                    ? '#0F172D'
                    : '#D97706',
                }}
              >
                {isApproved ? (
                  <CheckCircle2 size={16} color="#FFFFFF" />
                ) : (
                  <AppText
                    variant="caption"
                    className="font-tajawal-bold text-xs"
                    style={{ color: '#FFFFFF' }}
                  >
                    2
                  </AppText>
                )}
              </View>
              <AppText variant="caption" className="font-tajawal-bold text-[11px]">
                قيد المراجعة
              </AppText>
              <AppText variant="caption" muted className="text-[10px]">
                {isApproved ? 'اكتمل' : 'الحالة الحالية'}
              </AppText>
            </View>

            {/* Connecting Line 1 */}
            <View
              className="h-0.5 flex-1 mx-1"
              style={{ backgroundColor: '#166534' }}
            />

            {/* Step 1: تم الإرسال */}
            <View className="items-center gap-1.5 flex-1">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: '#166534' }}
              >
                <CheckCircle2 size={16} color="#FFFFFF" />
              </View>
              <AppText variant="caption" className="font-tajawal-bold text-[11px]">
                تم الإرسال
              </AppText>
              <AppText variant="caption" muted className="text-[10px]">
                اكتمل
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {/* 5. Request Details Grid */}
      <View className="w-full gap-3 pt-2">
        <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
          تفاصيل الطلب
        </AppText>

        <View
          className="w-full rounded-2xl border p-4 gap-4"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          {/* Row 1: رقم الطلب & نوع الطلب */}
          <View className="flex-row items-center justify-between">
            <View className="items-start flex-1">
              <AppText variant="caption" muted className="text-[11px]">
                نوع الطلب
              </AppText>
              <AppText variant="label" className="font-tajawal-bold text-xs mt-0.5">
                تأهيل نشاط تجاري
              </AppText>
            </View>
            <View className="items-end flex-1">
              <AppText variant="caption" muted className="text-[11px]">
                رقم الطلب
              </AppText>
              <AppText variant="label" className="font-tajawal-bold text-xs mt-0.5">
                {displayRequestId}
              </AppText>
            </View>
          </View>

          <View className="h-[1px] w-full bg-border" />

          {/* Row 2: آخر تحديث & تاريخ الإرسال */}
          <View className="flex-row items-center justify-between">
            <View className="items-start flex-1">
              <AppText variant="caption" muted className="text-[11px]">
                آخر تحديث
              </AppText>
              <AppText variant="label" className="font-tajawal-bold text-xs mt-0.5">
                {updatedAtText}
              </AppText>
            </View>
            <View className="items-end flex-1">
              <AppText variant="caption" muted className="text-[11px]">
                تاريخ الإرسال
              </AppText>
              <AppText variant="label" className="font-tajawal-bold text-xs mt-0.5">
                {submittedAtText}
              </AppText>
            </View>
          </View>

          <View className="h-[1px] w-full bg-border" />

          {/* Row 3: حالة المعالجة & عدد الفروع */}
          <View className="flex-row items-center justify-between">
            <View className="items-start flex-1">
              <AppText variant="caption" muted className="text-[11px]">
                حالة المعالجة
              </AppText>
              <AppText variant="label" className="font-tajawal-bold text-xs mt-0.5">
                {verificationStatusLabel}
              </AppText>
            </View>
            <View className="items-end flex-1">
              <AppText variant="caption" muted className="text-[11px]">
                عدد الفروع
              </AppText>
              <AppText variant="label" className="font-tajawal-bold text-xs mt-0.5">
                {branchCountText}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {/* 6. Management Notes Section */}
      <View className="w-full gap-3 pt-2">
        <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
          ملاحظات الإدارة
        </AppText>

        <View
          className="w-full rounded-2xl border p-4 gap-1.5"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          {merchantFeedback ? (
            <AppText variant="body" className="font-tajawal-medium text-xs leading-5 text-right">
              {merchantFeedback}
            </AppText>
          ) : (
            <>
              <AppText variant="label" className="font-tajawal-bold text-sm text-right">
                لا توجد ملاحظات حاليًا
              </AppText>
              <AppText variant="caption" muted className="text-xs leading-5 text-right">
                إذا احتاجت الإدارة إلى معلومات إضافية، ستظهر ملاحظاتها هنا مع الإجراء المطلوب منك.
              </AppText>
            </>
          )}
        </View>
      </View>

      {/* 7. Important Info Notice */}
      <View
        className="w-full flex-row items-center gap-3 p-3.5 rounded-2xl border mt-1"
        style={{
          backgroundColor: isDark ? '#27272A' : '#FEFCE8',
          borderColor: isDark ? '#3F3F46' : '#FEF08A',
        }}
      >
        <Info size={20} color="#D97706" />
        <AppText
          variant="caption"
          className="font-tajawal-medium text-xs flex-1 leading-5"
          style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
        >
          معلومة مهمة: قبول التأهيل لا يعني الموافقة التلقائية على نشر العروض. تتحدد الإجراءات المتاحة بعد صدور القرار وفق حالة النشاط.
        </AppText>
      </View>

      {/* 8. Action Buttons */}
      <View className="w-full gap-3 pt-2">
        {canContinueToDashboard ? (
          <AppButton
            title="الانتقال إلى لوحة التحكم"
            variant="primary"
            size="lg"
            onPress={handleGoDashboard}
          />
        ) : isNeedsInfo || isDraft ? (
          <AppButton
            title="استكمال المتطلبات وإعادة الإرسال"
            variant="primary"
            size="lg"
            onPress={handleRevise}
          />
        ) : (
          <AppButton
            title="عرض تفاصيل الطلب"
            variant="primary"
            size="lg"
            onPress={handleViewDetails}
          />
        )}

        <AppButton
          title="العودة إلى طلباتي"
          variant="secondary"
          size="lg"
          onPress={handleBack}
        />

        <AppText variant="caption" muted className="text-center font-tajawal text-xs">
          تتغير الحالة والإجراءات آليًا بناءً على قرار الإدارة.
        </AppText>
      </View>

      {/* 9. Footnote */}
      <View className="py-4 items-center">
        <AppText variant="caption" muted className="font-tajawal text-[11px] text-center">
          MER-02-05 — حالة طلب التأهيل
        </AppText>
      </View>
    </PageScaffold>
  );
}
