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
 * Validates incident date input string.
 * Ensures the date is valid and not in the future (> now + 5 minutes).
 */
export function validateIncidentDate(dateStr?: string | null): {
  isValid: boolean;
  isoString: string | null;
  error?: string;
} {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: true, isoString: null };
  }

  const trimmed = dateStr.trim();
  const parsed = new Date(trimmed);

  if (isNaN(parsed.getTime())) {
    return {
      isValid: false,
      isoString: null,
      error: 'تاريخ غير صحيح. يرجى إدخال تاريخ صالح (مثال: 2026-11-08).',
    };
  }

  // Database enforces: p_incident_at > now() + INTERVAL '5 minutes' is forbidden
  const maxAllowedTime = Date.now() + 5 * 60 * 1000;
  if (parsed.getTime() > maxAllowedTime) {
    return {
      isValid: false,
      isoString: null,
      error: 'تاريخ حدوث المشكلة لا يمكن أن يكون في المستقبل.',
    };
  }

  // Reject clearly invalid historic dates (older than 1 year)
  const minAllowedTime = Date.now() - 365 * 24 * 60 * 60 * 1000;
  if (parsed.getTime() < minAllowedTime) {
    return {
      isValid: false,
      isoString: null,
      error: 'تاريخ حدوث المشكلة قديم جداً (أكثر من عام).',
    };
  }

  return { isValid: true, isoString: parsed.toISOString() };
}

/**
 * Validates the complete complaint form on client before submission or review.
 */
export function validateComplaintForm(
  values: ComplaintFormValues,
  eligibleBranchIds?: string[],
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
  const dateValidation = validateIncidentDate(values.incidentDate);
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
 * Honest capability check: evidence upload is not enabled in Migration 005.
 */
export const IS_EVIDENCE_ATTACHMENT_SUPPORTED = false;

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
