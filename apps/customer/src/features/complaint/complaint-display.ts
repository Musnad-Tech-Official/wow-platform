import type { ComplaintType } from '@wow/api';

/**
 * Pure validation, formatting and honest capabilities for CUS-07 Submit Complaint.
 */

export interface ComplaintTypeOption {
  value: ComplaintType;
  label: string;
  description: string;
}

/**
 * The 6 approved ComplaintType options mapping 1:1 to the Migration 005 database contract.
 */
export const COMPLAINT_TYPE_OPTIONS: readonly ComplaintTypeOption[] = [
  {
    value: 'price_mismatch',
    label: 'اختلاف في السعر أو الرسوم الإلزامية',
    description: 'السعر المطلوب يختلف عن السعر النهائي المعلن أو فُرضت رسوم إضافية غير معلنة.',
  },
  {
    value: 'unavailable',
    label: 'العرض غير متاح في الفرع',
    description: 'رفض الفرع تقديم العرض أو أفاد بنفاد الكمية دون توضيح ذلك في الشروط.',
  },
  {
    value: 'misleading_terms',
    label: 'شروط مضللة أو قيود غير معلنة',
    description: 'فرض شروط استثنائية أو قيود على أوقات الاستخدام لم تُذكر في تفاصيل العرض.',
  },
  {
    value: 'product_mismatch',
    label: 'اختلاف في المنتجات أو مستوى الخدمة',
    description: 'الأصناف أو الكميات أو الخدمات المقدمة لا تطابق الموصوف في العرض.',
  },
  {
    value: 'business_conduct',
    label: 'سوء تعامل أو رفض قبول المستفيدين',
    description: 'تعامل غير لائق من طاقم العمل أو التمييز ضد مستخدمي منصة واو.',
  },
  {
    value: 'other',
    label: 'مشكلة أخرى',
    description: 'أي مخالفة أو ملاحظة أخرى ترغب في إبلاغ إدارة المنصة عنها.',
  },
] as const;

export const MIN_DESCRIPTION_LENGTH = 15;
export const MAX_DESCRIPTION_LENGTH = 4000;

export interface ComplaintFormValues {
  complaintType: ComplaintType | null;
  description: string;
  branchId: string | null;
  incidentDate: string;
}

export interface ComplaintFormErrors {
  complaintType?: string;
  description?: string;
  branchId?: string;
  incidentDate?: string;
}

/**
 * Formats a Date instance as YYYY-MM-DD in the local calendar/timezone.
 */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export function getLocalTodayDate(nowProvider?: () => Date): string {
  return formatLocalDate(nowProvider ? nowProvider() : new Date());
}

/**
 * Returns yesterday's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export function getLocalYesterdayDate(nowProvider?: () => Date): string {
  const d = nowProvider ? nowProvider() : new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

/**
 * Validates incident date input string.
 * Strictly requires YYYY-MM-DD format, verifies calendar validity (including leap years),
 * avoids unsupported historical cutoff (per wow_private.submit_complaint_internal contract),
 * and enforces the backend future-date restriction (<= now + 5 minutes).
 */
