import React from 'react';
import { View, Pressable, TextInput, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { AppText, ToastBanner } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { useOfferEditor } from '../context/OfferEditorContext';
import { OfferEditorStepper } from './OfferEditorStepper';
import { OfferBusinessConflictModal } from './OfferBusinessConflictModal';

export function OfferPricingScreen() {
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
    isSyntheticPreview,
  } = useOfferEditor();

  const handleNext = async () => {
    if (isSaving || businessConflict || !validateStep(2)) return;
    // Never navigate until server-side draft/evidence persistence succeeds.
    const savedOfferId = await saveDraft();
    if (!savedOfferId) return;
    router.push({
      pathname: '/offers/editor/branches',
      params: {
        ...(!isSyntheticPreview ? { offerId: savedOfferId } : {}),
        ...(businessId ? { businessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  const handlePrev = () => {
    router.push({
      pathname: '/offers/editor',
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

      {/* Stepper Step 2 */}
      <OfferEditorStepper currentStep={2} onStepPress={(s) => {
        if (s === 1) handlePrev();
      }} />

      {/* Hero Banner with Official Guide Mascot */}
      <View
        className="w-full rounded-2xl border overflow-hidden p-4 mb-4"
        style={{
          backgroundColor: isDark ? '#27272A' : '#FEF08A',
          borderColor: isDark ? '#3F3F46' : '#FDE047',
        }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <Image
            source={wowIllustrations.merchant.offerPricingGuide}
            style={{ width: 92, height: 92 }}
            resizeMode="contain"
            accessibilityLabel="تميمة واو التوجيهية لتسعير العرض"
          />

          <View className="flex-1 items-start gap-1">
            <AppText
              variant="caption"
              className="font-tajawal-bold text-[11px] tracking-wide"
              style={{ color: isDark ? '#FDE047' : '#854D0E' }}
            >
              WOW · FOR BUSINESS
            </AppText>
            <AppText
              variant="heading"
              className="font-tajawal-bold text-lg leading-6"
              style={{ color: isDark ? '#FFFFFF' : '#0F172D' }}
            >
              القيمة الحقيقية أولاً
            </AppText>
            <AppText
              variant="caption"
              className="font-tajawal-medium text-xs leading-5"
              style={{ color: isDark ? '#D4D4D8' : '#475569' }}
            >
              اكتب السعر النهائي وجميع القيود المهمة ليتخذ العميل قراره بوضوح ودون التباس.
            </AppText>
          </View>
        </View>
      </View>

      {/* Form Container */}
      <View
        className="w-full rounded-2xl border p-4 gap-4 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          السعر والقيمة
        </AppText>

        {/* 1. Final Price */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            السعر النهائي (ريال يمني) <AppText style={{ color: colors.danger }}>*</AppText>
          </AppText>
          <View
            className="w-full min-h-[48px] rounded-xl border px-3 justify-center"
            style={{
              backgroundColor: colors.surface,
              borderColor: errors.finalPrice ? colors.danger : colors.border,
            }}
          >
            <TextInput
              value={draft.finalPrice}
              onChangeText={(text) => {
                // Keep only numeric input or single decimal point
                const clean = text.replace(/[^0-9.]/g, '');
                updateDraft({ finalPrice: clean });
              }}
              keyboardType="decimal-pad"
              placeholder="المبلغ الفعلي المطلوب"
              placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
              textAlign="right"
              className="font-tajawal-bold text-sm text-foreground"
              style={{ color: colors.foreground }}
            />
          </View>
          {errors.finalPrice ? (
            <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
              {errors.finalPrice}
            </AppText>
          ) : (
            <AppText variant="caption" muted className="text-right text-[11px]">
              هذا هو المبلغ الحقيقي الذي يدفعه العميل بالريال اليمني.
            </AppText>
          )}
        </View>

        {/* 2. Reference Price */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            السعر المرجعي (عند وجود إثبات)
          </AppText>
          <View
            className="w-full min-h-[48px] rounded-xl border px-3 justify-center"
            style={{
              backgroundColor: colors.surface,
              borderColor: errors.originalPrice ? colors.danger : colors.border,
            }}
          >
            <TextInput
              value={draft.originalPrice}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9.]/g, '');
                updateDraft({ originalPrice: clean });
              }}
              keyboardType="decimal-pad"
              placeholder="اختياري (مثلاً: السعر المعتاد قبل الخصم)"
              placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
              textAlign="right"
              className="font-tajawal-medium text-sm text-foreground"
              style={{ color: colors.foreground }}
            />
          </View>
          {errors.originalPrice ? (
            <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
              {errors.originalPrice}
            </AppText>
          ) : (
            <AppText variant="caption" muted className="text-right text-[11px]">
              يتطلب إدخال سعر مرجعي إرفاق مستند إثبات (فاتورة/تسعيرة رسمية) في الخطوة 4.
            </AppText>
          )}
        </View>

        {/* 3. Benefit Type */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            نوع الفائدة
          </AppText>
          <View className="flex-row items-center gap-2">
            {[
              { key: 'discount', label: 'تخفيض سعري' },
              { key: 'bundle', label: 'حزمة أو قيمة مضافة' },
              { key: 'gift', label: 'هدية أو ميزة إضافية' },
            ].map((item) => {
              const isSelected = draft.benefitType === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={`نوع الفائدة: ${item.label}`}
                  onPress={() => updateDraft({ benefitType: item.key as any })}
                  className="flex-1 min-h-[44px] py-2 px-2.5 rounded-xl border items-center justify-center active:opacity-80"
                  style={{
                    backgroundColor: isSelected
                      ? isDark
                        ? '#3F3F46'
                        : '#FEF08A'
                      : colors.surface,
                    borderColor: isSelected ? '#FACC15' : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  }}
                >
                  <AppText
                    variant="caption"
                    className="font-tajawal-bold text-[11px] text-center"
                    style={{ color: isSelected ? '#0F172D' : colors.foreground }}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 4. Terms and Exclusions */}
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <AppText variant="caption" muted className="text-[11px]">
              {draft.terms.length} / 4000 حرف
            </AppText>
            <AppText variant="label" className="font-tajawal-bold text-sm text-right">
              الشروط والاستثناءات <AppText style={{ color: colors.danger }}>*</AppText>
            </AppText>
          </View>
          <View
            className="w-full min-h-[96px] rounded-xl border p-3"
            style={{
              backgroundColor: colors.surface,
              borderColor: errors.terms ? colors.danger : colors.border,
            }}
          >
            <TextInput
              value={draft.terms}
              onChangeText={(text) => updateDraft({ terms: text })}
              placeholder="الكميات، المستثنيات، حدود الاستخدام، أو شروط الضمان..."
              placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
              multiline
              numberOfLines={4}
              textAlign="right"
              textAlignVertical="top"
              maxLength={4000}
              className="font-tajawal-medium text-sm text-foreground flex-1"
              style={{ color: colors.foreground }}
            />
          </View>
          {errors.terms ? (
            <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
              {errors.terms}
            </AppText>
          ) : null}
        </View>

        {/* 5. Mandatory Additional Fees */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            رسوم إضافية إلزامية
          </AppText>
          <View
            className="w-full min-h-[48px] rounded-xl border px-3 justify-center"
            style={{
              backgroundColor: colors.surface,
              borderColor: errors.mandatoryFees ? colors.danger : colors.border,
            }}
          >
            <TextInput
              value={draft.mandatoryFees}
              onChangeText={(text) => updateDraft({ mandatoryFees: text })}
              placeholder="إن وُجدت (مثلاً: ضريبة معينة أو رسوم تركيب إلزامية)"
              placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
              textAlign="right"
              maxLength={1200}
              className="font-tajawal-medium text-sm text-foreground"
              style={{ color: colors.foreground }}
            />
          </View>
        </View>

        {/* 6. Clearance or Older Stock Disclosure */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            تصفية أو مخزون أقدم
          </AppText>
          <View className="flex-row items-center gap-3">
            {[
              { val: false, label: 'لا (منتج/خدمة اعتيادية)' },
              { val: true, label: 'نعم (تصفية أو تصريف مخزون)' },
            ].map((opt) => {
              const isSelected = draft.isClearance === opt.val;
              return (
                <Pressable
                  key={String(opt.val)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  onPress={() => updateDraft({ isClearance: opt.val })}
                  className="flex-1 min-h-[44px] py-2 px-3 rounded-xl border items-center justify-center active:opacity-80"
                  style={{
                    backgroundColor: isSelected
                      ? isDark
                        ? '#3F3F46'
                        : '#FEF08A'
                      : colors.surface,
                    borderColor: isSelected ? '#FACC15' : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  }}
                >
                  <AppText
                    variant="caption"
                    className="font-tajawal-bold text-xs text-center"
                    style={{ color: isSelected ? '#0F172D' : colors.foreground }}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Locked Warning Alert */}
        <View
          className="w-full flex-row items-center gap-2.5 p-3.5 rounded-xl border mt-2"
          style={{
            backgroundColor: isDark ? '#27272A' : '#FEFCE8',
            borderColor: isDark ? '#3F3F46' : '#FEF08A',
          }}
        >
          <AlertTriangle size={18} color="#D97706" />
          <AppText
            variant="caption"
            className="font-tajawal-medium text-xs flex-1 leading-5 text-right"
            style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
          >
            لا تستخدم سعراً مرجعياً غير قابل للإثبات، ولا تُخفِ رسوماً أو شروطاً تؤثر في قرار العميل.
          </AppText>
        </View>
      </View>

      {/* Footer Buttons */}
      <View className="w-full gap-2.5 pb-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="التالي: الانتقال إلى الفروع والمدة"
          onPress={handleNext}
          disabled={!canProceed(2)}
          className="w-full min-h-[48px] rounded-xl items-center justify-center active:opacity-85 shadow-sm"
          style={{
            backgroundColor: canProceed(2) ? '#FACC15' : isDark ? '#3F3F46' : '#E2E8F0',
          }}
        >
          <AppText
            className="font-tajawal-bold text-sm"
            style={{ color: canProceed(2) ? '#0F172D' : '#94A3B8' }}
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
          accessibilityLabel="السابق: العودة إلى تعريف العرض"
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
