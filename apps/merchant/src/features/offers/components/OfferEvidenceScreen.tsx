import React, { useState } from 'react';
import { View, Pressable, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ShieldCheck, FileCheck2 } from 'lucide-react-native';
import { AppText, ToastBanner } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { useUploadWowMedia } from '@wow/api';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { useOfferEditor } from '../context/OfferEditorContext';
import { OfferEditorStepper } from './OfferEditorStepper';
import { OfferBusinessConflictModal } from './OfferBusinessConflictModal';
import { EvidencePicker, type SelectedEvidenceFile } from '../../business/components/EvidencePicker';

export function OfferEvidenceScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const {
    draft,
    updateDraft,
    errors,
    validateStep,
    canProceed,
    saveDraft,
    isSaving,
    actionFeedback,
    clearFeedback,
    businessConflict,
    resolveBusinessConflict,
    draftBusinessName,
    businessId,
    offerId,
    isEvidenceRequired,
    isSyntheticPreview,
  } = useOfferEditor();

  const uploadMutation = useUploadWowMedia();
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const handleFileChange = async (file: SelectedEvidenceFile | null) => {
    if (!file) {
      updateDraft({ evidenceFile: null });
      return;
    }

    // In synthetic preview or already uploaded file
    if (isSyntheticPreview || file.isUploaded) {
      updateDraft({
        evidenceFile: {
          ...file,
          isUploaded: true,
          storageKey: file.storageKey || 'business-verifications/dev-preview/offer-proof.pdf',
        },
      });
      return;
    }

    // Perform real private upload if new file with bytes
    if (file.bytes && businessId) {
      try {
        setUploadProgress('جارٍ رفع المستند بأمان إلى التخزين الخاص...');
        const uploaded = await uploadMutation.mutateAsync({
          scope: { kind: 'offerEvidence', businessId },
          bytes: file.bytes,
          contentType: file.mimeType,
        });

        updateDraft({
          evidenceFile: {
            ...file,
            isUploaded: true,
            storageKey: uploaded.key,
          },
        });
        setUploadProgress(null);
      } catch {
        setUploadProgress(null);
        updateDraft({
          evidenceFile: {
            ...file,
            isUploaded: false,
          },
        });
      }
    } else {
      updateDraft({ evidenceFile: file });
    }
  };

  const handleNext = async () => {
    if (isSaving || businessConflict || !validateStep(4)) return;
    // Never navigate until server-side draft/evidence persistence succeeds.
    const savedOfferId = await saveDraft();
    if (!savedOfferId) return;
    router.push({
      pathname: '/offers/editor/review',
      params: {
        ...(!isSyntheticPreview ? { offerId: savedOfferId } : {}),
        ...(businessId ? { businessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  const handlePrev = () => {
    router.push({
      pathname: '/offers/editor/branches',
      params: {
        ...(offerId ? { offerId } : {}),
        ...(businessId ? { businessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  return (
    <MerchantScaffold currentTab="offers" contentMaxWidth={880}>
      <OfferBusinessConflictModal
        visible={businessConflict}
        draftBusinessName={draftBusinessName}
        onKeepDraft={() => resolveBusinessConflict('keep_draft')}
        onSwitchAndReset={() => resolveBusinessConflict('switch_and_reset')}
      />

      {actionFeedback && (
        <View className="mb-3">
          <ToastBanner
            visible={Boolean(actionFeedback)}
            tone="info"
            message={actionFeedback}
            onDismiss={clearFeedback}
          />
        </View>
      )}

      {/* Stepper Step 4 */}
      <OfferEditorStepper
        currentStep={4}
        onStepPress={(s) => {
          if (s === 1) {
            router.push({
              pathname: '/offers/editor',
              params: {
                ...(offerId ? { offerId } : {}),
                ...(businessId ? { businessId } : {}),
                ...(isSyntheticPreview ? { preview: '1' } : {}),
              },
            });
          } else if (s === 2) {
            router.push({
              pathname: '/offers/editor/pricing',
              params: {
                ...(offerId ? { offerId } : {}),
                ...(businessId ? { businessId } : {}),
                ...(isSyntheticPreview ? { preview: '1' } : {}),
              },
            });
          } else if (s === 3) {
            handlePrev();
          }
        }}
      />

      {/* Official Privacy Hero Banner */}
      <View
        className="w-full rounded-2xl border overflow-hidden p-4 mb-4"
        style={{
          backgroundColor: isDark ? '#27272A' : '#FEFCE8',
          borderColor: isDark ? '#3F3F46' : '#FEF08A',
        }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <Image
            source={wowIllustrations.merchant.offerEvidencePrivacy}
            style={{ width: 88, height: 88 }}
            resizeMode="contain"
            accessibilityLabel="تميمة واو لحماية الخصوصية والمستندات الداعمة"
          />

          <View className="flex-1 items-start gap-1">
            <AppText
              variant="heading"
              className="font-tajawal-bold text-base leading-6 text-right"
              style={{ color: isDark ? '#FFFFFF' : '#0F172D' }}
            >
              قد نحتاج إلى إثبات قيمة العرض
            </AppText>
            <AppText
              variant="caption"
              className="font-tajawal-medium text-xs leading-5 text-right"
              style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
            >
              تُستخدم المستندات للمراجعة الخاصة فقط من قبل إدارة واو، ولا تظهر ضمن إعلان العرض العام الموجه للعملاء.
            </AppText>
          </View>
        </View>
      </View>

      {/* Section Container */}
      <View
        className="w-full rounded-2xl border p-4 gap-4 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View className="flex-row items-center justify-between">
          <View
            className="px-2.5 py-1 rounded-full border"
            style={{
              backgroundColor: isEvidenceRequired
                ? isDark
                  ? '#422006'
                  : '#FEF3C7'
                : isDark
                ? '#1E293B'
                : '#F1F5F9',
              borderColor: isEvidenceRequired ? '#F59E0B' : colors.border,
            }}
          >
            <AppText
              variant="caption"
              className="font-tajawal-bold text-[11px]"
              style={{ color: isEvidenceRequired ? '#D97706' : colors.foreground }}
            >
              {isEvidenceRequired ? 'مطلوب إثبات معتمد' : 'مستند اختياري'}
            </AppText>
          </View>

          <AppText variant="heading" className="font-tajawal-bold text-base text-right">
            المستندات المؤيدة
          </AppText>
        </View>

        {/* Conditional Requirement Explanation */}
        <AppText
          variant="caption"
          className="font-tajawal-medium text-xs leading-5 text-right"
          style={{ color: isDark ? '#D4D4D8' : '#475569' }}
        >
          {isEvidenceRequired
            ? 'نظراً لتحديد سعر مرجعي (ادعاء خصم) أو تصريح تصفية، يلزم إرفاق مستند رسمي (فاتورة شراء، تسعيرة سابقة، أو قائمة أسعار معتمدة) للتحقق من صحة القيمة.'
            : 'لم تُحدد سعراً مرجعياً استثنائياً، لذا لا يُشترط إرفاق مستندات إضافية. يمكنك إرفاق مستند توضيحي إن رغبت في تسهيل المراجعة.'}
        </AppText>

        {/* Real File Picker & Upload Component */}
        <EvidencePicker
          value={draft.evidenceFile}
          onChange={handleFileChange}
          error={errors.evidence}
          disabled={uploadMutation.isPending}
        />

        {/* Upload Progress Indicator */}
        {(uploadMutation.isPending || uploadProgress) && (
          <View className="flex-row items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <ActivityIndicator size="small" color="#2563EB" />
            <AppText variant="caption" className="font-tajawal-bold text-xs text-blue-700">
              {uploadProgress || 'جارٍ معالجة ورفع الملف بأمان...'}
            </AppText>
          </View>
        )}

        {/* Upload Success Indicator */}
        {draft.evidenceFile?.isUploaded && (
          <View className="flex-row items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <FileCheck2 size={18} color="#15803D" />
            <View className="flex-1 items-start">
              <AppText variant="caption" className="font-tajawal-bold text-xs text-green-800">
                تم رفع المستند الخاص بنجاح
              </AppText>
              <AppText variant="caption" muted className="text-[11px]">
                المستند محمي ولن يتاح إلا لمسؤول مراجعة العروض.
              </AppText>
            </View>
          </View>
        )}

        {/* Informational Guidance Box */}
        <View
          className="w-full p-3 rounded-xl border flex-row items-start gap-2.5"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          }}
        >
          <ShieldCheck size={18} color="#059669" style={{ marginTop: 2 }} />
          <View className="flex-1 items-start gap-0.5">
            <AppText
              variant="caption"
              className="font-tajawal-bold text-xs text-right"
              style={{ color: colors.foreground }}
            >
              حماية الخصوصية ومستندات التجار
            </AppText>
            <AppText
              variant="caption"
              muted
              className="font-tajawal-medium text-[11px] leading-5 text-right"
            >
              يتم حفظ مستندات الإثبات في مساحة تخزين مشفرة وخاصة بتراخيص نشاطك التجاري. لا تظهر هذه الملفات إطلاقاً في واجهات العملاء أو البحث العام.
            </AppText>
          </View>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View className="w-full gap-2.5 pb-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="التالي: الانتقال إلى المراجعة والإرسال"
          onPress={handleNext}
          disabled={!canProceed(4)}
          className="w-full min-h-[48px] rounded-xl items-center justify-center active:opacity-85 shadow-sm"
          style={{
            backgroundColor: canProceed(4) ? '#FACC15' : isDark ? '#3F3F46' : '#E2E8F0',
          }}
        >
          <AppText
            className="font-tajawal-bold text-sm"
            style={{ color: canProceed(4) ? '#0F172D' : '#94A3B8' }}
          >
            التالي
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="حفظ المسودة"
          onPress={() => void saveDraft()}
          disabled={isSaving}
          className="w-full min-h-[48px] rounded-xl items-center justify-center border active:opacity-75"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <AppText className="font-tajawal-bold text-sm" style={{ color: colors.foreground }}>
              حفظ المسودة
            </AppText>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="السابق: العودة إلى الفروع والمدة"
          onPress={handlePrev}
          className="w-full min-h-[44px] items-center justify-center active:opacity-75"
        >
          <AppText variant="caption" className="font-tajawal-bold text-sm" style={{ color: colors.foreground }}>
            السابق
          </AppText>
        </Pressable>
      </View>
    </MerchantScaffold>
  );
}