export function validateIncidentDate(
  dateStr?: string | null,
  nowProvider?: () => Date,
): {
  isValid: boolean;
  isoString: string | null;
  error?: string;
} {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: true, isoString: null };
  }

  const trimmed = dateStr.trim();

  // 1. Strict YYYY-MM-DD format check
  const match = trimmed.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  if (!match) {
    return {
      isValid: false,
      isoString: null,
      error: 'تاريخ غير صحيح. يرجى إدخال تاريخ صالح بصيغة YYYY-MM-DD (مثال: 2026-11-08).',
    };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // 2. Strict calendar validity check (including leap years and variable month lengths)
  // Date.UTC(year, month, 0) gives the last day of 'month'
  const maxDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > maxDays) {
    return {
      isValid: false,
      isoString: null,
      error: 'تاريخ غير صحيح. اليوم غير موجود في هذا الشهر والتقويم.',
    };
  }

  if (year < 1900) {
    return {
      isValid: false,
      isoString: null,
      error: 'تاريخ غير صحيح. يرجى إدخال سنة صالحة.',
    };
  }

  const now = nowProvider ? nowProvider() : new Date();
  const localToday = formatLocalDate(now);

  // 3. Backend future date restriction: p_incident_at > now() + INTERVAL '5 minutes'
  if (trimmed > localToday) {
    return {
      isValid: false,
      isoString: null,
      error: 'تاريخ حدوث المشكلة لا يمكن أن يكون في المستقبل.',
    };
  }

  // 4. Timezone-aware date serialization
  // If the incident happened today, serialize to current local moment.
  // For past days, create local noon to safely sit within the calendar day without UTC edge spills.
  let incidentDateObj: Date;
  if (trimmed === localToday) {
    incidentDateObj = new Date(now.getTime());
  } else {
    incidentDateObj = new Date(year, month - 1, day, 12, 0, 0);
  }

  if (incidentDateObj.getTime() > now.getTime() + 5 * 60 * 1000) {
    return {
      isValid: false,
      isoString: null,
      error: 'تاريخ حدوث المشكلة لا يمكن أن يكون في المستقبل.',
    };
  }

  return { isValid: true, isoString: incidentDateObj.toISOString() };
}

/**
 * Validates the complete complaint form on client before submission or review.
 */
export function validateComplaintForm(
  values: ComplaintFormValues,
  eligibleBranchIds?: string[],
  nowProvider?: () => Date,
): {
  isValid: boolean;
  errors: ComplaintFormErrors;
  normalizedDescription: string;
  serializedIncidentAt: string | null;
} {
  const errors: ComplaintFormErrors = {};
  const normalizedDescription = values.description.trim();

  // 1. Complaint Type
  if (!values.complaintType) {
    errors.complaintType = 'يرجى اختيار نوع المشكلة من القائمة.';
  } else if (!COMPLAINT_TYPE_OPTIONS.some((o) => o.value === values.complaintType)) {
    errors.complaintType = 'نوع المشكلة المحدد غير صالح.';
  }

  // 2. Description (15 to 4000 characters)
  if (!normalizedDescription) {
    errors.description = 'يرجى كتابة تفاصيل ما حدث بدقة.';
  } else if (normalizedDescription.length < MIN_DESCRIPTION_LENGTH) {
    errors.description = `يجب أن يحتوي الوصف على ${MIN_DESCRIPTION_LENGTH} حرفاً على الأقل (الحالي: ${normalizedDescription.length} حرفاً).`;
  } else if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `لا يمكن أن يتجاوز الوصف ${MAX_DESCRIPTION_LENGTH} حرفاً (الحالي: ${normalizedDescription.length} حرفاً).`;
  }

  // 3. Branch Validation (optional, but if selected must be eligible)
  if (values.branchId && eligibleBranchIds && eligibleBranchIds.length > 0) {
    if (!eligibleBranchIds.includes(values.branchId)) {
      errors.branchId = 'الفرع المحدد غير مشمول في هذا العرض.';
    }
  }

  // 4. Incident Date Validation (optional, but if entered must be valid and past/present)
  const dateValidation = validateIncidentDate(values.incidentDate, nowProvider);
  if (!dateValidation.isValid) {
    errors.incidentDate = dateValidation.error;
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    normalizedDescription,
    serializedIncidentAt: dateValidation.isoString,
  };
}

/**
 * Returns human-readable Arabic label for a given ComplaintType.
 */
export function getComplaintTypeLabel(type?: ComplaintType | null): string {
  if (!type) return 'غير محدد';
  const match = COMPLAINT_TYPE_OPTIONS.find((o) => o.value === type);
  return match ? match.label : type;
}

/**
 * Honest error mapping for complaint submission.
 * Ambiguous network outcomes give honest uncertainty guidance without referencing
 * unbuilt complaint-list routes (CUS-08).
 */
