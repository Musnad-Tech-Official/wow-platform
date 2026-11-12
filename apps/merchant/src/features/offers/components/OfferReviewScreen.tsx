import React, { useMemo } from 'react';
import { View, Pressable, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { CheckSquare, Send, Edit2, Info, ShieldCheck } from 'lucide-react-native';
import { AppText, ToastBanner } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { usePublicCategories, useBusinessBranches } from '@wow/api';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { useOfferEditor } from '../context/OfferEditorContext';
import { OfferEditorStepper } from './OfferEditorStepper';
import { OfferBusinessConflictModal } from './OfferBusinessConflictModal';
import { PREVIEW_BRANCHES_FIXTURE } from './OfferBranchesScreen';

export function OfferReviewScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const {
    draft,
    saveDraft,
    submitOfferForReview,
    isSaving,
    isSubmitting,
    actionFeedback,
    clearFeedback,
    businessConflict,
    resolveBusinessConflict,
    draftBusinessName,
    businessId,
    offerId,
    isSyntheticPreview,
  } = useOfferEditor();

  const { data: allCategories = [] } = usePublicCategories();
  const { data: serverBranches = [] } = useBusinessBranches(businessId);

  const branches = useMemo(() => {
    if (isSyntheticPreview) return PREVIEW_BRANCHES_FIXTURE;
    return serverBranches;
  }, [isSyntheticPreview, serverBranches]);

  const selectedBranches = useMemo(
    () => branches.filter((b) => draft.selectedBranchIds.includes(b.id)),
    [branches, draft.selectedBranchIds]
  );

  const selectedCategory = allCategories.find((c) => c.id === draft.categoryId);
  const categoryDisplayName = selectedCategory?.name_ar || 'إلكترونيات ومستلزمات';

  const offerKindArabic = {
    product: 'منتج',
    service: 'خدمة',
    bundle: 'حزمة',
    clearance: 'تصفية',
  }[draft.offerKind] || 'منتج';

  const benefitTypeArabic = {
    discount: 'تخفيض سعري',
    bundle: 'قيمة مضافة أو حزمة',
    gift: 'هدية أو ميزة إضافية',
  }[draft.benefitType] || 'تخفيض سعري';

  const navigateToStep = (pathname: string) => {
    router.push({
      pathname: pathname as any,
      params: {
        ...(offerId ? { offerId } : {}),
        ...(businessId ? { businessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  const handleSubmit = async () => {
    const targetOfferId = await submitOfferForReview();
    if (targetOfferId) {
      router.replace({
        pathname: '/offers/details',
        params: {
          offerId: targetOfferId,
          submitted: '1',
          ...(businessId ? { businessId } : {}),
          ...(isSyntheticPreview ? { preview: '1' } : {}),
        },
      });
    }
  };

  const handleSaveDraft = async () => {
    const savedId = await saveDraft();
    if (savedId) {
      router.push({
        pathname: '/offers',
        params: {
          ...(businessId ? { businessId } : {}),
          ...(isSyntheticPreview ? { preview: '1' } : {}),
        },
      });
    }
  };

  return (
    <MerchantScaffold currentTab="offers">
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

      {/* Stepper Step 5 */}
      <OfferEditorStepper
        currentStep={5}
        onStepPress={(s) => {
          if (s === 1) navigateToStep('/offers/editor');
          else if (s === 2) navigateToStep('/offers/editor/pricing');
          else if (s === 3) navigateToStep('/offers/editor/branches');
          else if (s === 4) navigateToStep('/offers/editor/evidence');
        }}
      />

      {/* Hero Checklist Card with Official Calm Mascot and separate UI vector icons */}
      <View
        className="w-full rounded-2xl border p-4 mb-4"
        style={{
          backgroundColor: isDark ? '#27272A' : '#FEFCE8',
          borderColor: isDark ? '#3F3F46' : '#FEF08A',
        }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 items-start gap-1">
            <View className="flex-row items-center gap-2 mb-1">
              {/* Separate UI checklist and send vector icons */}
              <View className="w-7 h-7 rounded-lg bg-yellow-500/20 items-center justify-center">
                <CheckSquare size={16} color="#D97706" />
              </View>
              <View className="w-7 h-7 rounded-lg bg-navy/10 items-center justify-center">
                <Send size={15} color="#0F172D" />
              </View>
              <AppText variant="caption" className="font-tajawal-bold text-xs text-yellow-800">
                قائمة التدقيق قبل الإرسال
              </AppText>
            </View>

            <AppText
              variant="heading"
              className="font-tajawal-bold text-lg leading-7 text-right"
              style={{ color: isDark ? '#FFFFFF' : '#0F172D' }}
            >
              راجع عرضك قبل الإرسال
            </AppText>
            <AppText
              variant="caption"
              className="font-tajawal-medium text-xs leading-5 text-right"
              style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
            >
              راجع الوصف، والسعر، والفروع، والشروط، والمستندات بدقة لضمان سرعة اعتماد العرض.
            </AppText>
          </View>

          {/* Calm Mascot */}
          <Image
            source={wowIllustrations.merchant.offerReviewBase}
            style={{ width: 84, height: 84 }}
            resizeMode="contain"
            accessibilityLabel="تميمة واو الهادئة لمراجعة وتدقيق بيانات العرض"
          />
        </View>
      </View>

      {/* Four Substantive Review Groupings */}
      <View
        className="w-full rounded-2xl border p-4 gap-4 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        {/* Section 1: Offer Definition */}
        <View className="border-b pb-3 gap-2" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تعديل تعريف العرض"
              onPress={() => navigateToStep('/offers/editor')}
              className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg border active:opacity-75"
              style={{ borderColor: colors.border }}
            >
              <Edit2 size={13} color={colors.primary} />
              <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color: colors.primary }}>
                تعديل
              </AppText>
            </Pressable>
            <AppText variant="heading" className="font-tajawal-bold text-sm text-right">
              تعريف العرض
            </AppText>
          </View>

          <View className="items-end gap-0.5">
            <AppText className="font-tajawal-bold text-sm text-right" style={{ color: colors.foreground }}>
              {draft.title || 'أدخل عنوان العرض'}
            </AppText>
            <AppText variant="caption" muted className="text-right text-[11px]">
              النوع: {offerKindArabic} • الفئة: {categoryDisplayName}
            </AppText>
            <AppText
              variant="caption"
              numberOfLines={2}
              className="font-tajawal-medium text-xs leading-5 text-right mt-1"
              style={{ color: colors.foreground }}
            >
              {draft.description || 'لم يتم إدخال الوصف بعد'}
            </AppText>
          </View>
        </View>

        {/* Section 2: Price & Terms */}
        <View className="border-b pb-3 gap-2" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تعديل السعر والشروط"
              onPress={() => navigateToStep('/offers/editor/pricing')}
              className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg border active:opacity-75"
              style={{ borderColor: colors.border }}
            >
              <Edit2 size={13} color={colors.primary} />
              <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color: colors.primary }}>
                تعديل
              </AppText>
            </Pressable>
            <AppText variant="heading" className="font-tajawal-bold text-sm text-right">
              السعر والشروط
            </AppText>
          </View>

          <View className="items-end gap-1">
            <View className="flex-row items-baseline gap-2">
              <AppText className="font-tajawal-bold text-base" style={{ color: colors.primary }}>
                {draft.finalPrice || 'السعر غير مكتمل'} {draft.currency}
              </AppText>
              {draft.originalPrice && Number(draft.originalPrice) > 0 ? (
                <AppText variant="caption" muted className="line-through text-xs">
                  {draft.originalPrice} {draft.currency}
                </AppText>
              ) : null}
            </View>

            <AppText variant="caption" muted className="text-right text-[11px]">
              نوع الفائدة: {benefitTypeArabic} •{' '}
              {draft.isClearance ? 'مخزون تصفية' : 'منتج/خدمة اعتيادية'}
            </AppText>

            {draft.mandatoryFees ? (
              <AppText variant="caption" className="font-tajawal-medium text-xs text-amber-700 text-right">
                رسوم إضافية: {draft.mandatoryFees}
              </AppText>
            ) : null}

            <AppText
              variant="caption"
              numberOfLines={2}
              className="font-tajawal-medium text-xs leading-5 text-right mt-1"
              style={{ color: colors.foreground }}
            >
              الشروط: {draft.terms || 'لم تُحدد الشروط'}
            </AppText>
          </View>
        </View>

        {/* Section 3: Branches & Dates */}
        <View className="border-b pb-3 gap-2" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تعديل الفروع والمدة"
              onPress={() => navigateToStep('/offers/editor/branches')}
              className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg border active:opacity-75"
              style={{ borderColor: colors.border }}
            >
              <Edit2 size={13} color={colors.primary} />
              <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color: colors.primary }}>
                تعديل
              </AppText>
            </Pressable>
            <AppText variant="heading" className="font-tajawal-bold text-sm text-right">
              الفروع والمدة
            </AppText>
          </View>

          <View className="items-end gap-1">
            <AppText className="font-tajawal-bold text-xs text-right" style={{ color: colors.foreground }}>
              {selectedBranches.length > 0
                ? `${selectedBranches.length} فرع مشارك: ${selectedBranches.map((b) => b.name).join('، ')}`
                : 'لم يتم تحديد فروع مؤهلة'}
            </AppText>

            <AppText variant="caption" muted className="text-right text-[11px]">
              السريان: {draft.startsAt ? draft.startsAt.slice(0, 10) : '—'} حتى{' '}
              {draft.endsAt ? draft.endsAt.slice(0, 10) : '—'}
            </AppText>

            <AppText variant="caption" className="font-tajawal-medium text-xs text-right" style={{ color: draft.merchantAvailable ? '#15803D' : '#D97706' }}>
              الحالة التشغيلية: {draft.merchantAvailable ? 'متاح للعملاء' : 'متوقف مؤقتاً'}
            </AppText>
          </View>
        </View>

        {/* Section 4: Private Evidence */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تعديل المستندات الخاصة"
              onPress={() => navigateToStep('/offers/editor/evidence')}
              className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg border active:opacity-75"
              style={{ borderColor: colors.border }}
            >
              <Edit2 size={13} color={colors.primary} />
              <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color: colors.primary }}>
                تعديل
              </AppText>
            </Pressable>
            <AppText variant="heading" className="font-tajawal-bold text-sm text-right">
              المستندات الخاصة
            </AppText>
          </View>

          <View className="items-end gap-0.5">
            {draft.evidenceFile ? (
              <View className="flex-row items-center gap-1.5">
                <AppText className="font-tajawal-bold text-xs text-green-700">
                  {draft.evidenceFile.name} ({(draft.evidenceFile.size / 1024).toFixed(0)} كيلوبايت)
                </AppText>
                <ShieldCheck size={14} color="#15803D" />
              </View>
            ) : (
              <AppText variant="caption" muted className="text-right text-[11px]">
                لم تطلب مستندات إضافية لهذا العرض
              </AppText>
            )}
          </View>
        </View>
      </View>

      {/* Submission Information Banner */}
      <View
        className="w-full flex-row items-center gap-2.5 p-3.5 rounded-xl border mb-4"
        style={{
          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        }}
      >
        <Info size={18} color={isDark ? '#94A3B8' : '#475569'} />
        <AppText
          variant="caption"
          className="font-tajawal-medium text-xs flex-1 leading-5 text-right"
          style={{ color: isDark ? '#CBD5E1' : '#334155' }}
        >
          إرسال العرض للمراجعة لا ينشره تلقائياً؛ تنتظر النسخة موافقة الإدارة وتوافر شروط الأهلية والفروع.
        </AppText>
      </View>

      {/* Action Buttons: Visually separated Submit vs Save Draft */}
      <View className="w-full gap-2.5 pb-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إرسال للمراجعة: تقديم العرض لإدارة واو"
          onPress={handleSubmit}
          disabled={isSubmitting || isSaving}
          className="w-full min-h-[48px] rounded-xl items-center justify-center active:opacity-85 shadow-sm"
          style={{ backgroundColor: '#FACC15' }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#0F172D" />
          ) : (
            <AppText className="font-tajawal-bold text-sm" style={{ color: '#0F172D' }}>
              إرسال للمراجعة
            </AppText>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="حفظ مسودة (غير منشورة وغير معروضة)"
          onPress={handleSaveDraft}
          disabled={isSaving || isSubmitting}
          className="w-full min-h-[48px] rounded-xl items-center justify-center border active:opacity-75"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <AppText className="font-tajawal-bold text-sm" style={{ color: colors.foreground }}>
              حفظ مسودة
            </AppText>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع إلى المستندات الداعمة"
          onPress={() => navigateToStep('/offers/editor/evidence')}
          className="w-full min-h-[44px] items-center justify-center active:opacity-75"
        >
          <AppText variant="caption" className="font-tajawal-bold text-sm" style={{ color: colors.foreground }}>
            رجوع
          </AppText>
        </Pressable>
      </View>
    </MerchantScaffold>
  );
}
