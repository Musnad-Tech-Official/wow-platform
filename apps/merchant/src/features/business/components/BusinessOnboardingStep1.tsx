import { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, Store, Tag, Pencil, Info } from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import {
  AppButton,
  AppInput,
  AppText,
  Card,
  ConfirmDialog,
  InlineNotice,
  PageScaffold,
  Stepper,
  TextAreaField,
} from '@wow/ui';
import { WelcomeBanner } from './WelcomeBanner';
import { CategorySelectSheet } from './CategorySelectSheet';
import {
  useBusinessOnboardingStep1,
  type UseBusinessOnboardingStep1Props,
} from '../hooks/useBusinessOnboardingStep1';

export function BusinessOnboardingStep1(props: UseBusinessOnboardingStep1Props) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const {
    isAuthLoaded,
    isSignedIn,
    name,
    categoryName,
    categoryId,
    description,
    nameError,
    categoryError,
    descriptionError,
    isSaving,
    feedback,
    isUncertain,
    hasUnsavedChanges,
    isReadOnly,
    readOnlyMessage,
    isBusinessLoading,
    handleNameChange,
    handleCategorySelect,
    handleDescriptionChange,
    saveDraft,
    saveAndContinue,
    reconcileState,
  } = useBusinessOnboardingStep1(props);

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };

  const handleDiscardAndExit = () => {
    setShowExitConfirm(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
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
            description="يرجى تسجيل الدخول بحساب تاجر للمتابعة إلى إضافة نشاط تجاري."
          />
        </View>
      </PageScaffold>
    );
  }

  // Existing business loading state
  if (isBusinessLoading) {
    return (
      <PageScaffold app="merchant">
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="label" muted style={{ marginTop: 16 }}>
            جارٍ تحميل بيانات النشاط...
          </AppText>
        </View>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold app="merchant" maxWidth={600} className="bg-background">
      {/* 1. Header Bar */}
      <View className="w-full flex-row items-center justify-between gap-3 pt-2">
        {/* Right side in RTL: Back button and Title/Eyebrow */}
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={handleBackPress}
            className="min-h-12 min-w-12 items-center justify-center rounded-xl bg-surface active:opacity-75"
            style={{
              width: 48,
              height: 48,
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
            <AppText variant="title" className="font-tajawal-bold" accessibilityRole="header">
              إضافة نشاط تجاري
            </AppText>
          </View>
        </View>

        {/* Left side in RTL: Step Badge */}
        <View
          accessibilityLabel="الخطوة 1 من 4"
          className="shrink-0 rounded-full px-3 py-1.5"
          style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
        >
          <AppText
            variant="caption"
            className="font-tajawal-bold"
            style={{ color: isDark ? '#FDE047' : '#D97706', fontSize: 13 }}
          >
            الخطوة 1 من 4
          </AppText>
        </View>
      </View>

      {/* 2. Connected Stepper */}
      <Stepper
        steps={['النشاط', 'المفوض', 'الفروع', 'المراجعة']}
        currentStep={0}
        variant="connected"
      />

      {/* 3. Welcome Banner */}
      <WelcomeBanner
        title="لنبدأ بإضافة نشاطك التجاري"
        description="أدخل البيانات الأساسية لنشاطك لإتمام طلب التأهيل."
      />

      {/* 4. Section Title */}
      <View className="w-full items-start gap-1 pt-1">
        <AppText variant="heading" className="font-tajawal-bold text-xl">
          بيانات النشاط
        </AppText>
        <AppText variant="caption" muted className="leading-5">
          أدخل بيانات نشاطك التجاري. يمكنك حفظ الطلب واستكماله لاحقًا.
        </AppText>
      </View>

      {/* Read-only status banner if business is non-draft */}
      {isReadOnly && readOnlyMessage ? (
        <InlineNotice tone="warning" title="تنبيه حالة النشاط" description={readOnlyMessage} />
      ) : null}

      {/* 5. Form Fields Card */}
      <Card className="w-full gap-5 border border-border p-5">
        {/* Field 1: Business Name */}
        <AppInput
          label="اسم النشاط التجاري"
          required
          leading={<Store size={20} color={colors.mutedForeground} strokeWidth={1.8} />}
          placeholder="مثال: دار الألوان"
          hint="اكتب الاسم الحقيقي للنشاط كما يُعرف به، وبما يطابق مستنداته إن وجدت."
          value={name}
          onChangeText={handleNameChange}
          error={nameError ?? undefined}
          editable={!isReadOnly && !isSaving}
        />

        {/* Field 2: Business Category */}
        <View className="gap-2">
          <AppText variant="label">
            فئة النشاط
            <AppText style={{ color: colors.warning }}> *</AppText>
          </AppText>

          <Pressable
            accessibilityRole="combobox"
            accessibilityLabel="فئة النشاط"
            accessibilityHint="اضغط لاختيار فئة النشاط"
            accessibilityState={{ expanded: isCategorySheetOpen, disabled: isReadOnly || isSaving }}
            disabled={isReadOnly || isSaving}
            onPress={() => setIsCategorySheetOpen(true)}
            className={`min-h-12 flex-row items-center justify-between rounded-xl px-4 py-3 active:opacity-85 ${
              isReadOnly || isSaving ? 'opacity-50' : ''
            }`}
            style={{
              backgroundColor: colors.background,
              borderWidth: categoryError ? 2 : 1,
              borderColor: categoryError ? colors.danger : colors.controlBorder,
            }}
          >
            {/* Right side in RTL: Leading Tag icon + Category Name / Placeholder */}
            <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
              <Tag size={20} color={colors.mutedForeground} strokeWidth={1.8} />
              <AppText
                className="font-tajawal text-base"
                style={{
                  color: categoryName ? colors.foreground : colors.mutedForeground,
                }}
              >
                {categoryName ?? 'اختر فئة النشاط'}
              </AppText>
            </View>

            {/* Left side in RTL: Trailing ChevronDown icon */}
            <ChevronDown size={20} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>

          {categoryError ? (
            <AppText
              variant="caption"
              tone="danger"
              accessibilityLiveRegion="polite"
            >
              {categoryError}
            </AppText>
          ) : (
            <AppText variant="caption" muted>
              اختر الفئة الأقرب إلى المنتجات أو الخدمات التي تقدمها.
            </AppText>
          )}
        </View>

        {/* Field 3: Business Description */}
        <TextAreaField
          label="وصف النشاط"
          leading={<Pencil size={18} color={colors.mutedForeground} strokeWidth={1.8} />}
          placeholder="مثال: متجر متخصص في بيع الأدوات المنزلية ومستلزمات المطبخ."
          hint="صف ما يقدمه نشاطك للعملاء في جملة أو جملتين."
          maxLength={1200}
          value={description}
          onChangeText={handleDescriptionChange}
          error={descriptionError ?? undefined}
          editable={!isReadOnly && !isSaving}
        />
      </Card>

      {/* 6. Informational Notice */}
      <View
        className="w-full flex-row items-center gap-3 rounded-2xl p-4"
        style={{
          backgroundColor: isDark ? '#2D2614' : '#FFFBEB',
          borderColor: isDark ? '#554116' : '#FEF08A',
          borderWidth: 1,
        }}
      >
        <View className="shrink-0">
          <Info size={22} color={isDark ? '#FDE047' : '#D97706'} strokeWidth={2} />
        </View>
        <AppText
          variant="caption"
          className="min-w-0 flex-1 font-tajawal-medium leading-5 text-right"
          style={{ color: isDark ? '#FEF08A' : '#854D0E' }}
        >
          يمكنك إدارة أكثر من نشاط تجاري بحساب واحد، ويُراجع كل نشاط بشكل مستقل.
        </AppText>
      </View>

      {/* 7. Action Outcome / Feedback Banner */}
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

      {/* 8. Action CTAs */}
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
      </View>

      {/* 9. Category Selection BottomSheet */}
      <CategorySelectSheet
        visible={isCategorySheetOpen}
        selectedCategoryId={categoryId}
        onSelect={handleCategorySelect}
        onClose={() => setIsCategorySheetOpen(false)}
      />

      {/* 10. Unsaved Changes Exit Confirmation */}
      <ConfirmDialog
        visible={showExitConfirm}
        title="مغادرة الصفحة؟"
        description="لديك تغييرات غير محفوظة في بيانات النشاط. هل تريد تجاهل التغييرات والمغادرة؟"
        confirmLabel="تجاهل والمغادرة"
        cancelLabel="متابعة التعديل"
        destructive
        onConfirm={handleDiscardAndExit}
        onCancel={() => setShowExitConfirm(false)}
      />
    </PageScaffold>
  );
}