export function mapComplaintSubmissionError(err: unknown): {
  message: string;
  isAmbiguous: boolean;
} {
  const rawMessage = err instanceof Error ? err.message : String(err ?? '');
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    rawMessage.includes('UUID') ||
    rawMessage.includes('check write outcome') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('Ambiguous') ||
    // The server may have committed the complaint before a transport failure.
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('fetch') ||
    normalizedMessage.includes('connection') ||
    normalizedMessage.includes('abort')
  ) {
    return {
      message:
        'تعذّر التأكد من اكتمال استلام الشكوى بسبب انقطاع مؤقت في الاتصال. يُرجى التريث قبل إعادة المحاولة تجنباً لتكرار الشكوى غير المقصود.',
      isAmbiguous: true,
    };
  }

  if (rawMessage.includes('Branch does not belong')) {
    return {
      message: 'الفرع المحدد لم يعد مشمولاً في هذا العرض.',
      isAmbiguous: false,
    };
  }

  if (rawMessage.includes('must reference an approved version')) {
    return {
      message: 'تعذّر إرسال الشكوى: هذا العرض غير معتمد أو غير متاح حالياً.',
      isAmbiguous: false,
    };
  }

  if (rawMessage.includes('Invalid complaint') || rawMessage.includes('evidence')) {
    return {
      message: 'تعذّر قبول البيانات: يرجى التحقق من صحة الحقول وإعادة المحاولة.',
      isAmbiguous: false,
    };
  }

  return {
    message:
      rawMessage ||
      'حدث خطأ غير متوقع أثناء إرسال الشكوى. لم تفقد بياناتك المكتوبة ويمكنك إعادة المحاولة.',
    isAmbiguous: false,
  };
}

export interface ExecuteSubmitComplaintOptions {
  isSubmittingRef: { current: boolean };
  offerId: string;
  complaintType: ComplaintType | null;
  description: string;
  branchId?: string | null;
  incidentDate?: string | null;
  eligibleBranchIds?: string[];
  mutateAsync: (input: {
    offerId: string;
    complaintType: ComplaintType;
    description: string;
    branchId: string | null;
    incidentAt: string | null;
  }) => Promise<string>;
  onSuccess: (complaintId: string) => void;
  onError: (errorMessage: string) => void;
  onValidationError?: (errors: ComplaintFormErrors) => void;
  setIsSubmitting?: (submitting: boolean) => void;
  isFixture?: boolean;
}

export type SubmissionResult =
  | { status: 'blocked_duplicate' }
  | { status: 'validation_error'; errors: ComplaintFormErrors }
  | { status: 'success'; complaintId: string }
  | { status: 'error'; error: string; isAmbiguous: boolean };

/**
 * Executes complaint submission with synchronous ref double-submit protection,
 * client validation, non-idempotent create safety (no automatic retry on ambiguous write),
 * and draft preservation.
 */
export async function executeComplaintSubmission(
  options: ExecuteSubmitComplaintOptions,
): Promise<SubmissionResult> {
  // 1. Synchronous ref guard prevents simultaneous double submissions
  if (options.isSubmittingRef.current) {
    return { status: 'blocked_duplicate' };
  }

  // 2. Validate form
  const validation = validateComplaintForm(
    {
      complaintType: options.complaintType,
      description: options.description,
      branchId: options.branchId ?? null,
      incidentDate: options.incidentDate ?? '',
    },
    options.eligibleBranchIds,
  );

  if (!validation.isValid) {
    options.onValidationError?.(validation.errors);
    return { status: 'validation_error', errors: validation.errors };
  }

  // Synchronously lock submission before any await
  options.isSubmittingRef.current = true;
  options.setIsSubmitting?.(true);

  if (options.isFixture) {
    const fixtureComplaintId = 'c0000000-0000-4000-8000-000000000001';
    options.onSuccess(fixtureComplaintId);
    options.isSubmittingRef.current = false;
    options.setIsSubmitting?.(false);
    return { status: 'success', complaintId: fixtureComplaintId };
  }

  try {
    const complaintId = await options.mutateAsync({
      offerId: options.offerId,
      complaintType: options.complaintType!,
      description: validation.normalizedDescription,
      branchId:
        options.branchId && options.branchId.trim().length > 0
          ? options.branchId.trim()
          : null,
      incidentAt: validation.serializedIncidentAt,
    });

    options.onSuccess(complaintId);
    return { status: 'success', complaintId };
  } catch (err: unknown) {
    const mapped = mapComplaintSubmissionError(err);
    options.onError(mapped.message);
    return { status: 'error', error: mapped.message, isAmbiguous: mapped.isAmbiguous };
  } finally {
    options.isSubmittingRef.current = false;
    options.setIsSubmitting?.(false);
  }
}

