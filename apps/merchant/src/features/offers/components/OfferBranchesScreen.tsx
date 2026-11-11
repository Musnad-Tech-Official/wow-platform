import React, { useMemo } from 'react';
import { View, Pressable, TextInput, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Calendar, MapPin, CheckSquare, Square, AlertCircle } from 'lucide-react-native';
import { AppText, ToastBanner } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import { useBusinessBranches, type Branch } from '@wow/api';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { useOfferEditor } from '../context/OfferEditorContext';
import { OfferEditorStepper } from './OfferEditorStepper';
import { OfferBusinessConflictModal } from './OfferBusinessConflictModal';

export const PREVIEW_BRANCHES_FIXTURE: Branch[] = [
  {
    id: 'branch-tahrir-uuid',
    business_id: 'dev-synthetic-business-uuid',
    name: 'فرع التحرير',
    city: 'تعز',
    address_line: 'شارع جمال - مجمع التحرير التجاري',
    district: 'وسط المدينة',
    status: 'approved',
    is_primary: true,
    latitude: 13.5795,
    longitude: 44.0209,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'branch-sayna-uuid',
    business_id: 'dev-synthetic-business-uuid',
    name: 'فرع صيانة',
    city: 'تعز',
    address_line: 'جولة المسبح - جوار مركز الصيانة',
    district: 'المسبح',
    status: 'pending',
    is_primary: false,
    latitude: 13.582,
    longitude: 44.018,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  },
];

