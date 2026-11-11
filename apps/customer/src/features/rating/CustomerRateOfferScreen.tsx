import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  HelpCircle,
  Lock,
  RotateCcw,
  Star,
} from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import {
  requireWowApiSession,
  usePublicOffer,
  useRateOffer,
  useWowApiContext,
  type CustomerOfferRating,
  type OfferConformity,
} from '@wow/api';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText, Card, DataState } from '@wow/ui';

import { isValidUuid } from '../offer/offer-display';
import {
  CONFORMITY_OPTIONS,
  STAR_RATING_LABELS,
  executeGuardedRatingSubmission,
  formatRatingArabicDate,
  lookupMyRatingForOffer,
} from './rating-display';

export interface CustomerRateOfferScreenProps {
  offerId: string;
  initialAuthOverride?: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId?: string;
  };
  mockOffer?: import('@wow/api').PublicOfferDetails;
  mockExistingRating?: CustomerOfferRating | null;
  previewMode?: 'live' | 'form' | 'success' | 'guest' | 'error_14day' | 'could_not_verify' | 'already_rated';
}

export function CustomerRateOfferScreen({
  offerId,
  initialAuthOverride,
  mockOffer,
  mockExistingRating,
  previewMode = 'live',
}: CustomerRateOfferScreenProps) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  // 1. Auth check
  const { isLoaded: isAuthLoadedRaw, isSignedIn: isSignedInRaw } = useAuth();
  const isAuthLoaded =
    previewMode === 'guest'
      ? true
      : (initialAuthOverride?.isLoaded ?? isAuthLoadedRaw);
  const isSignedIn =
    previewMode === 'guest'
      ? false
      : (initialAuthOverride?.isSignedIn ?? (previewMode !== 'live' ? true : isSignedInRaw));

  // 2. Fetch public offer
  const isUuidValid = Boolean(mockOffer) || isValidUuid(offerId);
  const offerQuery = usePublicOffer(isUuidValid && !mockOffer ? offerId : null);
  const offer = mockOffer ?? offerQuery.data;

  // 3. Existing Rating Lookup & Asynchronous Hydration
  const apiContext = useWowApiContext();

  const isPreHydrated =
    mockExistingRating !== undefined ||
    previewMode === 'already_rated' ||
    previewMode === 'could_not_verify';
  const isUserEditedRef = useRef(false);
  const hasHydratedRef = useRef(isPreHydrated);

  // Pre-seed initial existing rating if provided or in preview mode
  const [existingRating, setExistingRating] = useState<CustomerOfferRating | null>(
    previewMode === 'already_rated'
      ? (mockExistingRating ?? {
          id: 'rating-preview-existing',
          offer_id: offerId,
          offer_version_id: 'ver-preview',
          conformity: 'matches' as OfferConformity,
          experience_stars: 4,
          moderation_status: 'normal' as const,
          created_at: '2026-11-08T12:00:00Z',
          updated_at: '2026-11-08T12:00:00Z',
        })
      : (mockExistingRating ?? null),
  );

  // 4. Form state
  const initialConformity: OfferConformity | null =
    previewMode === 'could_not_verify'
      ? 'could_not_verify'
      : (existingRating?.conformity ?? null);
  const initialStars: number | null =
    previewMode === 'could_not_verify'
      ? null
      : (existingRating?.experience_stars ?? null);

  const [conformity, setConformity] = useState<OfferConformity | null>(initialConformity);
  const [experienceStars, setExperienceStars] = useState<number | null>(initialStars);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(
    previewMode === 'error_14day'
      ? 'انتهت فترة تقييم هذا العرض أو أن العرض غير مؤهل للتقييم حالياً (تُتاح إمكانية التقييم خلال 14 يوماً من انتهاء العرض فقط).'
      : null,
  );
  const [submittedRatingId, setSubmittedRatingId] = useState<string | null>(
    previewMode === 'success' ? 'rating-preview-success' : null,
  );

  // Synchronous double-tap guard
  const isSubmittingRef = useRef(false);

  // Mutation
  const rateOfferMutation = useRateOffer();

  // Review Finding 1 & 2: Asynchronous lookup of existing rating across pagination
  // Hydrates the form ONLY if the user has not already edited/interacted with the form.
  useEffect(() => {
    if (
      previewMode !== 'live' ||
      !isSignedIn ||
      !apiContext.userId ||
      !isUuidValid ||
      Boolean(mockOffer) ||
      mockExistingRating !== undefined
    ) {
      return;
    }

    let isCancelled = false;

    async function fetchExistingRating() {
      try {
        const { client } = requireWowApiSession(apiContext);
        const resolvedRating = await lookupMyRatingForOffer(client, offerId);
        if (isCancelled) return;

        setExistingRating(resolvedRating);

        if (resolvedRating && !hasHydratedRef.current) {
          if (!isUserEditedRef.current) {
            // User has not touched the form: safely hydrate existing rating into form
            hasHydratedRef.current = true;
            setConformity(resolvedRating.conformity);
            setExperienceStars(resolvedRating.experience_stars ?? null);
          } else {
            // User has already made edits: do NOT overwrite user edits!
            hasHydratedRef.current = true;
          }
        }
      } catch {
        // Non-blocking lookup failure: allows user to proceed with fresh rating submission
      }
    }

    void fetchExistingRating();

    return () => {
      isCancelled = true;
    };
  }, [apiContext, isSignedIn, isUuidValid, mockExistingRating, mockOffer, offerId, previewMode]);

  // Navigation handlers
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(isUuidValid ? `/offer/${offerId}` : '/discover');
    }
  }

  function handleSignInRedirect() {
    router.push({
      pathname: '/sign-in',
      params: {
        returnTo: `/offer/${offerId}/rate`,
        offerId,
        action: 'rate',
      },
    });
  }

  function handleSelectConformity(selected: OfferConformity) {
    if (isSubmitting || isSubmittingRef.current) return;
    isUserEditedRef.current = true;
    setConformity(selected);
    setSubmitError(null);
    // Strict business rule: could_not_verify MUST have null stars
    if (selected === 'could_not_verify') {
      setExperienceStars(null);
    }
  }

  function handleSelectStars(stars: number) {
    if (isSubmitting || isSubmittingRef.current || conformity === 'could_not_verify') return;
    isUserEditedRef.current = true;
    // Toggle off if already selected
    setExperienceStars(experienceStars === stars ? null : stars);
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (isSubmitting || isSubmittingRef.current) return;
    if (!conformity) {
      setSubmitError('يرجى اختيار مدى مطابقة العرض أولاً.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await executeGuardedRatingSubmission({
      offerId,
      conformity,
      experienceStars,
      isSubmittingRef,
      submitRatingMutation: rateOfferMutation,
    });

    setIsSubmitting(false);

    if (result.success && result.ratingId) {
      setSubmittedRatingId(result.ratingId);
    } else if (result.errorMessage) {
      setSubmitError(result.errorMessage);
    }
  }

  // ---------------------------------------------------------------------------
  // Top Header
  // ---------------------------------------------------------------------------
  const renderHeader = (title = 'تقييم مطابقة العرض') => (
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
          maxWidth: 600,
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
          accessibilityLabel="الرجوع"
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
            fontSize: 16,
            fontWeight: '700',
            color: colors.foreground,
            textAlign: 'center',
          }}
        >
          {title}
        </AppText>

        <View style={{ width: 48, height: 48 }} />
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Invalid Offer ID State
  // ---------------------------------------------------------------------------
  if (!isUuidValid) {
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader('معرّف غير صالح')}
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
            title="معرّف العرض غير صالح"
            description="الرابط المطلوب يحتوي على معرّف عرض غير صحيح أو تالف."
            actionLabel="العودة للاستكشاف"
            onAction={() => router.replace('/discover')}
          />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Offer Loading State
  // ---------------------------------------------------------------------------
  if (offerQuery.isLoading && !mockOffer) {
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }}>
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
  // Offer Error State
  // ---------------------------------------------------------------------------
  if (offerQuery.isError && !mockOffer) {
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
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
  // Offer Not Found State
  // ---------------------------------------------------------------------------
  if (!offer) {
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
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
            title="العرض غير متاح للتقييم"
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
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader('تقييم مطابقة العرض')}

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
            {/* Offer Summary Card */}
            <Card
              {...rtlWebProps}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <AppText variant="caption" muted style={{ textAlign: 'right' }}>
                العرض المراد تقييمه
              </AppText>
              <AppText
                variant="heading"
                style={{ fontSize: 16, fontWeight: '800', color: colors.foreground, textAlign: 'right' }}
              >
                {offer.title}
              </AppText>
              <AppText style={{ fontSize: 13, color: isDark ? '#CBD5E1' : '#475569', textAlign: 'right' }}>
                {offer.business?.name ?? 'متجر معتمد'}
              </AppText>
            </Card>

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
                gap: 16,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: isDark ? '#1F2937' : '#FEF9C3',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={26} color="#EAB308" />
              </View>

              <View style={{ alignItems: 'center', gap: 8 }}>
                <AppText
                  variant="heading"
                  style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'center' }}
                >
                  يلزم تسجيل الدخول لتقييم العرض
                </AppText>
                <AppText
                  style={{
                    fontSize: 14,
                    color: isDark ? '#94A3B8' : '#64748B',
                    textAlign: 'center',
                    lineHeight: 22,
                    maxWidth: 360,
                  }}
                >
                  تقييم مطابقة العروض متاح للمستخدمين المسجلين فقط لضمان مصداقية التقييمات وربطها بحسابك المعتمد.
                </AppText>
              </View>

              <AppButton
                title="تسجيل الدخول للمتابعة"
                variant="primary"
                onPress={handleSignInRedirect}
                style={{ width: '100%', height: 50, borderRadius: 25, marginTop: 8 }}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="العودة لتفاصيل العرض"
                onPress={handleBack}
                style={{
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
                  العودة لتفاصيل العرض كزائر ←
                </AppText>
              </Pressable>
            </Card>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Success Confirmation State
  // ---------------------------------------------------------------------------
  if (submittedRatingId) {
    const selectedConformityInfo = CONFORMITY_OPTIONS.find((o) => o.value === conformity);
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader('اكتمل التقييم')}

        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <View
            style={{
              maxWidth: 600,
              marginHorizontal: 'auto',
              width: '100%',
              padding: 20,
              gap: 20,
            }}
          >
            <Card
              {...rtlWebProps}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 24,
                padding: 24,
                alignItems: 'center',
                gap: 18,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={36} color="#10B981" />
              </View>

              <View style={{ alignItems: 'center', gap: 6 }}>
                <AppText
                  variant="heading"
                  style={{ fontSize: 20, fontWeight: '900', color: colors.foreground, textAlign: 'center' }}
                >
                  تم تسجيل تقييمك بنجاح
                </AppText>
                <AppText
                  style={{
                    fontSize: 14,
                    color: isDark ? '#94A3B8' : '#64748B',
                    textAlign: 'center',
                    lineHeight: 21,
                  }}
                >
                  شكراً لمشاركتك! تقييمك لمطابقة العرض يساعد في تعزيز الشفافية وجودة العروض في المنصة.
                </AppText>
              </View>

              {/* Submitted Details Summary */}
              <View
                style={{
                  width: '100%',
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderRadius: 16,
                  padding: 16,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="caption" muted>
                    مطابقة العرض:
                  </AppText>
                  <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
                    {selectedConformityInfo?.label ?? conformity}
                  </AppText>
                </View>

                {experienceStars !== null && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="caption" muted>
                      تقييم التجربة:
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <AppText style={{ fontSize: 14, fontWeight: '700', color: '#EAB308' }}>
                        {'★'.repeat(experienceStars)}
                        {'☆'.repeat(5 - experienceStars)}
                      </AppText>
                      <AppText variant="caption" muted>
                        ({STAR_RATING_LABELS[experienceStars] ?? experienceStars})
                      </AppText>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="caption" muted>
                    العرض:
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.foreground,
                      maxWidth: 240,
                      textAlign: 'left',
                    }}
                    numberOfLines={1}
                  >
                    {offer.title}
                  </AppText>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
                <AppButton
                  title="العودة لتفاصيل العرض"
                  variant="primary"
                  onPress={handleBack}
                  style={{ height: 50, borderRadius: 25 }}
                />

                <AppButton
                  title="عرض قائمة تقييماتي"
                  variant="outline"
                  onPress={() => router.replace('/ratings')}
                  style={{
                    height: 50,
                    borderRadius: 25,
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                  }}
                />
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Form State (Authenticated User)
  // ---------------------------------------------------------------------------
  return (
    <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
      {renderHeader(existingRating ? 'تعديل تقييم العرض' : 'تقييم مطابقة العرض')}

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View
          style={{
            maxWidth: 600,
            marginHorizontal: 'auto',
            width: '100%',
            padding: 16,
            gap: 18,
          }}
        >
          {/* Offer Summary Card */}
          <Card
            {...rtlWebProps}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="caption" muted style={{ textAlign: 'right' }}>
                تقييم العرض
              </AppText>
              {existingRating && (
                <View
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#FEF9C3',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}
                >
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: '#CA8A04' }}>
                    لديك تقييم سابق
                  </AppText>
                </View>
              )}
            </View>

            <AppText
              variant="heading"
              style={{ fontSize: 16, fontWeight: '800', color: colors.foreground, textAlign: 'right' }}
            >
              {offer.title}
            </AppText>

            <AppText style={{ fontSize: 13, color: isDark ? '#CBD5E1' : '#475569', textAlign: 'right' }}>
              {offer.business?.name ?? 'متجر معتمد'}
            </AppText>
          </Card>

          {/* Existing rating notice */}
          {existingRating && (
            <Card
              {...rtlWebProps}
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F0FDF4',
                borderColor: isDark ? '#065F46' : '#BBF7D0',
                borderWidth: 1,
                borderRadius: 14,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <RotateCcw size={18} color="#10B981" />
              <AppText
                style={{
                  fontSize: 13,
                  color: isDark ? '#A7F3D0' : '#15803D',
                  textAlign: 'right',
                  flex: 1,
                  lineHeight: 18,
                }}
              >
                سبق لك تقييم هذا العرض بتاريخ {formatRatingArabicDate(existingRating.updated_at)}. يمكنك تعديل اختياراتك أدناه وحفظ التقييم الجديد.
              </AppText>
            </Card>
          )}

          {/* Error Notice */}
          {submitError && (
            <Card
              {...rtlWebProps}
              style={{
                backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertCircle size={20} color="#EF4444" />
              <AppText
                style={{
                  fontSize: 13,
                  color: isDark ? '#FCA5A5' : '#991B1B',
                  textAlign: 'right',
                  flex: 1,
                  lineHeight: 19,
                }}
              >
                {submitError}
              </AppText>
            </Card>
          )}

          {/* Section 1: Conformity Selection */}
          <View style={{ gap: 10 }}>
            <View style={{ paddingHorizontal: 4 }}>
              <AppText
                variant="heading"
                style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, textAlign: 'right' }}
              >
                1. هل كان العرض مطابقاً لما تم تقديمه؟ <AppText style={{ color: '#EF4444' }}>*</AppText>
              </AppText>
              <AppText variant="caption" muted style={{ textAlign: 'right', marginTop: 2 }}>
                اختر مدى التزام الفرع بمواصفات وشروط العرض المعلنة
              </AppText>
            </View>

            <View style={{ gap: 10 }}>
              {CONFORMITY_OPTIONS.map((opt) => {
                const isSelected = conformity === opt.value;

                return (
                  <Pressable
                    key={opt.value}
                    disabled={isSubmitting}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, disabled: isSubmitting }}
                    accessibilityLabel={opt.label}
                    accessibilityHint={opt.description}
                    onPress={() => handleSelectConformity(opt.value)}
                    style={({ pressed }) => ({
                      minHeight: 56,
                      backgroundColor: isSelected
                        ? isDark
                          ? '#1E293B'
                          : '#FEF9C3'
                        : colors.surface,
                      borderColor: isSelected
                        ? '#FACC15'
                        : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      borderRadius: 16,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    {/* Radio indicator */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? '#CA8A04' : isDark ? '#64748B' : '#94A3B8',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? '#FACC15' : 'transparent',
                      }}
                    >
                      {isSelected && <Check size={14} color="#000" strokeWidth={3} />}
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText
                        style={{
                          fontSize: 15,
                          fontWeight: '800',
                          color: colors.foreground,
                          textAlign: 'right',
                        }}
                      >
                        {opt.label}
                      </AppText>
                      <AppText
                        variant="caption"
                        muted
                        style={{
                          fontSize: 12,
                          textAlign: 'right',
                          lineHeight: 18,
                        }}
                      >
                        {opt.description}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section 2: Experience Stars */}
          <View style={{ gap: 10, marginTop: 4 }}>
            <View style={{ paddingHorizontal: 4 }}>
              <AppText
                variant="heading"
                style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, textAlign: 'right' }}
              >
                2. تقييم التجربة العامة (اختياري)
              </AppText>
              <AppText variant="caption" muted style={{ textAlign: 'right', marginTop: 2 }}>
                {conformity === 'could_not_verify'
                  ? 'غير متاح عند تعذّر التحقق'
                  : 'حدد مستوى رضاك عن تجربتك العامة في الفرع'}
              </AppText>
            </View>

            {conformity === 'could_not_verify' ? (
              <Card
                {...rtlWebProps}
                style={{
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <HelpCircle size={22} color={isDark ? '#94A3B8' : '#64748B'} />
                <AppText
                  style={{
                    fontSize: 13,
                    color: isDark ? '#94A3B8' : '#64748B',
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  {'لا يمكن تقييم النجوم عند اختيار "تعذّر التحقق"، وفقاً لقواعد المنصة لحماية دقة التقييمات.'}
                </AppText>
              </Card>
            ) : (
              <Card
                {...rtlWebProps}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* 5-star selector */}
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const isFilled = experienceStars !== null && starIndex <= experienceStars;

                    return (
                      <Pressable
                        key={starIndex}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        accessibilityLabel={`${starIndex} نجوم - ${STAR_RATING_LABELS[starIndex]}`}
                        accessibilityState={{
                          selected: experienceStars === starIndex,
                          disabled: isSubmitting,
                        }}
                        onPress={() => handleSelectStars(starIndex)}
                        style={({ pressed }) => ({
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isFilled
                            ? isDark
                              ? '#422006'
                              : '#FEF9C3'
                            : isDark
                            ? '#1F2937'
                            : '#F8FAFC',
                          borderWidth: 1,
                          borderColor: isFilled ? '#EAB308' : colors.border,
                          opacity: pressed ? 0.75 : 1,
                        })}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Star
                          size={24}
                          color={isFilled ? '#EAB308' : isDark ? '#64748B' : '#94A3B8'}
                          fill={isFilled ? '#FACC15' : 'transparent'}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Selected Star Label */}
                {experienceStars !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText style={{ fontSize: 14, fontWeight: '800', color: colors.foreground }}>
                      {STAR_RATING_LABELS[experienceStars]} ({experienceStars} من 5)
                    </AppText>
                    <Pressable
                      disabled={isSubmitting}
                      accessibilityRole="button"
                      accessibilityLabel="إلغاء تقييم النجوم"
                      onPress={() => {
                        if (isSubmitting) return;
                        isUserEditedRef.current = true;
                        setExperienceStars(null);
                      }}
                      style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                    >
                      <AppText variant="caption" style={{ color: '#EF4444', fontWeight: '700' }}>
                        إلغاء التحديد
                      </AppText>
                    </Pressable>
                  </View>
                ) : (
                  <AppText variant="caption" muted>
                    انقر على أحد النجوم لتحديد تقييمك (اختياري)
                  </AppText>
                )}
              </Card>
            )}
          </View>

          {/* Boundaries Note */}
          <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
            <AppText
              style={{
                fontSize: 12,
                color: isDark ? '#94A3B8' : '#64748B',
                textAlign: 'right',
                lineHeight: 18,
              }}
            >
              • التقييم خاص بمطابقة هذا العرض المحدد وتجربتك معه، ولا يمثل تقييماً عاماً للمتجر ككل.
              {'\n'}• إذا واجهت مخالفة جسيمة أو امتناعاً عن تقديم العرض، يمكنك تقديم شكوى رسمية من صفحة العرض.
            </AppText>
          </View>

          {/* Submit Button */}
          <View style={{ marginTop: 8 }}>
            <AppButton
              title={
                isSubmitting
                  ? 'جارٍ حفظ التقييم...'
                  : existingRating
                  ? 'تحديث التقييم'
                  : 'إرسال التقييم'
              }
              variant="primary"
              disabled={isSubmitting || !conformity}
              onPress={() => void handleSubmit()}
              style={{
                height: 52,
                borderRadius: 26,
              }}
            />

            {isSubmitting && (
              <ActivityIndicator style={{ marginTop: 12 }} color="#FACC15" />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