/**
 * Evidence attachment is a separate post-create operation.
 */
export const IS_EVIDENCE_ATTACHMENT_SUPPORTED = true;

/**
 * Honest navigation capability check: CUS-08 and CUS-09 are not implemented in this phase.
 */
export const IS_CUS08_ROUTE_AVAILABLE = false;
export const IS_CUS09_ROUTE_AVAILABLE = false;

/**
 * Verified development fixture offer for offline UI review and testing.
 * Strictly guarded by __DEV__; never used in production.
 */
export const FIXTURE_OFFER: import('@wow/api').PublicOfferDetails = {
  id: 'e0000000-0000-4000-8000-000000000001',
  business_id: 'b0000000-0000-4000-8000-000000000001',
  business: {
    id: 'b0000000-0000-4000-8000-000000000001',
    name: 'مطعم وكافيه السعيد',
    contact_phone: '+967771234567',
    logo_url: null,
  },
  title: 'وجبة غداء يمنية عائلية مع المشروبات والتحلية',
  description: 'عرض غداء عائلي متكامل يشمل الأطباق الرئيسية والمشروبات والتحلية لعدد 4 أشخاص.',
  offer_kind: 'bundle',
  original_price: '28000',
  final_price: '19500',
  currency: 'YER',
  discount_percent: '30',
  benefit_details: 'توفير 8,500 ريال يمني مع تحلية ومشروبات مجانية',
  mandatory_fees: 'ضريبة القيمة المضافة 5% متضمنة',
  terms: 'يسري العرض يومياً من الساعة 1 ظهراً حتى 7 مساءً. لا يسري في أيام العطل الرسمية.',
  stock_or_condition_notice: 'الكمية اليومية محدودة بـ 50 وجبة لكل فرع',
  starts_at: '2026-11-01T00:00:00Z',
  ends_at: '2026-11-30T23:59:59Z',
  items: [
    {
      item_type: 'product',
      name: 'مندي لحم بلدي عائلي',
      description: 'لحم بلدي طازج مع أرز مندي',
      brand: null,
      model: null,
      quantity: 1,
      unit: 'وجبة',
      reference_value: '18000',
      attributes: [],
    },
    {
      item_type: 'product',
      name: 'سلطات ومقبلات مشكلة',
      description: 'سلطة خضراء وحمص ومتبل وشطة عدنية',
      brand: null,
      model: null,
      quantity: 4,
      unit: 'صحن',
      reference_value: '4000',
      attributes: [],
    },
    {
      item_type: 'product',
      name: 'مشروبات غازية أو عصائر طبيعية',
      description: 'مشروبات باردة متنوعة',
      brand: null,
      model: null,
      quantity: 4,
      unit: 'كوب',
      reference_value: '3000',
      attributes: [],
    },
  ],
  branches: [
    {
      id: 'br000000-0000-4000-8000-000000000001',
      name: 'فرع حدة الرئيسي',
      city: 'صنعاء',
      district: 'حدة',
      address_line: 'شارع حدة، بجوار مركز الكميم',
      latitude: 15.321,
      longitude: 44.195,
      is_primary: true,
    },
    {
      id: 'br000000-0000-4000-8000-000000000002',
      name: 'فرع الستين الغربي',
      city: 'صنعاء',
      district: 'الستين',
      address_line: 'تقاطع شارع الستين مع الزبيري',
      latitude: 15.352,
      longitude: 44.181,
      is_primary: false,
    },
  ],
};