export function OfferBranchesScreen() {
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

  const { data: serverBranches = [], isLoading: isLoadingBranches } = useBusinessBranches(businessId);

  const branches = useMemo(() => {
    if (isSyntheticPreview) return PREVIEW_BRANCHES_FIXTURE;
    return serverBranches;
  }, [isSyntheticPreview, serverBranches]);

  const approvedBranches = useMemo(() => branches.filter((b) => b.status === 'approved'), [branches]);

  const allEligibleSelected =
    approvedBranches.length > 0 &&
    approvedBranches.every((b) => draft.selectedBranchIds.includes(b.id));

  const toggleBranch = (branchId: string, isApproved: boolean) => {
    if (!isApproved) return;
    const exists = draft.selectedBranchIds.includes(branchId);
    const next = exists
      ? draft.selectedBranchIds.filter((id) => id !== branchId)
      : [...draft.selectedBranchIds, branchId];
    updateDraft({ selectedBranchIds: next });
  };

  const toggleAllEligible = () => {
    if (allEligibleSelected) {
      updateDraft({ selectedBranchIds: [] });
    } else {
      updateDraft({ selectedBranchIds: approvedBranches.map((b) => b.id) });
    }
  };

  const handleNext = async () => {
    if (isSaving || businessConflict || !validateStep(3)) return;
    // Never navigate until server-side draft/evidence persistence succeeds.
    const savedOfferId = await saveDraft();
    if (!savedOfferId) return;
    router.push({
      pathname: '/offers/editor/evidence',
      params: {
        ...(!isSyntheticPreview ? { offerId: savedOfferId } : {}),
        ...(businessId ? { businessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  const handlePrev = () => {
    router.push({
      pathname: '/offers/editor/pricing',
      params: {
        ...(offerId ? { offerId } : {}),
        ...(businessId ? { businessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
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

      {/* Stepper Step 3 */}
      <OfferEditorStepper
        currentStep={3}
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
            handlePrev();
          }
        }}
      />

      {/* Hero Banner with Official Character + Calendar Composite */}
      <View
        className="w-full rounded-2xl border overflow-hidden p-4 mb-4"
        style={{
          backgroundColor: isDark ? '#27272A' : '#EFF6FF',
          borderColor: isDark ? '#3F3F46' : '#BFDBFE',
        }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <Image
            source={wowIllustrations.merchant.offerBranchesCalendar}
            style={{ width: 110, height: 78 }}
            resizeMode="contain"
            accessibilityLabel="تميمة واو مع التقويم ودبوس الفرع المعتمد"
          />

          <View className="flex-1 items-start gap-1">
            <AppText
              variant="heading"
              className="font-tajawal-bold text-base leading-6 text-right"
              style={{ color: isDark ? '#FFFFFF' : '#1E3A8A' }}
            >
              الفروع المشاركة والمدة
            </AppText>
            <AppText
              variant="caption"
              className="font-tajawal-medium text-xs leading-5 text-right"
              style={{ color: isDark ? '#D4D4D8' : '#3B82F6' }}
            >
              حدد الفروع المؤهلة لتقديم العرض، وتاريخ بداية ونهاية سريانه.
            </AppText>
          </View>
        </View>
      </View>

      {/* Section 1: Participating Branches */}
      <View
        className="w-full rounded-2xl border p-4 gap-3 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View className="flex-row items-center justify-between">
          {approvedBranches.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={allEligibleSelected ? 'إلغاء تحديد الكل' : 'تحديد كل الفروع المؤهلة'}
              onPress={toggleAllEligible}
              className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg border active:opacity-75"
              style={{ borderColor: colors.border }}
            >
              <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color: colors.primary }}>
                {allEligibleSelected ? 'إلغاء تحديد الكل' : 'تحديد كل الفروع المؤهلة'}
              </AppText>
            </Pressable>
          )}

          <View className="items-end">
            <AppText variant="heading" className="font-tajawal-bold text-base text-right">
              الفروع المشاركة <AppText style={{ color: colors.danger }}>*</AppText>
            </AppText>
            <AppText variant="caption" muted className="text-right text-[11px]">
              اعتماد الفرع شرط مستقل عن اعتماد محتوى العرض.
            </AppText>
          </View>
        </View>

        {isLoadingBranches ? (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" muted className="mt-2">جارٍ تحميل فروع النشاط...</AppText>
          </View>
        ) : branches.length === 0 ? (
          <View className="p-4 rounded-xl border items-center gap-2" style={{ borderColor: colors.border }}>
            <MapPin size={24} color="#94A3B8" />
            <AppText variant="label" className="text-xs">لا توجد فروع مسجلة لهذا النشاط.</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/business/onboarding/branches')}
              className="px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: '#FACC15' }}
            >
              <AppText className="font-tajawal-bold text-xs text-navy">إضافة فرع جديد</AppText>
            </Pressable>
          </View>
        ) : (
          <View className="gap-2.5">
            {branches.map((branch) => {
              const isApproved = branch.status === 'approved';
              const isSelected = draft.selectedBranchIds.includes(branch.id);

              return (
                <Pressable
                  key={branch.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled: !isApproved }}
                  accessibilityLabel={`${branch.name}: ${
                    isApproved ? 'فرع مؤهل' : 'بانتظار تأهيل الفرع'
                  }`}
                  disabled={!isApproved}
                  onPress={() => toggleBranch(branch.id, isApproved)}
                  className="w-full min-h-[56px] p-3 rounded-xl border flex-row items-center justify-between gap-3 active:opacity-80"
                  style={{
                    backgroundColor: isSelected
                      ? isDark
                        ? '#3F3F46'
                        : '#FEF08A'
                      : !isApproved
                      ? isDark
                        ? '#18181B'
                        : '#F8FAFC'
                      : colors.surface,
                    borderColor: isSelected
                      ? '#FACC15'
                      : isDark
                      ? '#3F3F46'
                      : '#E2E8F0',
                    borderWidth: isSelected ? 2 : 1,
                    opacity: isApproved ? 1 : 0.6,
                  }}
                >
                  {/* Selection Checkbox */}
                  <View className="shrink-0">
                    {isSelected ? (
                      <CheckSquare size={22} color="#0F172D" />
                    ) : (
                      <Square size={22} color={isDark ? '#71717A' : '#94A3B8'} />
                    )}
                  </View>

                  {/* Branch Details */}
                  <View className="flex-1 items-end gap-0.5">
                    <View className="flex-row items-center gap-1.5">
                      <AppText
                        className="font-tajawal-bold text-sm text-right"
                        style={{ color: isSelected ? '#0F172D' : colors.foreground }}
                      >
                        {branch.name}
                      </AppText>
                    </View>
                    <AppText
                      variant="caption"
                      muted
                      className="text-right text-[11px]"
                      style={{ color: isSelected ? '#334155' : undefined }}
                    >
                      {branch.city} • {branch.district || branch.address_line || 'فرع معتمد'} •{' '}
                      <AppText
                        className="font-tajawal-bold text-[11px]"
                        style={{
                          color: isApproved ? '#15803D' : '#D97706',
                        }}
                      >
                        {isApproved ? 'فرع مؤهل' : 'بانتظار تأهيل الفرع'}
                      </AppText>
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {errors.branches ? (
          <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
            {errors.branches}
          </AppText>
        ) : null}

        {/* Branch Qualification Warning */}
        <View
          className="w-full flex-row items-center gap-2 p-2.5 rounded-xl border mt-1"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          }}
        >
          <AlertCircle size={15} color={isDark ? '#94A3B8' : '#64748B'} />
          <AppText
            variant="caption"
            className="font-tajawal-medium text-[11px] flex-1 text-right"
            style={{ color: isDark ? '#CBD5E1' : '#475569' }}
          >
            اختيار فرع غير مؤهل لا يمنحه صلاحية نشر العرض فيه. يجب أن يكون الفرع معتمداً.
          </AppText>
        </View>
      </View>

      {/* Section 2: Duration & Availability */}
      <View
        className="w-full rounded-2xl border p-4 gap-4 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          المدة والتوفر
        </AppText>

        {/* Date Inputs */}
        <View className="flex-row items-center justify-between gap-3">
          {/* End Date */}
          <View className="flex-1 gap-1.5">
            <AppText variant="label" className="font-tajawal-bold text-xs text-right">
              تاريخ النهاية <AppText style={{ color: colors.danger }}>*</AppText>
            </AppText>
            <View
              className="w-full min-h-[48px] rounded-xl border px-3 flex-row items-center justify-between"
              style={{
                backgroundColor: colors.surface,
                borderColor: errors.endsAt ? colors.danger : colors.border,
              }}
            >
              <Calendar size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
              <TextInput
                value={draft.endsAt ? draft.endsAt.slice(0, 10) : ''}
                onChangeText={(text) => {
                  // ISO format: YYYY-MM-DD
                  updateDraft({ endsAt: text ? `${text}T23:59:59.000Z` : '' });
                }}
                placeholder="2026-12-15"
                placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                textAlign="right"
                maxLength={10}
                className="font-tajawal-bold text-xs text-foreground flex-1 ml-2"
                style={{ color: colors.foreground }}
              />
            </View>
          </View>

          {/* Start Date */}
          <View className="flex-1 gap-1.5">
            <AppText variant="label" className="font-tajawal-bold text-xs text-right">
              تاريخ البداية <AppText style={{ color: colors.danger }}>*</AppText>
            </AppText>
            <View
              className="w-full min-h-[48px] rounded-xl border px-3 flex-row items-center justify-between"
              style={{
                backgroundColor: colors.surface,
                borderColor: errors.startsAt ? colors.danger : colors.border,
              }}
            >
              <Calendar size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
              <TextInput
                value={draft.startsAt ? draft.startsAt.slice(0, 10) : ''}
                onChangeText={(text) => {
                  updateDraft({ startsAt: text ? `${text}T00:00:00.000Z` : '' });
                }}
                placeholder="2026-11-15"
                placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                textAlign="right"
                maxLength={10}
                className="font-tajawal-bold text-xs text-foreground flex-1 ml-2"
                style={{ color: colors.foreground }}
              />
            </View>
          </View>
        </View>

        {errors.startsAt ? (
          <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
            {errors.startsAt}
          </AppText>
        ) : errors.endsAt ? (
          <AppText variant="caption" style={{ color: colors.danger }} className="text-right">
            {errors.endsAt}
          </AppText>
        ) : (
          <AppText variant="caption" muted className="text-right text-[11px]">
            أدخل التاريخ بالصيغة (YYYY-MM-DD). التواريخ الموضحة أمثلة توضيحية وليست قيمًا افتراضية.
          </AppText>
        )}

        {/* Availability Toggle */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            التوفر الآن
          </AppText>
          <View className="flex-row items-center gap-3">
            {[
              { val: true, label: 'متاح للعملاء' },
              { val: false, label: 'متوقف مؤقتاً من التاجر' },
            ].map((opt) => {
              const isSelected = draft.merchantAvailable === opt.val;
              return (
                <Pressable
                  key={String(opt.val)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  onPress={() => updateDraft({ merchantAvailable: opt.val })}
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

        {/* Quantity or Time Restrictions */}
        <View className="gap-1.5">
          <AppText variant="label" className="font-tajawal-bold text-sm text-right">
            قيود الكمية أو الأوقات
          </AppText>
          <View
            className="w-full min-h-[72px] rounded-xl border p-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <TextInput
              value={draft.quantityOrTimeNotice}
              onChangeText={(text) => updateDraft({ quantityOrTimeNotice: text })}
              placeholder="إن وُجدت (مثلاً: العرض سارٍ خلال الفترة الصباحية فقط، أو حد أقصى قطعتين لكل عميل)"
              placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
              multiline
              numberOfLines={2}
              textAlign="right"
              textAlignVertical="top"
              maxLength={1200}
              className="font-tajawal-medium text-sm text-foreground flex-1"
              style={{ color: colors.foreground }}
            />
          </View>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View className="w-full gap-2.5 pb-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="التالي: الانتقال إلى المستندات الداعمة"
          onPress={handleNext}
          disabled={!canProceed(3)}
          className="w-full min-h-[48px] rounded-xl items-center justify-center active:opacity-85 shadow-sm"
          style={{
            backgroundColor: canProceed(3) ? '#FACC15' : isDark ? '#3F3F46' : '#E2E8F0',
          }}
        >
          <AppText
            className="font-tajawal-bold text-sm"
            style={{ color: canProceed(3) ? '#0F172D' : '#94A3B8' }}
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
          accessibilityLabel="السابق: العودة إلى السعر والمزايا"
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
