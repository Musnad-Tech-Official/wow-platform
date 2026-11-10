import React, { useState } from 'react';
import { View, Pressable, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Store,
  User,
  MapPin,
  FileText,
  CheckCircle2,
  Lock,
  Plus,
  Info,
} from 'lucide-react-native';
import { useWowColors, useTheme, useWowViewport } from '@wow/theme';
import {
  AppButton,
  AppText,
  PageScaffold,
  Stepper,
  ToastBanner,
} from '@wow/ui';
import { ReviewBanner } from './ReviewBanner';
import {
  useBusinessOnboardingStep4,
  REPRESENTATIVE_ROLE_LABELS,
  type UseBusinessOnboardingStep4Props,
} from '../hooks/useBusinessOnboardingStep4';

export function BusinessOnboardingStep4(props: UseBusinessOnboardingStep4Props) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const viewport = useWowViewport();

  const {
    activeBusinessId,
    business,
    representative,
    branches,
    documents,
    isSubmitting,
    feedback,
    isReadyToSubmit,
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    isLoading,
    hasLoadError,
    refetch,
    isSyntheticPreview,
    handleAddDocument,
    handleReplaceDocument,
    handleRemoveDocument,
    submitVerificationRequest,
    saveDraft,
  } = useBusinessOnboardingStep4(props);

  const [documentError, setDocumentError] = useState<string | null>(null);

  // File picking on Web
  const pickFileWeb = (replaceId?: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,application/pdf,.jpg,.jpeg,image/jpeg,.png,image/png';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size <= 0) {
          setDocumentError('الملف المختار فارغ.');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setDocumentError('حجم الملف يتجاوز 10 ميجابايت.');
          return;
        }
        const ext = file.name.split('.').pop()?.toLowerCase();
        let mime: 'application/pdf' | 'image/jpeg' | 'image/png' | null = null;
        if (ext === 'pdf') mime = 'application/pdf';
        if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
        if (ext === 'png') mime = 'image/png';
        if (!mime) {
          setDocumentError('صيغة المستند غير مدعومة. استخدم PDF أو JPG أو PNG.');
          return;
        }

        const bytes = await file.arrayBuffer();
        const wasUploaded = replaceId
          ? await handleReplaceDocument(replaceId, { name: file.name, size: file.size, mimeType: mime, bytes })
          : await handleAddDocument({ name: file.name, size: file.size, mimeType: mime, bytes });
        setDocumentError(wasUploaded ? null : 'لم يكتمل رفع المستند. تحقق من رسالة الخطأ وأعد المحاولة.');
      };
      input.click();
    } else {
      // Never invent a successful upload on native. A native document picker
      // must be integrated before offering native document selection.
      setDocumentError('اختيار المستندات على الهاتف غير متاح حاليًا. استخدم الويب لإرفاق ملف حقيقي.');
    }
  };

  const handleBackPress = () => {
    if (props.onNavigateToStep) {
      props.onNavigateToStep(3, activeBusinessId || 'dev-synthetic-business-uuid');
    } else {
      router.replace({
        pathname: '/business/onboarding/branches',
        params: {
          ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
          ...(isSyntheticPreview ? { preview: '1' } : {}),
        },
      });
    }
  };

  const navigateToStep1 = () => {
    if (props.onNavigateToStep) {
      props.onNavigateToStep(1, activeBusinessId || 'dev-synthetic-business-uuid');
    } else {
      router.push({
        pathname: '/business/onboarding',
        params: {
          ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
          ...(isSyntheticPreview ? { preview: '1' } : {}),
        },
      });
    }
  };

  const navigateToStep2 = () => {
    if (props.onNavigateToStep) {
      props.onNavigateToStep(2, activeBusinessId || 'dev-synthetic-business-uuid');
    } else {
      router.push({
        pathname: '/business/onboarding/representative',
        params: {
          ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
          ...(isSyntheticPreview ? { preview: '1' } : {}),
        },
      });
    }
  };

  const navigateToStep3 = () => {
    handleBackPress();
  };

  // Branch summary text
  const branchSummaryText =
    branches.length <= 1
      ? 'الفرع الرئيسي فقط'
      : `الفرع الرئيسي + ${branches.length - 1} فرع إضافي`;

  return (
    <PageScaffold app="merchant" maxWidth={600} className="bg-background">
      {isLoading ? (
        <View className="p-8 items-center gap-3">
          <ActivityIndicator size="large" />
          <AppText muted>جارٍ تحميل بيانات طلب التأهيل...</AppText>
        </View>
      ) : hasLoadError ? (
        <View className="p-6 items-center gap-3">
          <AppText tone="danger">تعذر تحميل بيانات التأهيل. لا يمكن اعتماد اكتمال الطلب.</AppText>
          <Pressable accessibilityRole="button" onPress={refetch} className="min-h-12 px-4 rounded-xl items-center justify-center" style={{ backgroundColor: '#FACC15' }}>
            <AppText style={{ color: '#0F172D' }}>إعادة المحاولة</AppText>
          </Pressable>
        </View>
      ) : (
      <>
      {/* 1. Header Bar */}
      <View className="w-full flex-row items-center justify-between gap-2.5 pt-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={handleBackPress}
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
              طلب تأهيل نشاط
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
              مراجعة الطلب
            </AppText>
          </View>
        </View>

        {/* Step Badge */}
        <View
          accessibilityLabel="الخطوة 4 من 4"
          className="shrink-0 rounded-full px-2.5 py-1.5"
          style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
        >
          <AppText
            variant="caption"
            className="font-tajawal-bold"
            style={{ color: isDark ? '#FDE047' : '#D97706', fontSize: 12 }}
          >
            الخطوة 4 من 4
          </AppText>
        </View>
      </View>

      {/* 2. Stepper */}
      <Stepper
        steps={['النشاط', 'المفوض', 'الفروع', 'المراجعة']}
        currentStep={3}
        variant="connected"
      />

      {/* 3. Review Mascot Banner */}
      <ReviewBanner />

      {/* Toast Feedback */}
      {feedback && (
        <ToastBanner
          visible={Boolean(feedback)}
          tone={feedback.tone}
          message={feedback.text}
          onDismiss={() => {}}
        />
      )}

      {/* 4. Request Summary Section */}
      <View className="w-full gap-3 pt-1">
        <View className="items-start gap-1">
          <AppText variant="heading" className="font-tajawal-bold text-lg">
            ملخص الطلب
          </AppText>
          <AppText variant="caption" muted className="leading-5">
            راجع بيانات الأقسام السابقة. يمكنك تعديل أي قسم قبل الإرسال.
          </AppText>
        </View>

        {/* Summary Card with 3 rows */}
        <View
          className="w-full rounded-2xl border divide-y divide-border overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          {/* Row 1: Business Identity */}
          <View className="p-3.5 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                style={{ backgroundColor: isDark ? '#27272A' : '#F1F5F9' }}
              >
                <Store size={20} color={colors.foreground} />
              </View>
              <View className="items-start flex-1 min-w-0">
                <AppText
                  variant="label"
                  className="font-tajawal-bold text-sm"
                  style={{ color: colors.foreground }}
                >
                  النشاط التجاري
                </AppText>
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  className="font-tajawal-medium text-xs mt-0.5 text-muted-foreground"
                >
                  {business?.name || '—'} • {((business as Record<string, unknown>)?.requested_category_name as string) || (isSyntheticPreview ? 'أدوات منزلية (بيانات تجريبية)' : 'عام')}
                </AppText>
              </View>
            </View>

            <View className="flex-row items-center gap-2 shrink-0">
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }}
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-[11px]"
                  style={{ color: isDark ? '#86EFAC' : '#166534' }}
                >
                  {isStep1Complete ? 'مكتمل ✓' : 'غير مكتمل'}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تعديل بيانات النشاط"
                onPress={navigateToStep1}
                className="p-1 active:opacity-70"
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-xs"
                  style={{ color: colors.actionForeground || '#744A00' }}
                >
                  تعديل
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* Row 2: Representative */}
          <View className="p-3.5 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                style={{ backgroundColor: isDark ? '#27272A' : '#F1F5F9' }}
              >
                <User size={20} color={colors.foreground} />
              </View>
              <View className="items-start flex-1 min-w-0">
                <AppText
                  variant="label"
                  className="font-tajawal-bold text-sm"
                  style={{ color: colors.foreground }}
                >
                  المفوّض
                </AppText>
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  className="font-tajawal-medium text-xs mt-0.5 text-muted-foreground"
                >
                  {representative?.name || '—'} • {REPRESENTATIVE_ROLE_LABELS[(representative?.role as keyof typeof REPRESENTATIVE_ROLE_LABELS) || 'owner'] || 'مالك النشاط'}
                </AppText>
              </View>
            </View>

            <View className="flex-row items-center gap-2 shrink-0">
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }}
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-[11px]"
                  style={{ color: isDark ? '#86EFAC' : '#166534' }}
                >
                  {isStep2Complete ? 'مكتمل ✓' : 'غير مكتمل'}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تعديل بيانات المفوض"
                onPress={navigateToStep2}
                className="p-1 active:opacity-70"
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-xs"
                  style={{ color: colors.actionForeground || '#744A00' }}
                >
                  تعديل
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* Row 3: Branches */}
          <View className="p-3.5 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                style={{ backgroundColor: isDark ? '#27272A' : '#F1F5F9' }}
              >
                <MapPin size={20} color={colors.foreground} />
              </View>
              <View className="items-start flex-1 min-w-0">
                <AppText
                  variant="label"
                  className="font-tajawal-bold text-sm"
                  style={{ color: colors.foreground }}
                >
                  الفروع
                </AppText>
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  className="font-tajawal-medium text-xs mt-0.5 text-muted-foreground"
                >
                  {branchSummaryText}
                </AppText>
              </View>
            </View>

            <View className="flex-row items-center gap-2 shrink-0">
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }}
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-[11px]"
                  style={{ color: isDark ? '#86EFAC' : '#166534' }}
                >
                  {isStep3Complete ? 'مكتمل ✓' : 'غير مكتمل'}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تعديل بيانات الفروع"
                onPress={navigateToStep3}
                className="p-1 active:opacity-70"
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-xs"
                  style={{ color: colors.actionForeground || '#744A00' }}
                >
                  تعديل
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* 5. Supporting Documents Section */}
      <View className="w-full gap-3 pt-2">
        <View className="w-full flex-row items-center justify-between">
          <View className="items-start gap-1 flex-1 min-w-0">
            <AppText variant="heading" className="font-tajawal-bold text-lg">
              المستندات الخاصة بالمراجعة
            </AppText>
            <AppText variant="caption" muted className="leading-5">
              تظهر المستندات المطلوبة بحسب نوع نشاطك.
            </AppText>
          </View>

          {/* Lock Privacy Badge */}
          <View
            className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
            style={{ backgroundColor: isDark ? '#27272A' : '#FEF3C7' }}
          >
            <Lock size={12} color="#D97706" />
            <AppText
              variant="caption"
              className="font-tajawal-bold text-[11px]"
              style={{ color: '#D97706' }}
            >
              خاصة بالإدارة
            </AppText>
          </View>
        </View>

        {/* Uploaded Documents List */}
        {documents.map((doc) => (
          <View
            key={doc.id}
            className="w-full rounded-2xl border p-4 gap-3"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            {/* Document Header */}
            <View className="flex-row items-center justify-between">
              <View className="items-start">
                <AppText variant="label" className="font-tajawal-bold text-sm">
                  {doc.title}
                </AppText>
                <AppText variant="caption" muted className="text-xs">
                  متطلب توضيحي يُحدده نوع النشاط
                </AppText>
              </View>

              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }}
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-[11px]"
                  style={{ color: isDark ? '#86EFAC' : '#166534' }}
                >
                  مرفق ✓
                </AppText>
              </View>
            </View>

            {/* Document Details Box */}
            <View
              className="w-full flex-row items-center justify-between p-3 rounded-xl border"
              style={{
                backgroundColor: isDark ? '#27272A' : '#F8FAFC',
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                <FileText size={20} color={colors.primary} />
                <View className="items-start flex-1 min-w-0">
                  <AppText
                    variant="label"
                    numberOfLines={1}
                    className="font-tajawal-bold text-sm"
                  >
                    {doc.name}
                  </AppText>
                  <AppText variant="caption" muted className="text-[11px] mt-0.5">
                    {(doc.size / (1024 * 1024)).toFixed(1)} MB • {doc.mimeType.split('/')[1]?.toUpperCase() || 'PDF'} • تم الرفع
                  </AppText>
                </View>
              </View>
              <CheckCircle2 size={18} color="#166534" />
            </View>

            {/* Document Actions: Replace & Delete */}
            <View className="flex-row items-center justify-end gap-2 pt-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="حذف المستند"
                onPress={() => handleRemoveDocument(doc.id)}
                className="px-3 py-1.5 rounded-lg active:opacity-75"
                style={{
                  backgroundColor: isDark ? '#451B20' : '#FEE2E2',
                }}
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-xs"
                  style={{ color: isDark ? '#FCA5A5' : '#B91C1C' }}
                >
                  حذف
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="استبدال المستند"
                onPress={() => pickFileWeb(doc.id)}
                className="px-3 py-1.5 rounded-lg active:opacity-75"
                style={{
                  backgroundColor: isDark ? '#27272A' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-xs"
                  style={{ color: colors.foreground }}
                >
                  استبدال
                </AppText>
              </Pressable>
            </View>
          </View>
        ))}

        {/* Add Additional Supporting Document Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إضافة مستند داعم إن وجد"
          onPress={() => pickFileWeb()}
          className="w-full p-3.5 rounded-2xl border-2 border-dashed items-center justify-center flex-row gap-2 active:opacity-75"
          style={{
            borderColor: isDark ? '#3F3F46' : '#CBD5E1',
            backgroundColor: isDark ? '#18181B' : '#F8FAFC',
          }}
        >
          <Plus size={16} color={colors.foreground} />
          <AppText variant="label" className="font-tajawal-bold text-sm">
            + إضافة مستند داعم (إن وجد)
          </AppText>
        </Pressable>

        {documentError && (
          <AppText variant="caption" tone="danger" className="text-right">
            {documentError}
          </AppText>
        )}
      </View>

      {/* 6. Readiness Check Banner */}
      <View
        className="w-full flex-row items-center gap-3 p-4 rounded-2xl border mt-1"
        style={{
          backgroundColor: isReadyToSubmit
            ? isDark
              ? '#064E3B'
              : '#DCFCE7'
            : isDark
            ? '#422006'
            : '#FEF9C3',
          borderColor: isReadyToSubmit
            ? isDark
              ? '#059669'
              : '#86EFAC'
            : isDark
            ? '#B45309'
            : '#FDE047',
        }}
      >
        <CheckCircle2
          size={24}
          color={isReadyToSubmit ? (isDark ? '#86EFAC' : '#166534') : '#D97706'}
        />
        <View className="items-start flex-1 min-w-0">
          <AppText
            variant="label"
            className="font-tajawal-bold text-sm"
            style={{
              color: isReadyToSubmit
                ? isDark
                  ? '#86EFAC'
                  : '#166534'
                : isDark
                ? '#FDE047'
                : '#854D0E',
            }}
          >
            {isReadyToSubmit ? 'الطلب جاهز للإرسال' : 'الطلب قيد الاستكمال'}
          </AppText>
          <AppText
            variant="caption"
            className="text-xs mt-0.5 leading-5"
            style={{
              color: isReadyToSubmit
                ? isDark
                  ? '#A7F3D0'
                  : '#166534'
                : isDark
                ? '#FEF08A'
                : '#854D0E',
            }}
          >
            {isReadyToSubmit
              ? 'جميع البيانات والمستندات المطلوبة مكتملة.'
              : 'يرجى استكمال البيانات وإرفاق المستندات المطلوبة.'}
          </AppText>
        </View>
      </View>

      {/* 7. Important Info Notice */}
      <View
        className="w-full flex-row items-center gap-3 p-3.5 rounded-2xl border"
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
          تقديم الطلب لا يعني اعتماد النشاط أو نشره. ستراجع الإدارة البيانات والمستندات، ثم تصلك نتيجة المراجعة.
        </AppText>
      </View>

      {/* 8. Action Buttons */}
      <View className="w-full gap-3 pt-2">
        <AppButton
          title="إرسال الطلب للمراجعة"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={!isReadyToSubmit || isSubmitting || props.readOnly}
          onPress={() => void submitVerificationRequest()}
        />

        <AppButton
          title="حفظ كمسودة"
          variant="secondary"
          size="lg"
          disabled={isSubmitting || props.readOnly}
          onPress={saveDraft}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="السابق: الرجوع إلى خطوة الفروع"
          disabled={isSubmitting}
          onPress={handleBackPress}
          className="min-h-12 w-full items-center justify-center rounded-xl py-3 active:opacity-70"
        >
          <AppText
            variant="label"
            className="font-tajawal-bold text-base"
            style={{ color: colors.foreground }}
          >
            السابق
          </AppText>
        </Pressable>
      </View>

      {/* 9. Footnote */}
      <View className="py-4 items-center">
        <AppText variant="caption" muted className="font-tajawal text-[11px] text-center">
          MER-02-04 — مراجعة طلب التأهيل
        </AppText>
      </View>
      </>
      )}
    </PageScaffold>
  );
}
