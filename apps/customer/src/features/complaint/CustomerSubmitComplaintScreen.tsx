import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import { usePublicOffer, useSubmitComplaint, type ComplaintType } from '@wow/api';
import { useTheme, useWowColors } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import {
  AppButton,
  AppInput,
  AppText,
  Card,
  DataState,
  InlineNotice,
  SelectField,
  TextAreaField,
  type WowSelectOption,
} from '@wow/ui';

import { isValidUuid } from '../offer/offer-display';
import {
  COMPLAINT_TYPE_OPTIONS,
  MAX_DESCRIPTION_LENGTH,
  executeComplaintSubmission,
  getComplaintTypeLabel,
  getLocalTodayDate,
  getLocalYesterdayDate,
  validateComplaintForm,
} from './complaint-display';
import { ComplaintEvidenceNotice } from './ComplaintEvidenceNotice';
import { ComplaintOfferSummaryCard } from './ComplaintOfferSummaryCard';
import { ComplaintReviewModal } from './ComplaintReviewModal';

export interface CustomerSubmitComplaintScreenProps {
  offerId: string;
  initialAuthOverride?: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId?: string;
  };
  mockOffer?: import('@wow/api').PublicOfferDetails;
  isFixture?: boolean;
}

export function CustomerSubmitComplaintScreen({
  offerId,
  initialAuthOverride,
  mockOffer,
  isFixture = false,
}: CustomerSubmitComplaintScreenProps) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  // 1. Auth session check
  const { isLoaded: isAuthLoadedRaw, isSignedIn: isSignedInRaw } = useAuth();
  const isAuthLoaded = initialAuthOverride?.isLoaded ?? isAuthLoadedRaw;
  const isSignedIn = initialAuthOverride?.isSignedIn ?? isSignedInRaw;

  // 2. Offer ID validation & query
  const isUuidValid = Boolean(mockOffer) || isValidUuid(offerId);
  const offerQuery = usePublicOffer(isUuidValid && !mockOffer ? offerId : null);
  const offer = mockOffer ?? offerQuery.data;

  // 3. Form State
  const [complaintType, setComplaintType] = useState<ComplaintType | null>(null);
  const [description, setDescription] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [incidentDate, setIncidentDate] = useState('');
  const [errors, setErrors] = useState<{
    complaintType?: string;
    description?: string;
    branchId?: string;
    incidentDate?: string;
  }>({});

  // 4. Modal and Submission Lifecycle
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedComplaintId, setSubmittedComplaintId] = useState<string | null>(null);

  // Synchronous guard against duplicate rapid submissions
  const isSubmittingRef = useRef(false);

  // Mutation
  const submitComplaintMutation = useSubmitComplaint();

  // Eligible branch IDs for validation and picker
  const eligibleBranchIds = useMemo(() => {
    return (offer?.branches ?? []).map((b) => b.id);
  }, [offer]);

  const branchOptions: readonly WowSelectOption[] = useMemo(() => {
    const list: WowSelectOption[] = [
      { value: '', label: 'جميع الفروع / لم أحدد فرعاً معيناً' },
    ];
    if (offer?.branches) {
      for (const b of offer.branches) {
        list.push({
          value: b.id,
          label: `${b.name}${b.city ? ` (${b.city})` : ''}`,
        });
      }
    }
    return list;
  }, [offer]);

  const complaintTypeSelectOptions: readonly WowSelectOption[] = useMemo(() => {
    return COMPLAINT_TYPE_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
    }));
  }, []);

  const selectedTypeDetail = useMemo(() => {
    return COMPLAINT_TYPE_OPTIONS.find((o) => o.value === complaintType);
  }, [complaintType]);

  const selectedBranchName = useMemo(() => {
    if (!branchId || !offer?.branches) return null;
    const b = offer.branches.find((x) => x.id === branchId);
    return b ? `${b.name}${b.city ? ` (${b.city})` : ''}` : null;
  }, [branchId, offer]);

  // Navigation handlers
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(isUuidValid ? `/offer/${offerId}` : '/discover');
    }
  }

  function handleSignInRedirect() {
    router.push('/sign-in');
  }

  // Quick Date Fill Helpers
  function setTodayDate() {
    setIncidentDate(getLocalTodayDate());
    setErrors((prev) => ({ ...prev, incidentDate: undefined }));
  }

  function setYesterdayDate() {
    setIncidentDate(getLocalYesterdayDate());
    setErrors((prev) => ({ ...prev, incidentDate: undefined }));
  }

  // Review & Submit Handlers
  function handleOpenReview() {
    const validation = validateComplaintForm(
      {
        complaintType,
        description,
        branchId,
        incidentDate,
      },
      eligibleBranchIds,
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setReviewModalVisible(true);
  }

  async function handleConfirmSubmit() {
    if (!offer) return;

    await executeComplaintSubmission({
      isSubmittingRef,
      offerId: offer.id,
      complaintType,
      description,
      branchId,
      incidentDate,
      eligibleBranchIds,
      mutateAsync: submitComplaintMutation.mutateAsync,
      onSuccess: (complaintId) => {
        setSubmittedComplaintId(complaintId);
        setReviewModalVisible(false);
      },
      onError: (errorMessage) => {
        setSubmitError(errorMessage);
        setReviewModalVisible(false);
      },
      onValidationError: (validationErrors) => {
        setErrors(validationErrors);
        setReviewModalVisible(false);
      },
      setIsSubmitting,
      isFixture,
    });
  }

  // ---------------------------------------------------------------------------
  // Top Header Bar
  // ---------------------------------------------------------------------------
  const renderHeader = (title: string = 'تقديم شكوى') => (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          height: 60,
          maxWidth: 1200,
          marginHorizontal: 'auto',
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الرجوع إلى صفحة العرض"
          accessibilityHint="يعود إلى الصفحة السابقة"
          onPress={handleBack}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <ArrowRight size={22} color={colors.foreground} />
        </Pressable>

        <AppText
          variant="heading"
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: colors.foreground,
            textAlign: 'center',
          }}
        >
          {title}
        </AppText>

        <View style={{ width: 48 }} />
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Invalid UUID State
  // ---------------------------------------------------------------------------
  if (!isUuidValid) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View
          style={{
            flex: 1,
            paddingTop: 56,
            paddingHorizontal: 24,
            maxWidth: 600,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <DataState
            kind="error"
            title="معرّف العرض غير صالح"
            description="الرابط المطلوب غير صحيح أو لا يحتوي على معرّف عرض معتمد لتقديم شكوى."
            actionLabel="استكشاف العروض"
            onAction={() => router.replace('/discover')}
          />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading Offer State
  // ---------------------------------------------------------------------------
  if (offerQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            padding: 24,
          }}
        >
          <ActivityIndicator size="large" color="#FACC15" />
          <AppText
            variant="caption"
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: isDark ? '#94A3B8' : colors.mutedForeground,
            }}
          >
            جاري تحميل تفاصيل العرض...
          </AppText>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Offer Query Error State
  // ---------------------------------------------------------------------------
  if (offerQuery.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 24,
            maxWidth: 600,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <DataState
            kind="error"
            title="تعذّر تحميل تفاصيل العرض"
            description="حدث خطأ في الاتصال أثناء جلب بيانات العرض من الخادم."
            actionLabel="إعادة المحاولة"
            onAction={() => void offerQuery.refetch()}
          />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Offer Unavailable / Not Found State
  // ---------------------------------------------------------------------------
  if (!offer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View
          style={{
            flex: 1,
            paddingTop: 56,
            paddingHorizontal: 24,
            maxWidth: 600,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <DataState
            kind="empty"
            title="العرض غير متاح لتقديم شكوى"
            description="قد يكون هذا العرض غير موجود أو غير معتمد حالياً لدى المنصة."
            actionLabel="استكشاف العروض"
            onAction={() => router.replace('/discover')}
          />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Guest / Unauthenticated State
  // ---------------------------------------------------------------------------
  if (isAuthLoaded && !isSignedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader('تقديم شكوى')}

        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <View
            style={{
              maxWidth: 600,
              marginHorizontal: 'auto',
              width: '100%',
              padding: 16,
              gap: 20,
            }}
          >
            {/* Offer Summary Card (public data is safe) */}
            <ComplaintOfferSummaryCard
              offerTitle={offer.title}
              businessName={offer.business?.name ?? 'متجر معتمد'}
              offerId={offer.id}
              branchesCount={offer.branches?.length ?? 0}
            />

            {/* Guest Gate Card */}
            <Card
              {...rtlWebProps}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 20,
                padding: 24,
                alignItems: 'center',
                gap: 18,
              }}
            >
              <View
                style={{
                  width: 120,
                  height: 120,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={wowIllustrations.customer.secureAccess}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  accessibilityLabel="تسجيل الدخول مطلوب"
                />
              </View>

              <View style={{ alignItems: 'center', gap: 8, maxWidth: 420 }}>
                <AppText
                  variant="heading"
                  style={{
                    fontSize: 19,
                    fontWeight: '800',
                    color: colors.foreground,
                    textAlign: 'center',
                  }}
                >
                  تسجيل الدخول مطلوب لتقديم شكوى
                </AppText>

                <AppText
                  variant="body"
                  muted
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    textAlign: 'center',
                    color: colors.mutedForeground,
                  }}
                >
                  لضمان متابعة البلاغات بدقة والتحقق منها مع التاجر عبر إدارة المنصة، يتطلب تقديم الشكوى حساب عميل موثق.
                </AppText>
              </View>

              <View style={{ width: '100%', gap: 10, marginTop: 4 }}>
                <AppButton
                  title="تسجيل الدخول إلى حسابك"
                  variant="primary"
                  onPress={handleSignInRedirect}
                  style={{ minHeight: 48, borderRadius: 12 }}
                />
                <AppButton
                  title="العودة إلى تفاصيل العرض"
                  variant="secondary"
                  onPress={handleBack}
                  style={{ minHeight: 48, borderRadius: 12 }}
                />
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Success Confirmed State
  // ---------------------------------------------------------------------------
  if (submittedComplaintId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader('تم استلام الشكوى')}

        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <View
            style={{
              maxWidth: 600,
              marginHorizontal: 'auto',
              width: '100%',
              padding: 16,
              gap: 20,
            }}
          >
            <Card
              {...rtlWebProps}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 20,
                padding: 24,
                alignItems: 'center',
                gap: 16,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={36} color="#10B981" />
              </View>

              <View style={{ alignItems: 'center', gap: 8 }}>
                <AppText
                  variant="heading"
                  style={{
                    fontSize: 20,
                    fontWeight: '900',
                    color: colors.foreground,
                    textAlign: 'center',
                  }}
                >
                  تم تسجيل شكواك بنجاح
                </AppText>

                <AppText
                  variant="body"
                  muted
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    textAlign: 'center',
                    color: colors.mutedForeground,
                  }}
                >
                  تم استلام البلاغ وإحالته لإدارة المنصة للتحقق من الشكوى والتواصل مع المتجر المعني لضمان مطابقة العرض.
                </AppText>
              </View>

              {/* Reference ID card */}
              <View
                style={{
                  backgroundColor: isDark ? '#1E1E22' : '#F1F5F9',
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  alignItems: 'center',
                  gap: 4,
                  width: '100%',
                }}
              >
                <AppText variant="caption" muted style={{ fontSize: 12 }}>
                  الرقم المرجعي للشكوى
                </AppText>
                <AppText
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: colors.foreground,
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                  }}
                  selectable
                >
                  {submittedComplaintId}
                </AppText>
              </View>

              <InlineNotice
                tone="info"
                title="متابعة حالة الشكاوى (CUS-08) ستتاح قريباً في حسابك الشخصي لمتابعة الإجراءات المتخذة."
              />

              {isFixture ? (
                <InlineNotice
                  tone="info"
                  title="بيئة فحص وتطوير معتمدة (Test Fixture): لم يتم إجراء أي كتابة على قاعدة البيانات الإنتاجية."
                />
              ) : null}

              <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
                <AppButton
                  title="العودة إلى تفاصيل العرض"
                  variant="primary"
                  onPress={handleBack}
                  style={{ minHeight: 48, borderRadius: 12 }}
                />
                <AppButton
                  title="استكشاف عروض أخرى"
                  variant="secondary"
                  onPress={() => router.replace('/discover')}
                  style={{ minHeight: 48, borderRadius: 12 }}
                />
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Main Form State (Authenticated & Offer Available)
  // ---------------------------------------------------------------------------
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {renderHeader('تقديم شكوى')}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            maxWidth: 600,
            marginHorizontal: 'auto',
            width: '100%',
            padding: 16,
            gap: 18,
          }}
        >
          {/* 1. Offer Concerned Card */}
          <ComplaintOfferSummaryCard
            offerTitle={offer.title}
            businessName={offer.business?.name ?? 'متجر معتمد'}
            offerId={offer.id}
            branchesCount={offer.branches?.length ?? 0}
            selectedBranchName={selectedBranchName}
          />

          {/* Submission Failure Alert (if previously failed) */}
          {submitError ? (
            <InlineNotice
              tone="danger"
              title={submitError}
            />
          ) : null}

          {/* 2. Problem Type Picker */}
          <View style={{ gap: 6 }}>
            <SelectField
              label="نوع المشكلة *"
              placeholder="اختر نوع المشكلة من القائمة"
              value={complaintType}
              options={complaintTypeSelectOptions}
              onValueChange={(val) => {
                setComplaintType(val as ComplaintType);
                setErrors((prev) => ({ ...prev, complaintType: undefined }));
                setSubmitError(null);
              }}
              error={errors.complaintType}
            />
            {selectedTypeDetail ? (
              <AppText
                variant="caption"
                muted
                style={{
                  fontSize: 12,
                  color: colors.mutedForeground,
                  textAlign: 'right',
                  paddingHorizontal: 4,
                }}
              >
                {selectedTypeDetail.description}
              </AppText>
            ) : null}
          </View>

          {/* 3. Description Multi-line Input */}
          <View style={{ gap: 4 }}>
            <TextAreaField
              label="صف ما حدث *"
              placeholder="ما الذي حدث؟ اكتب الحقائق المتوفرة لديك بوضوح (15 حرفاً على الأقل)..."
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                setErrors((prev) => ({ ...prev, description: undefined }));
                setSubmitError(null);
              }}
              error={errors.description}
              minHeight={120}
              maxLength={MAX_DESCRIPTION_LENGTH}
              showCount
              required
            />
          </View>

          {/* 4. Relevant Branch (Optional) */}
          {offer.branches && offer.branches.length > 0 ? (
            <SelectField
              label="الفرع المعني (إن كنت تعرفه)"
              placeholder="جميع الفروع / لم أحدد فرعاً معيناً"
              value={branchId ?? ''}
              options={branchOptions}
              onValueChange={(val) => {
                setBranchId(val || null);
                setErrors((prev) => ({ ...prev, branchId: undefined }));
                setSubmitError(null);
              }}
              error={errors.branchId}
              hint="اختياري: حدد الفرع الذي تمت زيارته أو واجهت فيه المشكلة."
            />
          ) : null}

          {/* 5. Incident Date (Optional) */}
          <View style={{ gap: 6 }}>
            <AppInput
              label="وقت حدوث المشكلة (اختياري)"
              placeholder="مثال: 2026-11-08"
              value={incidentDate}
              onChangeText={(text) => {
                setIncidentDate(text);
                setErrors((prev) => ({ ...prev, incidentDate: undefined }));
                setSubmitError(null);
              }}
              error={errors.incidentDate}
              hint="صيغة التاريخ المعتمدة: YYYY-MM-DD"
              trailing={<Calendar size={18} color={colors.mutedForeground} />}
            />

            {/* Quick Fill Buttons for ease of use */}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-start' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تحديد تاريخ اليوم"
                onPress={setTodayDate}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#E2E8F0',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText variant="caption" style={{ fontSize: 12, fontWeight: '600' }}>
                  اليوم
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تحديد تاريخ الأمس"
                onPress={setYesterdayDate}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#E2E8F0',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText variant="caption" style={{ fontSize: 12, fontWeight: '600' }}>
                  أمس
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* 6. Honest Evidence Attachment Notice */}
          <ComplaintEvidenceNotice />

          {/* 7. Action Buttons */}
          <View style={{ gap: 10, marginTop: 8 }}>
            <AppButton
              title="مراجعة وإرسال الشكوى"
              variant="primary"
              disabled={isSubmitting}
              onPress={handleOpenReview}
              style={{ minHeight: 48, borderRadius: 12 }}
            />

            <AppButton
              title="إلغاء"
              variant="secondary"
              disabled={isSubmitting}
              onPress={handleBack}
              style={{ minHeight: 48, borderRadius: 12 }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Review & Confirmation Modal */}
      <ComplaintReviewModal
        visible={reviewModalVisible}
        offerTitle={offer.title}
        businessName={offer.business?.name ?? 'متجر معتمد'}
        complaintTypeLabel={getComplaintTypeLabel(complaintType)}
        description={description.trim()}
        branchName={selectedBranchName}
        incidentDate={incidentDate.trim() || null}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setReviewModalVisible(false)}
      />
    </View>
  );
}
