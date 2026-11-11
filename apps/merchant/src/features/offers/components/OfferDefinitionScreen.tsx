import React, { useState } from 'react';
import { View, Pressable, TextInput, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Package, Wrench, Layers, AlertCircle, ChevronDown, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { AppText, ToastBanner } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { usePublicCategories, type OfferKind } from '@wow/api';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { useOfferEditor } from '../context/OfferEditorContext';
import { OfferEditorStepper } from './OfferEditorStepper';
import { OfferBusinessConflictModal } from './OfferBusinessConflictModal';
import { CategorySelectSheet } from '../../business/components/CategorySelectSheet';

export function OfferDefinitionScreen() {
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

  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const { data: allCategories = [] } = usePublicCategories();

  // Find selected category name
  const selectedCategory = allCategories.find((c) => c.id === draft.categoryId);
  const categoryDisplayName = selectedCategory?.name_ar || 'اختر فئة العرض';

  const offerTypes: { kind: OfferKind; label: string; icon: typeof Package }[] = [
    { kind: 'product', label: 'منتج', icon: Package },
    { kind: 'service', label: 'خدمة', icon: Wrench },
    { kind: 'bundle', label: 'حزمة', icon: Layers },
  ];

  const handleNext = async () => {
    if (isSaving || businessConflict || !validateStep(1)) return;
    // Never navigate until server-side draft/evidence persistence succeeds.
    const savedOfferId = await saveDraft();
    if (!savedOfferId) return;
    router.push({
      pathname: '/offers/editor/pricing',
      params: {
        ...(!isSyntheticPreview ? { offerId: savedOfferId } : {}),
        ...(businessId ? { businessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  return (
    <MerchantScaffold currentTab="offers">
      {/* Safeguard Modal against silent cross-business migration */}
      <OfferBusinessConflictModal
        visible={businessConflict}
        draftBusinessName={draftBusinessName}
        onKeepDraft={() => resolveBusinessConflict('keep_draft')}
        onSwitchAndReset={() => resolveBusinessConflict('switch_and_reset')}
      />

      {/* Action Toast Feedback */}
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

      {/* Stepper */}
      <OfferEditorStepper currentStep={1} />

      {/* Screen Title & Thinking Mascot Header */}
      <View
        className="w-full flex-row items-center justify-between p-4 rounded-2xl border mb-4"
        style={{
          backgroundColor: isDark ? '#27272A' : '#FEFCE8',
          borderColor: isDark ? '#3F3F46' : '#FEF08A',
        }}
      >
        <View className="flex-1 items-start gap-1">
          <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
            تعريف العرض
          </AppText>
          <AppText
            variant="caption"
            className="font-tajawal-medium text-xs leading-5 text-right"
            style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
          >
            وضّح ما سيحصل عليه العميل دون مبالغة، واربط العرض بنشاطك المعتمد.
          </AppText>
          <View className="flex-row items-center gap-1.5 mt-1">
            <CheckCircle2 size={13} color="#15803D" />
            <AppText variant="caption" className="font-tajawal-bold text-[11px] text-green-700">
              النشاط التجاري: {draftBusinessName}
            </AppText>
          </View>
        </View>

        <Image
          source={wowIllustrations.merchant.offerDefinitionThinking}
          style={{ width: 78, height: 78 }}
          resizeMode="contain"
          accessibilityLabel="تميمة واو المفكرة لصياغة العرض"
        />
      </View>

      {/* Main Form Container */}
      <View
        className="w-full rounded-2xl border p-4 gap-4 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        {/* 1. Offer Type */}
        <View className="gap-2">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            نوع العرض <AppText style={{ color: colors.danger }}>*</AppText>
          </AppText>
          <View className="flex-row items-center justify-between gap-2">
            {offerTypes.map((type) => {
              const isSelected = draft.offerKind === type.kind;
              const IconComp = type.icon;
              return (
                <Pressable
                  key={type.kind}
                  accessibilityRole="button"
                  accessibilityLabel={`نوع العرض: ${type.label}`}
                  onPress={() => updateDraft({ offerKind: type.kind })}
                  className="flex-1 min-h-[48px] py-2.5 px-3 rounded-xl border flex-row items-center justify-center gap-2 active:opacity-80"
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
                  <IconComp
                    size={18}
                    color={isSelected ? '#0F172D' : colors.foreground}
                    strokeWidth={2}
                  />
                  <AppText
                    variant="label"
                    className="font-tajawal-bold text-xs"
                    style={{ color: isSelected ? '#0F172D' : colors.foreground }}
                  >
                    {type.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {errors.offerKind ? (
            <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
              {errors.offerKind}
            </AppText>
          ) : null}
        </View>

        {/* 2. Offer Title */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            عنوان العرض <AppText style={{ color: colors.danger }}>*</AppText>
          </AppText>
          <View
            className="w-full min-h-[48px] rounded-xl border px-3 justify-center"
            style={{
              backgroundColor: colors.surface,
              borderColor: errors.title ? colors.danger : colors.border,
            }}
          >
            <TextInput
              value={draft.title}
              onChangeText={(text) => updateDraft({ title: text })}
              placeholder="مثلاً: صيانة أولية لجهازك أو خصم خاص"
              placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
              textAlign="right"
              maxLength={150}
              className="font-tajawal-medium text-sm text-foreground"
              style={{ color: colors.foreground }}
            />
          </View>
          {errors.title ? (
            <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
              {errors.title}
            </AppText>
          ) : (
            <AppText variant="caption" muted className="text-right text-[11px]">
              اكتب عنواناً مختصراً ودقيقاً يصف جوهر العرض.
            </AppText>
          )}
        </View>

        {/* 3. Offer Description */}
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <AppText variant="caption" muted className="text-[11px]">
              {draft.description.length} / 4000 حرف
            </AppText>
            <AppText variant="label" className="font-tajawal-bold text-sm text-right">
              وصف ما يشمله العرض <AppText style={{ color: colors.danger }}>*</AppText>
            </AppText>
          </View>
          <View
            className="w-full min-h-[96px] rounded-xl border p-3"
            style={{
              backgroundColor: colors.surface,
              borderColor: errors.description ? colors.danger : colors.border,
            }}
          >
            <TextInput
              value={draft.description}
              onChangeText={(text) => updateDraft({ description: text })}
              placeholder="اكتب ما يتلقاه العميل بالتحديد والمواصفات المشمولة..."
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
          {errors.description ? (
            <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
              {errors.description}
            </AppText>
          ) : null}
        </View>

        {/* 4. Offer Category */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            فئة العرض <AppText style={{ color: colors.danger }}>*</AppText>
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`فئة العرض: ${categoryDisplayName}`}
            onPress={() => setCategorySheetVisible(true)}
            className="w-full min-h-[48px] rounded-xl border px-3 flex-row items-center justify-between active:opacity-75"
            style={{
              backgroundColor: colors.surface,
              borderColor: errors.categoryId ? colors.danger : colors.border,
            }}
          >
            <ChevronDown size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
            <AppText
              variant="body"
              className="font-tajawal-bold text-sm"
              style={{
                color: draft.categoryId ? colors.foreground : isDark ? '#71717A' : '#94A3B8',
              }}
            >
              {categoryDisplayName}
            </AppText>
          </Pressable>
          {errors.categoryId ? (
            <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
              {errors.categoryId}
            </AppText>
          ) : null}

          {/* Activity Scope Explanatory Notice */}
          <View
            className="w-full p-3 rounded-xl border flex-row items-start gap-2 mt-1"
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }}
          >
            <AlertCircle size={16} color={isDark ? '#94A3B8' : '#475569'} style={{ marginTop: 2 }} />
            <View className="flex-1 items-start gap-1">
              <AppText
                variant="caption"
                className="font-tajawal-medium text-xs leading-5 text-right"
                style={{ color: isDark ? '#CBD5E1' : '#334155' }}
              >
                يجب أن تنتمي الفئة والنشاط إلى نطاق الأعمال المعتمدة لهذا التاجر.
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="طلب إضافة نشاط تجاري جديد (MER-12)"
                onPress={() => router.push('/business/status')}
                className="flex-row items-center gap-1 active:opacity-75"
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-xs"
                  style={{ color: '#D97706' }}
                >
                  طلب توسيع الأنشطة التجارية المعتمدة (MER-12)
                </AppText>
                <ArrowRight size={12} color="#D97706" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Category Selection BottomSheet */}
      <CategorySelectSheet
        visible={categorySheetVisible}
        selectedCategoryId={draft.categoryId}
        onSelect={(cat) => {
          updateDraft({ categoryId: cat.id });
          setCategorySheetVisible(false);
        }}
        onClose={() => setCategorySheetVisible(false)}
      />

      {/* Footer Navigation Buttons */}
      <View className="w-full gap-2.5 pb-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="التالي: الانتقال إلى السعر والمزايا"
          onPress={handleNext}
          disabled={!canProceed(1)}
          className="w-full min-h-[48px] rounded-xl items-center justify-center active:opacity-85 shadow-sm"
          style={{
            backgroundColor: canProceed(1) ? '#FACC15' : isDark ? '#3F3F46' : '#E2E8F0',
          }}
        >
          <AppText
            className="font-tajawal-bold text-sm"
            style={{ color: canProceed(1) ? '#0F172D' : '#94A3B8' }}
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
      </View>
    </MerchantScaffold>
  );
}
