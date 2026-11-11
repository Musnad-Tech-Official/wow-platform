import type {
  CustomerOfferRating,
  OfferConformity,
  PublicOfferDetails,
  RatingModerationStatus,
} from '@wow/api';
import { isValidUuid } from '../offer/offer-display';

export interface ConformityOption {
  value: OfferConformity;
  label: string;
  description: string;
  shortLabel: string;
  tone: 'success' | 'warning' | 'neutral';
}

export const CONFORMITY_OPTIONS: readonly ConformityOption[] = [
  {
    value: 'matches',
    label: 'مطابق للعرض',
    shortLabel: 'مطابق',
    description: 'العرض والخدمة كانا مطابقين تماماً لما هو معلن في الفرع.',
    tone: 'success',
  },
  {
    value: 'does_not_match',
    label: 'غير مطابق للعرض',
    shortLabel: 'غير مطابق',
    description: 'العرض أو الخدمة اختلفا عما تم الإعلان عنه.',
    tone: 'warning',
  },
  {
    value: 'could_not_verify',
    label: 'تعذّر التحقق',
    shortLabel: 'تعذّر التحقق',
    description: 'لم أتمكن من التأكد أو التحقق من مطابقة تفاصيل العرض.',
    tone: 'neutral',
  },
] as const;

export const STAR_RATING_LABELS: Record<number, string> = {
  1: 'ضعيف جداً',
  2: 'ضعيف',
  3: 'مقبول',
  4: 'جيد',
  5: 'ممتاز',
};

export interface RatingValidationResult {
  isValid: boolean;
  errors: {
    offerId?: string;
    conformity?: string;
    experienceStars?: string;
  };
}

/**
 * Pure validation engine for offer ratings.
 * Validates UUID, conformity choice, and enforces that could_not_verify MUST have null stars.
 */
export function validateRatingForm(input: {
  offerId?: string | null;
  conformity?: OfferConformity | null;
  experienceStars?: number | null;
}): RatingValidationResult {
  const errors: RatingValidationResult['errors'] = {};

  if (!input.offerId || !isValidUuid(input.offerId)) {
    errors.offerId = 'معرّف العرض غير صالح أو مفقود.';
  }

  if (!input.conformity) {
    errors.conformity = 'يرجى اختيار مدى مطابقة العرض.';
  } else if (!['matches', 'does_not_match', 'could_not_verify'].includes(input.conformity)) {
    errors.conformity = 'قيمة مطابقة العرض غير صحيحة.';
  }

  // Strict constraint: could_not_verify MUST have null / omitted stars
  if (input.conformity === 'could_not_verify' && input.experienceStars !== null && input.experienceStars !== undefined) {
    errors.experienceStars = 'لا يمكن تحديد تقييم بالنجوم عند اختيار "تعذّر التحقق".';
  } else if (
    input.experienceStars !== null &&
    input.experienceStars !== undefined &&
    (!Number.isInteger(input.experienceStars) || input.experienceStars < 1 || input.experienceStars > 5)
  ) {
    errors.experienceStars = 'تقييم النجوم يجب أن يكون عدداً صحيحاً بين 1 و 5.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats ISO timestamps into accessible Arabic date strings.
 */
export function formatRatingArabicDate(isoDateString?: string | null): string {
  if (!isoDateString) return 'تاريخ غير محدد';
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return 'تاريخ غير محدد';

    const day = date.getDate();
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return 'تاريخ غير محدد';
  }
}

export function getConformityBadgeProps(conformity: OfferConformity): {
  label: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderColorLight: string;
  borderColorDark: string;
} {
  switch (conformity) {
    case 'matches':
      return {
        label: 'مطابق للعرض',
        bgLight: '#ECFDF5',
        bgDark: '#064E3B',
        textLight: '#047857',
        textDark: '#A7F3D0',
        borderColorLight: '#A7F3D0',
        borderColorDark: '#065F46',
      };
    case 'does_not_match':
      return {
        label: 'غير مطابق للعرض',
        bgLight: '#FFFBEB',
        bgDark: '#78350F',
        textLight: '#B45309',
        textDark: '#FDE68A',
        borderColorLight: '#FDE68A',
        borderColorDark: '#92400E',
      };
    case 'could_not_verify':
    default:
      return {
        label: 'تعذّر التحقق',
        bgLight: '#F1F5F9',
        bgDark: '#1E293B',
        textLight: '#475569',
        textDark: '#CBD5E1',
        borderColorLight: '#CBD5E1',
        borderColorDark: '#334155',
      };
  }
}

export function getModerationStatusBadgeProps(status: RatingModerationStatus): {
  label: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
} {
  switch (status) {
    case 'normal':
      return {
        label: 'معتمد',
        bgLight: '#F0FDF4',
        bgDark: '#14532D',
        textLight: '#15803D',
        textDark: '#86EFAC',
      };
    case 'under_review':
      return {
        label: 'قيد المراجعة',
        bgLight: '#FEFCE8',
        bgDark: '#713F12',
        textLight: '#A16207',
        textDark: '#FEF08A',
      };
    case 'excluded':
      return {
        label: 'مستبعد',
        bgLight: '#FEF2F2',
        bgDark: '#7F1D1D',
        textLight: '#B91C1C',
        textDark: '#FECACA',
      };
  }
}

/**
 * Pure execution helper for submitting offer ratings with double-tap protection,
 * validation, and honest error mapping for server-enforced assessment windows.
 */
export async function executeGuardedRatingSubmission(options: {
  offerId: string;
  conformity: OfferConformity | null;
  experienceStars?: number | null;
  isSubmittingRef: { current: boolean };
  submitRatingMutation: {
    mutateAsync: (input: {
      offerId: string;
      conformity: OfferConformity;
      experienceStars?: number | null;
    }) => Promise<string>;
  };
}): Promise<{ success: boolean; ratingId?: string; errorMessage?: string }> {
  const { offerId, conformity, experienceStars, isSubmittingRef, submitRatingMutation } = options;

  // 1. Guard against duplicate rapid clicks / in-flight requests
  if (isSubmittingRef.current) {
    return { success: false, errorMessage: 'جارٍ إرسال التقييم بالفعل، يُرجى الانتظار.' };
  }

  // 2. Validate form inputs
  const validation = validateRatingForm({ offerId, conformity, experienceStars });
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return { success: false, errorMessage: firstError };
  }

  isSubmittingRef.current = true;

  try {
    const cleanStars = conformity === 'could_not_verify' ? null : (experienceStars ?? null);

    const ratingId = await submitRatingMutation.mutateAsync({
      offerId,
      conformity: conformity as OfferConformity,
      experienceStars: cleanStars,
    });

    return { success: true, ratingId };
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : String(err);

    // Check for PostgreSQL 14-day assessment window error
    if (
      rawMessage.includes('14-day assessment window') ||
      rawMessage.includes('22023') ||
      rawMessage.includes('assessment window')
    ) {
      return {
        success: false,
        errorMessage:
          'انتهت فترة تقييم هذا العرض أو أن العرض غير مؤهل للتقييم حالياً (تُتاح إمكانية التقييم خلال 14 يوماً من انتهاء العرض فقط).',
      };
    }

    if (rawMessage.includes('current_active_customer_id') || rawMessage.includes('customer account')) {
      return {
        success: false,
        errorMessage: 'يلزم تسجيل الدخول بحساب عميل نشط لإتمام تقييم العرض.',
      };
    }

    return {
      success: false,
      errorMessage: 'تعذر إرسال التقييم في الوقت الحالي. يُرجى التحقق من اتصالك وإعادة المحاولة.',
    };
  } finally {
    isSubmittingRef.current = false;
  }
}

