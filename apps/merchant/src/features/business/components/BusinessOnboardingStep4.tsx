import React, { useState } from 'react';
import { View, Pressable, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useWowApiContext, requireWowApiSession } from '@wow/api';
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
  const wowApiContext = useWowApiContext();

  const {
    activeBusinessId,
    business,
    representative,
    branches,
    documents,
    isSubmitting,
    feedback,
    isReadyToSubmit,
    canResubmit,
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

  // Validate the file extension and its magic bytes before authenticated upload.
  const acceptedMime = (name: string, bytes: ArrayBuffer):
    'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' => {
    const ext = name.split('.').pop()?.toLowerCase();
    const buf = new Uint8Array(bytes);
    const pdf = buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
    const jpg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const png = buf.length >= 8 && [137,80,78,71,13,10,26,10].every((v, i) => buf[i] === v);
    const webp = buf.length >= 12 && [82,73,70,70].every((v, i) => buf[i] === v) &&
      [87,69,66,80].every((v, i) => buf[i + 8] === v);
    if (ext === 'pdf' && pdf) return 'application/pdf';
    if ((ext === 'jpg' || ext === 'jpeg') && jpg) return 'image/jpeg';
    if (ext === 'png' && png) return 'image/png';
    if (ext === 'webp' && webp) return 'image/webp';
    throw new Error('صيغة الملف أو محتواه غير صالح؛ استخدم PDF أو JPG أو PNG أو WEBP.');
  };

  const attachFile = async (name: string, size: number, bytes: ArrayBuffer, replaceId?: string) => {
    if (!Number.isSafeInteger(size) || size < 1 || size > 10 * 1024 * 1024 || name.length > 255 ||
        size !== bytes.byteLength) {
      throw new Error('حجم الملف غير صالح أو يتجاوز 10 ميجابايت.');
    }
    const mimeType = acceptedMime(name, bytes);
    const uploaded = replaceId
      ? await handleReplaceDocument(replaceId, { name, size, mimeType, bytes })
      : await handleAddDocument({ name, size, mimeType, bytes });
    if (!uploaded) throw new Error('فشل رفع الملف. تحقق من رسالة الخطأ ثم حاول مجددًا.');
    setDocumentError(null);
  };

  const pickDocument = (replaceId?: string) => {
    if (props.readOnly || isSubmitting) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Browser pickers must be opened directly in the user activation callback.
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        void (async () => {
          try {
            const bytes = await file.arrayBuffer();
            await attachFile(file.name, file.size, bytes, replaceId);
          } catch (error: unknown) {
            setDocumentError(error instanceof Error ? error.message : 'تعذر قراءة المستند.');
          }
        })();
      };
      input.click();
      return;
    }
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      setDocumentError('منتقي المستندات غير متاح على هذا النظام.');
      return;
    }
    void (async () => {
      try {
        // Expo SDK 57: built-in picker returns an expo-file-system File on iOS/Android.
        const { File } = await import('expo-file-system');
        const picked = await File.pickFileAsync({
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          multipleFiles: false,
        });
        if (picked.canceled) return;
        const chosen = picked.result;
        const bytes = await chosen.arrayBuffer();
        await attachFile(chosen.name, chosen.size, bytes, replaceId);
      } catch (error: unknown) {
        setDocumentError(error instanceof Error ? error.message : 'تعذر اختيار المستند أو رفعه.');
      }
    })();
  };

  const previewEvidence = async (storageKey: string) => {
    if (isSyntheticPreview) {
      setDocumentError('معاينة الملفات متاحة بعد رفع مستند فعلي.');
      return;
    }
    try {
      const { client } = requireWowApiSession(wowApiContext);
      // Private bucket + owner-only Storage RLS. Link expires in 60 seconds.
      const { data, error } = await client.storage
        .from('wow-verification-evidence')
        .createSignedUrl(storageKey, 60);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('تعذر إنشاء رابط آمن للمستند.');
      await Linking.openURL(data.signedUrl);
    } catch (error: unknown) {
      setDocumentError(error instanceof Error ? error.message : 'تعذر عرض المستند.');
    }
  };

  const handleBackPress = () => {
    if (props.readOnly) {
      router.replace({
        pathname: '/business/onboarding/status',
        params: {
          ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
          ...(isSyntheticPreview ? { preview: '1' } : {}),
        },
      });
      return;
    }
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
              {!props.readOnly && (
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
              )}
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
              {!props.readOnly && (
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
              )}
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
              {!props.readOnly && (
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
              )}
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
                  {doc.isUploaded ? 'مرفق ✓' : 'يتطلب إعادة رفع'}
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
                    {doc.size ? (doc.size / (1024 * 1024)).toFixed(1) + ' MB' : '—'} • {doc.mimeType.split('/')[1]?.toUpperCase() || 'PDF'} • {doc.isUploaded ? 'تم الرفع' : 'لم يكتمل التحقق'}
                  </AppText>
                </View>
              </View>
              {doc.isUploaded && <CheckCircle2 size={18} color="#166534" />}
            </View>

            {/* Document actions: secure preview, replace and remove */}
            <View className="flex-row items-center justify-end gap-2 pt-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="عرض المستند بأمان"
                disabled={!doc.isUploaded}
                onPress={() => void previewEvidence(doc.storageKey)}
                className="px-3 py-1.5 rounded-lg active:opacity-75"
                style={{ backgroundColor: isDark ? '#27272A' : '#F1F5F9', borderWidth: 1, borderColor: colors.border }}
              >
                <AppText variant="caption" className="font-tajawal-bold text-xs">عرض</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إزالة المستند من الطلب"
                onPress={() => handleRemoveDocument(doc.id)}
                disabled={isSubmitting || props.readOnly}
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
                  إزالة
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="استبدال المستند"
                onPress={() => pickDocument(doc.id)}
                disabled={isSubmitting || props.readOnly}
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
          onPress={() => pickDocument()}
          disabled={isSubmitting || props.readOnly || documents.length >= 12}
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
            {props.readOnly ? 'تفاصيل الطلب المرسل' : isReadyToSubmit ? 'الطلب جاهز للإرسال' : 'الطلب قيد الاستكمال'}
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
            {props.readOnly
              ? 'بيانات الطلب المعروضة للقراءة فقط بعد إرساله.'
              : isReadyToSubmit
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
          title={canResubmit ? 'إعادة إرسال الطلب للمراجعة' : 'إرسال الطلب للمراجعة'}
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
          accessibilityLabel={props.readOnly ? 'العودة إلى حالة الطلب' : 'السابق: الرجوع إلى خطوة الفروع'}
          disabled={isSubmitting}
          onPress={handleBackPress}
          className="min-h-12 w-full items-center justify-center rounded-xl py-3 active:opacity-70"
        >
          <AppText
            variant="label"
            className="font-tajawal-bold text-base"
            style={{ color: colors.foreground }}
          >
            {props.readOnly ? 'العودة إلى حالة الطلب' : 'السابق'}
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
