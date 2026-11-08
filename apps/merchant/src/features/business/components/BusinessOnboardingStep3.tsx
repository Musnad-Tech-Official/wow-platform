import { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Store, MapPin, Building2, Pencil, Trash2, Info } from 'lucide-react-native';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import {
  AppButton,
  AppInput,
  AppText,
  Card,
  ConfirmDialog,
  InlineNotice,
  PageScaffold,
  Stepper,
} from '@wow/ui';
import type { Branch } from '@wow/api';
import { BranchesBanner } from './BranchesBanner';
import { BranchEditorModal, type BranchEditorData } from './BranchEditorModal';
import {
  useBusinessOnboardingStep3,
  type UseBusinessOnboardingStep3Props,
} from '../hooks/useBusinessOnboardingStep3';

export function BusinessOnboardingStep3(props: UseBusinessOnboardingStep3Props) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const viewport = useWowViewport();
  const isDark = resolvedTheme === 'dark';

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingBranchData, setEditingBranchData] = useState<BranchEditorData | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  const {
    isAuthLoaded,
    isSignedIn,
    activeBusinessId,
    existingBusiness,
    isSyntheticPreview,
    isBusinessLoading,
    isBranchesLoading,
    businessLoadError,
    branchesLoadError,
    hasLoadError,
    isReadOnly,
    readOnlyMessage,
    isSaving,
    hasUnsavedChanges,
    feedback,
    isUncertain,
    // Primary branch
    primaryBranch,
    primaryName,
    primaryCity,
    primaryAddress,
    primaryNameError,
    primaryCityError,
    primaryAddressError,
    handlePrimaryNameChange,
    handlePrimaryCityChange,
    handlePrimaryAddressChange,
    persistPrimaryBranch,
    // Additional branches
    additionalBranches,
    createAdditionalBranch,
    updateAdditionalBranch,
    deleteAdditionalBranch,
    // Flow actions
    saveDraft,
    saveAndContinue,
    reconcileState,
  } = useBusinessOnboardingStep3(props);

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      navigateToPrevious();
    }
  };

  const navigateToPrevious = () => {
    const params: Record<string, string> = {};
    if (activeBusinessId) {
      params.businessId = activeBusinessId;
    }
    if (isSyntheticPreview) {
      params.preview = '1';
    }
    if (activeBusinessId || isSyntheticPreview) {
      router.replace({
        pathname: '/business/onboarding/representative',
        params,
      });
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/business/onboarding/representative');
    }
  };

  const handleDiscardAndExit = () => {
    setShowExitConfirm(false);
    navigateToPrevious();
  };

  // Intercept Android hardware back press when unsaved changes exist
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const onHardwareBack = () => {
      if (hasUnsavedChanges) {
        setShowExitConfirm(true);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [hasUnsavedChanges]);

  // Auth loading state
  if (!isAuthLoaded) {
    return (
      <PageScaffold app="merchant">
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="label" muted style={{ marginTop: 16 }}>
            جارٍ التحقق من تسجيل الدخول...
          </AppText>
        </View>
      </PageScaffold>
    );
  }

  // Not signed in state
  if (!isSignedIn) {
    return (
      <PageScaffold app="merchant">
        <View className="gap-6 py-8">
          <InlineNotice
            tone="warning"
            title="تسجيل الدخول مطلوب"
            description="يرجى تسجيل الدخول بحساب تاجر للمتابعة إلى إضافة فروع النشاط التجاري."
          />
        </View>
      </PageScaffold>
    );
  }

  // Business and branches loading state
  if (isBusinessLoading || isBranchesLoading) {
    return (
      <PageScaffold app="merchant">
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="label" muted style={{ marginTop: 16 }}>
            جارٍ تحميل بيانات النشاط والفروع...
          </AppText>
        </View>
      </PageScaffold>
    );
  }

  // Real mode query error guard (F3)
  if (!isSyntheticPreview && (businessLoadError || branchesLoadError)) {
    return (
      <PageScaffold app="merchant">
        <View className="gap-6 py-8">
          <InlineNotice
            tone="danger"
            title="تعذر تحميل بيانات الفروع"
            description="حدث خطأ أثناء تحميل بيانات النشاط التجاري أو الفروع. يرجى التحقق من الاتصال وإعادة المحاولة."
          />
          <AppButton
            title="إعادة المحاولة"
            variant="primary"
            onPress={() => void reconcileState()}
          />
          <AppButton
            title="العودة إلى الخطوة السابقة"
            variant="secondary"
            onPress={navigateToPrevious}
          />
        </View>
      </PageScaffold>
    );
  }

  // Real mode missing business context guard
  if (!isSyntheticPreview && !activeBusinessId) {
    return (
      <PageScaffold app="merchant">
        <View className="gap-6 py-8">
          <InlineNotice
            tone="warning"
            title="لم يتم تحديد نشاط تجاري"
            description="يرجى بدء طلب التأهيل من الخطوة الأولى لإدخال بيانات النشاط التجاري."
          />
          <AppButton
            title="العودة إلى الخطوة الأولى"
            variant="primary"
            onPress={() => router.replace('/business/onboarding')}
          />
        </View>
      </PageScaffold>
    );
  }

  // Real mode non-existent or foreign business draft guard
  if (!isSyntheticPreview && !existingBusiness) {
    return (
      <PageScaffold app="merchant">
        <View className="gap-6 py-8">
          <InlineNotice
            tone="danger"
            title="تعذر الوصول إلى النشاط التجاري"
            description="لم يتم العثور على مسودة النشاط التجاري أو لا تملك صلاحية الوصول إليها."
          />
          <AppButton
            title="العودة إلى الخطوة السابقة"
            variant="secondary"
            onPress={navigateToPrevious}
          />
        </View>
      </PageScaffold>
    );
  }

  // Open Add Branch Modal (F1: Sequential confirmed save of primary branch before opening secondary)
  const handleOpenAddBranch = async () => {
    if (isReadOnly || isSaving || isUncertain || hasLoadError) return;

    if (!primaryBranch || hasUnsavedChanges) {
      const ok = await persistPrimaryBranch();
      if (!ok) return;
    }

    setEditorMode('create');
    setEditingBranchData(null);
    setEditorModalVisible(true);
  };

  // Open Edit Branch Modal
  const handleOpenEditBranch = (branch: Branch) => {
    const isBranchModifiable = branch.status === 'draft' || branch.status === 'rejected';
    if (!isBranchModifiable || isReadOnly || isSaving || isUncertain) return;

    setEditorMode('edit');
    setEditingBranchData({
      id: branch.id,
      name: branch.name,
      city: branch.city ?? '',
      address_line: branch.address_line ?? '',
      district: branch.district ?? null,
    });
    setEditorModalVisible(true);
  };

  // Confirm delete branch
  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    const branchId = branchToDelete.id;
    setBranchToDelete(null);
    await deleteAdditionalBranch(branchId);
  };

  return (
    <PageScaffold app="merchant" maxWidth={600} className="bg-background">
      {/* 1. Header Bar */}
      <View className="w-full flex-row items-center justify-between gap-2.5 pt-2">
        {/* Right side in RTL: Back button and Title/Eyebrow */}
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
              إضافة فروع
            </AppText>
          </View>
        </View>

        {/* Left side in RTL: Step Badge */}
        <View
          accessibilityLabel="الخطوة 3 من 4"
          className="shrink-0 rounded-full px-2.5 py-1.5"
          style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
        >
          <AppText
            variant="caption"
            className="font-tajawal-bold"
            style={{ color: isDark ? '#FDE047' : '#D97706', fontSize: 12 }}
          >
            الخطوة 3 من 4
          </AppText>
        </View>
      </View>

      {/* 2. Connected RTL Stepper */}
      <Stepper
        steps={['النشاط', 'المفوض', 'الفروع', 'المراجعة']}
        currentStep={2}
        variant="connected"
      />

      {/* 3. Authoritative Store Mascot Banner */}
      <BranchesBanner
        title="أضف فروع نشاطك"
        description="أدخل مواقع الفروع التي تخدم عملاءك ضمن طلب التأهيل."
      />

      {/* 4. Section 1 Title */}
      <View className="w-full items-start gap-1 pt-1">
        <AppText variant="heading" className="font-tajawal-bold text-xl">
          الفروع
        </AppText>
        <AppText variant="caption" muted className="leading-5">
          أدخل بيانات الفرع الرئيسي، ثم أضف الفروع الإضافية إن وجدت.
        </AppText>
      </View>

      {/* Read-only status banner if business is non-draft */}
      {isReadOnly && readOnlyMessage ? (
        <InlineNotice tone="warning" title="تنبيه حالة النشاط" description={readOnlyMessage} />
      ) : null}

      {/* 5. Primary Branch Card */}
      <Card className="w-full gap-4 border border-border p-5">
        {/* Header row: Title + Required Badge */}
        <View className="w-full flex-row items-center justify-between">
          <AppText variant="heading" className="font-tajawal-bold text-lg">
            الفرع الرئيسي
          </AppText>
          <View
            accessibilityLabel="إلزامي"
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
          >
            <AppText
              variant="caption"
              className="font-tajawal-bold"
              style={{ color: isDark ? '#FDE047' : '#D97706', fontSize: 12 }}
            >
              إلزامي
            </AppText>
          </View>
        </View>

        {/* Field 1: Branch Name */}
        <AppInput
          label="اسم الفرع"
          required
          leading={<Store size={20} color={colors.mutedForeground} strokeWidth={1.8} />}
          placeholder="الفرع الرئيسي"
          value={primaryName}
          onChangeText={handlePrimaryNameChange}
          error={primaryNameError ?? undefined}
          editable={!isReadOnly && !isSaving && !isUncertain && !hasLoadError}
        />

        {/* Field 2: City (Contextual Required Input for RPC) */}
        <AppInput
          label="المدينة"
          required
          leading={<Building2 size={20} color={colors.mutedForeground} strokeWidth={1.8} />}
          placeholder="عدن"
          value={primaryCity}
          onChangeText={handlePrimaryCityChange}
          error={primaryCityError ?? undefined}
          editable={!isReadOnly && !isSaving && !isUncertain && !hasLoadError}
        />

        {/* Field 3: Address Line */}
        <AppInput
          label="عنوان التشغيل"
          required
          leading={<MapPin size={20} color={colors.mutedForeground} strokeWidth={1.8} />}
          placeholder="حي التقنية، شارع الملك فهد، عدن"
          hint="اكتب عنواناً واضحاً يسهل على الإدارة مراجعته."
          value={primaryAddress}
          onChangeText={handlePrimaryAddressChange}
          error={primaryAddressError ?? undefined}
          editable={!isReadOnly && !isSaving && !isUncertain && !hasLoadError}
        />

        {/* Add Branch Action Button inside Card (F1: Sequential confirmed save of primary branch) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إضافة فرع"
          disabled={isReadOnly || isSaving || isUncertain || hasLoadError}
          onPress={() => void handleOpenAddBranch()}
          className="min-h-12 w-full items-center justify-center rounded-xl border border-border bg-surface py-3.5 active:opacity-70"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            opacity: (isReadOnly || isSaving || isUncertain || hasLoadError) ? 0.5 : 1,
          }}
        >
          <AppText
            variant="label"
            className="font-tajawal-bold text-base"
            style={{ color: colors.foreground }}
          >
            إضافة فرع
          </AppText>
        </Pressable>
      </Card>

      {/* 6. Additional Branches List */}
      {additionalBranches.map((branch, index) => {
        const isBranchModifiable = branch.status === 'draft' || branch.status === 'rejected';
        const isBranchRejected = branch.status === 'rejected';

        return (
          <Card key={branch.id} className="w-full gap-4 border border-border p-5">
            {/* Header row: Branch Label + Edit & Delete Actions */}
            <View className="w-full flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <AppText variant="heading" className="font-tajawal-bold text-lg">
                  {`فرع إضافي ${index + 1}`}
                </AppText>
                {!isBranchModifiable ? (
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    }}
                  >
                    <AppText
                      variant="caption"
                      className="font-tajawal-medium text-xs"
                      style={{ color: colors.mutedForeground }}
                    >
                      {branch.status === 'approved' ? 'معتمد' : branch.status === 'pending_review' ? 'قيد المراجعة' : branch.status}
                    </AppText>
                  </View>
                ) : isBranchRejected ? (
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: isDark ? '#451a1a' : '#fef2f2',
                    }}
                  >
                    <AppText
                      variant="caption"
                      className="font-tajawal-medium text-xs"
                      style={{ color: colors.danger }}
                    >
                      مرفوض
                    </AppText>
                  </View>
                ) : null}
              </View>

              <View className="flex-row items-center gap-2">
                {/* Edit button (F6: Disabled for non-draft/rejected rows; C4: hitSlop >= 48pt interactive area) */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`تعديل فرع ${branch.name}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={!isBranchModifiable || isReadOnly || isSaving || isUncertain || hasLoadError}
                  onPress={() => handleOpenEditBranch(branch)}
                  className="min-h-9 flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 active:opacity-75"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: (!isBranchModifiable || isReadOnly || isSaving || isUncertain || hasLoadError) ? 0.4 : 1,
                  }}
                >
                  <Pencil size={15} color={colors.foreground} strokeWidth={1.8} />
                  <AppText
                    variant="caption"
                    className="font-tajawal-bold"
                    style={{ color: colors.foreground, fontSize: 13 }}
                  >
                    تعديل
                  </AppText>
                </Pressable>

                {/* Delete button (F6: Disabled for non-draft/rejected rows; C4: hitSlop >= 48pt interactive area) */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`حذف فرع ${branch.name}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={!isBranchModifiable || isReadOnly || isSaving || isUncertain || hasLoadError}
                  onPress={() => setBranchToDelete(branch)}
                  className="min-h-9 flex-row items-center gap-1.5 rounded-lg border px-3 py-1.5 active:opacity-75"
                  style={{
                    backgroundColor: isDark ? '#451a1a' : '#FEF2F2',
                    borderColor: isDark ? '#7f1d1d' : '#FECACA',
                    opacity: (!isBranchModifiable || isReadOnly || isSaving || isUncertain || hasLoadError) ? 0.4 : 1,
                  }}
                >
                  <Trash2 size={15} color={colors.danger} strokeWidth={1.8} />
                  <AppText
                    variant="caption"
                    className="font-tajawal-bold"
                    style={{ color: colors.danger, fontSize: 13 }}
                  >
                    حذف
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Branch Details */}
            <View className="gap-2 pt-1">
              <View className="flex-row items-center gap-2.5">
                <Store size={18} color={colors.foreground} strokeWidth={1.8} />
                <AppText variant="body" className="font-tajawal-bold text-base">
                  {branch.name}
                </AppText>
              </View>

              <View className="flex-row items-center gap-2.5">
                <MapPin size={18} color={colors.mutedForeground} strokeWidth={1.8} />
                <AppText variant="caption" muted className="font-tajawal-medium text-sm">
                  {branch.city && branch.address_line
                    ? `${branch.address_line}`
                    : (branch.address_line || branch.city || '')}
                </AppText>
              </View>
            </View>
          </Card>
        );
      })}

      {/* 7. Informational Note */}
      <View
        className="w-full flex-row items-center gap-3 rounded-2xl p-4"
        style={{
          backgroundColor: isDark ? '#2D2614' : '#FFFDF2',
          borderColor: isDark ? '#554116' : '#FEF08A',
          borderWidth: 1,
        }}
      >
        <Info size={22} color={isDark ? '#FDE047' : '#D97706'} strokeWidth={2} />
        <AppText
          variant="caption"
          className="font-tajawal-medium leading-5 flex-1"
          style={{ color: isDark ? '#FEF08A' : '#854D0E', fontSize: 13 }}
        >
          حفظ بيانات الفروع لا يعني اعتمادها؛ ستراجعها الإدارة لاحقاً.
        </AppText>
      </View>

      {/* 8. Action Outcome / Feedback Banner (F4: Uncertain state with reconciliation button) */}
      {feedback ? (
        <View className="w-full gap-2">
          <InlineNotice
            tone={feedback.tone === 'error' ? 'danger' : feedback.tone}
            title={feedback.text}
          />
          {isUncertain ? (
            <AppButton
              title="التحقق من حالة الطلب"
              variant="outline"
              size="sm"
              onPress={() => void reconcileState()}
            />
          ) : null}
        </View>
      ) : null}

      {/* 9. Action CTAs */}
      <View className="w-full gap-3 pt-2">
        <AppButton
          title={isSaving ? 'جارٍ الحفظ...' : 'حفظ ومتابعة'}
          variant="primary"
          size="lg"
          loading={isSaving}
          disabled={isReadOnly || isSaving || isUncertain || hasLoadError}
          onPress={() => void saveAndContinue()}
        />

        <AppButton
          title="حفظ كمسودة"
          variant="secondary"
          size="lg"
          disabled={isReadOnly || isSaving || isUncertain || hasLoadError}
          onPress={() => void saveDraft()}
        />

        {/* Tertiary Previous Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="السابق: الرجوع إلى الخطوة السابقة"
          disabled={isReadOnly || isSaving}
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

      {/* 10. Branch Editor Modal (Add / Edit) */}
      <BranchEditorModal
        visible={editorModalVisible}
        mode={editorMode}
        initialData={editingBranchData}
        isSaving={isSaving}
        onSave={async (data) => {
          if (editorMode === 'create') {
            return await createAdditionalBranch(data);
          } else {
            return await updateAdditionalBranch(data);
          }
        }}
        onClose={() => {
          setEditorModalVisible(false);
          setEditingBranchData(null);
        }}
      />

      {/* 11. Delete Branch Confirmation Dialog */}
      <ConfirmDialog
        visible={Boolean(branchToDelete)}
        title="حذف الفرع؟"
        description={`هل أنت متأكد من حذف الفرع "${branchToDelete?.name ?? ''}"؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setBranchToDelete(null)}
      />

      {/* 12. Unsaved Changes Exit Confirmation */}
      <ConfirmDialog
        visible={showExitConfirm}
        title="مغادرة الصفحة؟"
        description="لديك تغييرات غير محفوظة في بيانات الفروع. هل تريد تجاهل التغييرات والمغادرة؟"
        confirmLabel="تجاهل والمغادرة"
        cancelLabel="متابعة التعديل"
        destructive
        onConfirm={handleDiscardAndExit}
        onCancel={() => setShowExitConfirm(false)}
      />
    </PageScaffold>
  );
}