// -----------------------------------------------------------------------------
// Fixtures for testing and offline screenshot capture (__DEV__ only)
// -----------------------------------------------------------------------------
export const FIXTURE_RATING_OFFER_ID = '99999999-9999-4999-a999-999999999999';

export const FIXTURE_RATING_OFFER: PublicOfferDetails = {
  id: FIXTURE_RATING_OFFER_ID,
  business_id: '88888888-8888-4888-a888-888888888888',
  business: {
    id: '88888888-8888-4888-a888-888888888888',
    name: 'مقهى الأريج المختص',
    contact_phone: '+967771234567',
    logo_url: null,
  },
  title: 'خصم 35% على باقة القهوة المختصة',
  description: 'استمتع بأجود أنواع البن المختص مع خيارات تحضير متعددة وخصم حصري لحاملي تطبيق WOW.',
  offer_kind: 'discount',
  original_price: '6000',
  final_price: '3900',
  currency: 'YER',
  discount_percent: '35',
  benefit_details: 'توفير 2,100 ريال يمني على باقة القهوة',
  mandatory_fees: null,
  terms: 'يسري العرض يومياً في جميع الفروع المشاركة.',
  stock_or_condition_notice: null,
  starts_at: '2026-11-01T00:00:00Z',
  ends_at: '2026-11-20T23:59:59Z',
  items: [],
  branches: [
    {
      id: 'branch-1111-1111',
      name: 'فرع حدة الرئيسي',
      city: 'صنعاء',
      district: 'حدة',
      address_line: 'شارع حدة',
      latitude: 15.32,
      longitude: 44.19,
      is_primary: true,
    },
  ],
};

export const FIXTURE_OFFERS_BY_ID: Record<string, { title: string; merchantName?: string }> = {
  [FIXTURE_RATING_OFFER_ID]: {
    title: FIXTURE_RATING_OFFER.title,
    merchantName: FIXTURE_RATING_OFFER.business?.name ?? 'مقهى الأريج المختص',
  },
  '22222222-2222-4222-a222-222222222222': {
    title: 'خصم 25% على باقة المأكولات العائلية',
    merchantName: 'مطعم السعيد للمأكولات اليمنية',
  },
  // 33333333-3333-4333-a333-333333333333 is deliberately omitted to demonstrate the unavailable-offer fallback
};

export const FIXTURE_MY_RATINGS: CustomerOfferRating[] = [
  {
    id: 'rating-001',
    offer_id: FIXTURE_RATING_OFFER_ID,
    offer_version_id: '77777777-7777-4777-a777-777777777777',
    conformity: 'matches',
    experience_stars: 5,
    moderation_status: 'normal',
    created_at: '2026-11-08T14:30:00Z',
    updated_at: '2026-11-08T14:30:00Z',
  },
  {
    id: 'rating-002',
    offer_id: '22222222-2222-4222-a222-222222222222',
    offer_version_id: 'version-002',
    conformity: 'does_not_match',
    experience_stars: 2,
    moderation_status: 'normal',
    created_at: '2026-11-05T10:15:00Z',
    updated_at: '2026-11-05T10:15:00Z',
  },
  {
    id: 'rating-003',
    offer_id: '33333333-3333-4333-a333-333333333333',
    offer_version_id: 'version-003',
    conformity: 'could_not_verify',
    experience_stars: null,
    moderation_status: 'normal',
    created_at: '2026-11-02T18:00:00Z',
    updated_at: '2026-11-02T18:00:00Z',
  },
];
