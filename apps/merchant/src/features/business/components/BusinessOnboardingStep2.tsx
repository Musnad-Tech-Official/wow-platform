import { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, User } from 'lucide-react-native';
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
import { RepresentativeBanner } from './RepresentativeBanner';
import { RoleSelectSheet, REPRESENTATIVE_ROLE_OPTIONS } from './RoleSelectSheet';
import { EvidencePicker } from './EvidencePicker';
import {
  useBusinessOnboardingStep2,
  type UseBusinessOnboardingStep2Props,
} from '../hooks/useBusinessOnboardingStep2';

export function BusinessOnboardingStep2(props: UseBusinessOnboardingStep2Props) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const viewport = useWowViewport();
  const isDark = resolvedTheme === 'dark';

  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const {
    isAuthLoaded,
    isSignedIn,
    activeBusinessId,
    existingBusiness,
    isSyntheticPreview,
    name,
    role,
    selectedFile,
    nameError,
    roleError,
    fileError,
    isSaving,
    isReadOnly,
    readOnlyMessage,
    isBusinessLoading,
    hasUnsavedChanges,
    feedback,
    isUncertain,
    handleNameChange,
    handleRoleSelect,
    handleFileChange,
    saveDraft,
    saveAndContinue,
    reconcileState,
  } = useBusinessOnboardingStep2(props);

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
        pathname: '/business/onboarding',
        params,
      });
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/business/onboarding');
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
            description="يرجى تسجيل الدخول بحساب تاجر للمتابعة إلى إضافة مفوض للنشاط التجاري."
          />
        </View>
      </PageScaffold>
    );
  }

  // Business loading state
  if (isBusinessLoading) {
    return (
      <PageScaffold app="merchant">
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="label" muted style={{ marginTop: 16 }}>
            جارٍ تحميل بيانات النشاط والمفوض...
          </AppText>
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
            onPress={navigateToPrevious}
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
            title="العودة إلى الخطوة الأولى"
            variant="secondary"
            onPress={navigateToPrevious}
          />
        </View>
      </PageScaffold>
    );
  }

  const selectedRoleOption = REPRESENTATIVE_ROLE_OPTIONS.find(opt => opt.id === role);
  const roleDisplayLabel = selectedRoleOption ? selectedRoleOption.label : 'مالك النشاط';

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
              إضافة مفوض
            </AppText>
          </View>
        </View>

        {/* Left side in RTL: Step Badge */}
        <View
          accessibilityLabel="الخطوة 2 من 4"
          className="shrink-0 rounded-full px-2.5 py-1.5"
          style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
        >
          <AppText
            variant="caption"
            className="font-tajawal-bold"
            style={{ color: isDark ? '#FDE047' : '#D97706', fontSize: 12 }}
          >
            الخطوة 2 من 4
          </AppText>
        </View>
      </View>

      {/* 2. Connected RTL Stepper */}
      <Stepper
        steps={['النشاط', 'المفوض', 'الفروع', 'المراجعة']}
        currentStep={1}
        variant="connected"
      />

      {/* 3. Authoritative Mascot Banner */}
      <RepresentativeBanner
        title="حدّد ممثلك المفوض"
        description="أدخل بيانات الشخص الذي سيدير النشاط أو يمثله رسميًا عند الحاجة."
      />

      {/* 4. Section 1 Title */}
      <View className="w-full items-start gap-1 pt-1">
        <AppText variant="heading" className="font-tajawal-bold text-xl">
          الممثل المفوض
        </AppText>
        <AppText variant="caption" muted className="leading-5">
          أدخل بيانات الشخص الذي سيكون مخولًا بإدارة النشاط أو تمثيل النشاط رسميًا.
        </AppText>
      </View>

      {/* Read-only status banner if business is non-draft */}
      {isReadOnly && readOnlyMessage ? (
        <InlineNotice tone="warning" title="تنبيه حالة النشاط" description={readOnlyMessage} />
      ) : null}

      {/* 5. Form Card */}
      <Card className="w-full gap-5 border border-border p-5">
        {/* Field 1: Representative Name */}
        <AppInput
          label="اسم الممثل المفوض"
          required
          leading={<User size={20} color={colors.mutedForeground} strokeWidth={1.8} />}
          placeholder="مثال: أحمد محمد صالح"
          hint="اكتب الاسم الكامل كما يظهر في الهوية أو وثيقة التفويض."
          value={name}
          onChangeText={handleNameChange}
          error={nameError ?? undefined}
          editable={!isReadOnly && !isSaving}
        />

        {/* Field 2: Representative Role */}
        <View className="gap-2">
          <AppText variant="label">
            صفة التمثيل
            <AppText style={{ color: colors.warning }}> *</AppText>
          </AppText>

          <Pressable
            accessibilityRole="combobox"
            accessibilityLabel="صفة التمثيل"
            accessibilityHint="اضغط لاختيار صفة تمثيل المفوض"
            accessibilityState={{ expanded: isRoleSheetOpen, disabled: isReadOnly || isSaving }}
            disabled={isReadOnly || isSaving}
            onPress={() => setIsRoleSheetOpen(true)}
            className={`min-h-12 flex-row items-center justify-between rounded-xl px-4 py-3 active:opacity-85 ${
              isReadOnly || isSaving ? 'opacity-50' : ''
            }`}
            style={{
              backgroundColor: colors.background,
              borderWidth: roleError ? 2 : 1,
              borderColor: roleError ? colors.danger : colors.controlBorder,
            }}
          >
            {/* Right side in RTL: Selected Role Label */}
            <AppText
              className="font-tajawal text-base"
              style={{ color: colors.foreground }}
            >
              {roleDisplayLabel}
            </AppText>

            {/* Left side in RTL: Trailing ChevronDown icon */}
            <ChevronDown size={20} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>

          {roleError ? (
            <AppText
              variant="caption"
              tone="danger"
              accessibilityLiveRegion="polite"
            >
              {roleError}
            </AppText>
          ) : null}
        </View>

        {/* Amber Note Inside Form Card */}
        <View
          className="w-full rounded-2xl p-4"
          style={{
            backgroundColor: isDark ? '#2D2614' : '#FFFBEB',
            borderColor: isDark ? '#554116' : '#FEF08A',
            borderWidth: 1,
          }}
        >
          <AppText
            variant="caption"
            className="font-tajawal-medium leading-5 text-center"
            style={{ color: isDark ? '#FEF08A' : '#854D0E' }}
          >
            قد تطلب الإدارة دليلاً على صفة التفويض؛ لا تمنح هذه الخطوة صلاحيات تلقائيًا.
          </AppText>
        </View>
      </Card>

      {/* 6. Section 2 Title: Evidence */}
      <View className="w-full items-start gap-1 pt-1">
        <AppText variant="heading" className="font-tajawal-bold text-xl">
          إثبات الصفة
        </AppText>
        <AppText variant="caption" muted className="leading-5">
          أرفق مستندًا يوضح صفة التمثيل عند الحاجة.
        </AppText>
      </View>

      {/* 7. Evidence Card */}
      <Card className="w-full gap-4 border border-border p-5">
        <EvidencePicker
          value={selectedFile}
          onChange={handleFileChange}
          disabled={isReadOnly || isSaving}
          error={fileError}
        />
      </Card>

      {/* 8. Action Outcome / Feedback Banner */}
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
          disabled={isReadOnly || isSaving}
          onPress={() => void saveAndContinue()}
        />

        <AppButton
          title="حفظ كمسودة"
          variant="secondary"
          size="lg"
          disabled={isReadOnly || isSaving}
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

      {/* 10. Role Selection BottomSheet */}
      <RoleSelectSheet
        visible={isRoleSheetOpen}
        selectedRole={role}
        onSelect={handleRoleSelect}
        onClose={() => setIsRoleSheetOpen(false)}
      />

      {/* 11. Unsaved Changes Exit Confirmation */}
      <ConfirmDialog
        visible={showExitConfirm}
        title="مغادرة الصفحة؟"
        description="لديك تغييرات غير محفوظة في بيانات المفوض. هل تريد تجاهل التغييرات والمغادرة؟"
        confirmLabel="تجاهل والمغادرة"
        cancelLabel="متابعة التعديل"
        destructive
        onConfirm={handleDiscardAndExit}
        onCancel={() => setShowExitConfirm(false)}
      />
    </PageScaffold>
  );
}
