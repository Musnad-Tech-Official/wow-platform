import type { ComplaintStatus, ComplaintType, CustomerComplaint } from '@wow/api';

/**
 * Pure display, formatting, filtering, and pagination helpers for CUS-08 My Complaints ("شكاواي").
 */

export type ComplaintFilter = 'all' | 'in_progress' | 'closed';

export interface ComplaintFilterOption {
  id: ComplaintFilter;
  label: string;
}

export const COMPLAINT_FILTERS: readonly ComplaintFilterOption[] = [
  { id: 'all', label: 'الكل' },
  { id: 'in_progress', label: 'قيد المتابعة' },
  { id: 'closed', label: 'مغلقة' },
] as const;

export interface ComplaintStatusDisplayInfo {
  status: ComplaintStatus;
  label: string;
  description: string;
  tone: 'brand' | 'info' | 'warning' | 'neutral';
  light: {
    bg: string;
    text: string;
    border: string;
  };
  dark: {
    bg: string;
    text: string;
    border: string;
  };
}

/**
 * Strict 1:1 mapping of the 4 database statuses to approved Arabic labels and high-contrast tokens.
 * - new -> جديدة
 * - investigating -> قيد المراجعة
 * - waiting -> بانتظار إجراء
 * - closed -> مغلقة
 *
 * Never marks "closed" as "تم الحل".
 * Never implies "waiting" requires user action unless confirmed.
 */
export const COMPLAINT_STATUS_MAP: Record<ComplaintStatus, ComplaintStatusDisplayInfo> = {
  new: {
    status: 'new',
    label: 'جديدة',
    description: 'تم تسجيل الشكوى بنجاح وبانتظار بدء المراجعة من إدارة المنصة.',
    tone: 'brand',
    light: {
      bg: '#FEF9C3', // yellow-100
      text: '#854D0E', // yellow-800
      border: '#FDE047', // yellow-300
    },
    dark: {
      bg: '#422006', // yellow-950
      text: '#FEF08A', // yellow-200
      border: '#854D0E', // yellow-800
    },
  },
  investigating: {
    status: 'investigating',
    label: 'قيد المراجعة',
    description: 'يجري التحقق من بيانات الشكوى والتواصل مع الأطراف المعنية.',
    tone: 'info',
    light: {
      bg: '#EFF6FF', // blue-50
      text: '#1D4ED8', // blue-700
      border: '#BFDBFE', // blue-200
    },
    dark: {
      bg: '#172554', // blue-950
      text: '#93C5FD', // blue-300
      border: '#1E40AF', // blue-800
    },
  },
  waiting: {
    status: 'waiting',
    label: 'بانتظار إجراء',
    description: 'البلاغ بانتظار استكمال إجراءات التحقق الإداري أو رد المتجر.',
    tone: 'warning',
    light: {
      bg: '#FFF7ED', // orange-50
      text: '#C2410C', // orange-700
      border: '#FED7AA', // orange-200
    },
    dark: {
      bg: '#431407', // orange-950
      text: '#FDBA74', // orange-300
      border: '#9A3412', // orange-800
    },
  },
  closed: {
    status: 'closed',
    label: 'مغلقة',
    description: 'تم إغلاق ملف الشكوى من قِبل إدارة المنصة.',
    tone: 'neutral',
    light: {
      bg: '#F1F5F9', // slate-100
      text: '#475569', // slate-600
      border: '#CBD5E1', // slate-300
    },
    dark: {
      bg: '#1E293B', // slate-800
      text: '#94A3B8', // slate-400
      border: '#334155', // slate-700
    },
  },
};

export function resolveComplaintStatusInfo(status: ComplaintStatus): ComplaintStatusDisplayInfo {
  return COMPLAINT_STATUS_MAP[status] ?? COMPLAINT_STATUS_MAP.new;
}

export interface ComplaintTypeDisplayMeta {
  type: ComplaintType;
  shortLabel: string;
  fullLabel: string;
  iconName: 'equal' | 'zap-off' | 'file-warning' | 'layers' | 'shield-alert' | 'help-circle';
}

export const COMPLAINT_TYPE_DISPLAY_MAP: Record<ComplaintType, ComplaintTypeDisplayMeta> = {
  price_mismatch: {
    type: 'price_mismatch',
    shortLabel: 'اختلاف في السعر',
    fullLabel: 'اختلاف في السعر أو الرسوم الإلزامية',
    iconName: 'equal',
  },
  unavailable: {
    type: 'unavailable',
    shortLabel: 'العرض غير متاح',
    fullLabel: 'العرض غير متاح في الفرع',
    iconName: 'zap-off',
  },
  misleading_terms: {
    type: 'misleading_terms',
    shortLabel: 'شروط مضللة',
    fullLabel: 'شروط مضللة أو قيود غير معلنة',
    iconName: 'file-warning',
  },
  product_mismatch: {
    type: 'product_mismatch',
    shortLabel: 'اختلاف في المنتجات',
    fullLabel: 'اختلاف في المنتجات أو مستوى الخدمة',
    iconName: 'layers',
  },
  business_conduct: {
    type: 'business_conduct',
    shortLabel: 'سوء تعامل',
    fullLabel: 'سوء تعامل أو رفض قبول المستفيدين',
    iconName: 'shield-alert',
  },
  other: {
    type: 'other',
    shortLabel: 'مشكلة أخرى',
    fullLabel: 'مشكلة أخرى',
    iconName: 'help-circle',
  },
};

export function getComplaintTypeShortLabel(type: ComplaintType): string {
  return COMPLAINT_TYPE_DISPLAY_MAP[type]?.shortLabel ?? type;
}

export function getComplaintTypeMeta(type: ComplaintType): ComplaintTypeDisplayMeta {
  return COMPLAINT_TYPE_DISPLAY_MAP[type] ?? COMPLAINT_TYPE_DISPLAY_MAP.other;
}

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

/**
 * Formats ISO created_at string into verified Arabic date display.
 * E.g. "2026-10-23T10:00:00Z" -> "٢٣ أكتوبر ٢٠٢٦" (or localized Arabic date).
 */
export function formatComplaintDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return 'تاريخ غير محدد';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      try {
        return new Intl.DateTimeFormat('ar-YE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(d);
      } catch {
        // Fallback to manual Arabic month if ar-YE fails in environment
      }
    }

    const day = d.getDate();
    const month = ARABIC_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats a complaint UUID into the shortened reference code shown in the design reference.
 * E.g. "c1111111-a12f-..." -> "رقم الشكوى A12F..." or "رقم الشكوى #A12F3D9B".
 */
export function formatComplaintReference(
  id?: string | null,
  style: 'ellipsis' | 'hash' = 'ellipsis',
): string {
  if (!id || !id.trim()) return 'رقم الشكوى: غير محدد';
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length === 0) return 'رقم الشكوى: غير محدد';

  if (style === 'hash') {
    return `رقم الشكوى #${clean.slice(0, 8)}`;
  }
  return `رقم الشكوى ${clean.slice(0, 4)}...`;
}

/**
 * Filters the currently loaded complaints honest to actual data.
 * - 'all': all complaints
 * - 'in_progress': new, investigating, and waiting
 * - 'closed': closed
 */
export function filterComplaints(
  complaints: readonly CustomerComplaint[],
  filter: ComplaintFilter,
): CustomerComplaint[] {
  if (!Array.isArray(complaints)) return [];
  if (filter === 'all') return [...complaints];
  if (filter === 'in_progress') {
    return complaints.filter(
      (c) => c && (c.status === 'new' || c.status === 'investigating' || c.status === 'waiting'),
    );
  }
  if (filter === 'closed') {
    return complaints.filter((c) => c && c.status === 'closed');
  }
  return [...complaints];
}

/**
 * Sorts complaints newest-first by created_at.
 */
export function sortComplaintsNewestFirst(
  complaints: readonly CustomerComplaint[],
): CustomerComplaint[] {
  if (!Array.isArray(complaints)) return [];
  return [...complaints].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime() || 0;
    const timeB = new Date(b.created_at).getTime() || 0;
    return timeB - timeA;
  });
}

/**
 * Deduplicates complaints by ID, preserving the newest-first sort order.
 */
export function deduplicateComplaints(
  existing: readonly CustomerComplaint[],
  incoming: readonly CustomerComplaint[],
): CustomerComplaint[] {
  const seen = new Set<string>();
  const combined: CustomerComplaint[] = [];

  for (const item of existing) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      combined.push(item);
    }
  }

  for (const item of incoming) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      combined.push(item);
    }
  }

  return sortComplaintsNewestFirst(combined);
}

/**
 * CUS-09 Complaint Details boundary guard.
 * Details view and case timeline are separate future stages.
 */
export const IS_CUS09_DETAILS_AVAILABLE = false;

/**
 * Verified offline development fixtures for visual review and tests.
 * Strictly guarded; never used in live production data reads.
 */
export const FIXTURE_COMPLAINTS: readonly CustomerComplaint[] = [
  {
    id: 'c1111111-a12f-4000-8000-000000000001',
    offer_id: 'e0000000-0000-4000-8000-000000000001',
    offer_version_id: 'v0000000-0000-4000-8000-000000000001',
    branch_id: null,
    complaint_type: 'price_mismatch',
    description: 'السعر الذي طلب في المتجر يختلف عن المبلغ المعلن داخل العرض.',
    incident_at: '2026-10-23',
    status: 'investigating',
    public_outcome: null,
    created_at: '2026-10-23T10:30:00Z',
    closed_at: null,
    updates: [],
  },
  {
    id: 'c2222222-b8c2-4000-8000-000000000002',
    offer_id: 'e0000000-0000-4000-8000-000000000001',
    offer_version_id: 'v0000000-0000-4000-8000-000000000001',
    branch_id: 'br000000-0000-4000-8000-000000000001',
    complaint_type: 'unavailable',
    description: 'تعذّر الحصول على العرض في الفرع المحدد رغم ظهوره في التطبيق.',
    incident_at: '2026-10-19',
    status: 'waiting',
    public_outcome: null,
    created_at: '2026-10-19T14:15:00Z',
    closed_at: null,
    updates: [],
  },
  {
    id: 'c3333333-d91e-4000-8000-000000000003',
    offer_id: 'e0000000-0000-4000-8000-000000000001',
    offer_version_id: 'v0000000-0000-4000-8000-000000000001',
    branch_id: null,
    complaint_type: 'misleading_terms',
    description: 'تبيّن وجود شروط إضافية لم تكن موضحة وقت تقديم العرض.',
    incident_at: '2026-10-15',
    status: 'closed',
    public_outcome: 'تمت مراجعة الشروط وتعديل صياغة العرض مع المتجر المعني.',
    created_at: '2026-10-15T09:00:00Z',
    closed_at: '2026-10-18T16:00:00Z',
    updates: [],
  },
  {
    id: 'c4444444-e555-4000-8000-000000000004',
    offer_id: 'e0000000-0000-4000-8000-000000000001',
    offer_version_id: 'v0000000-0000-4000-8000-000000000001',
    branch_id: null,
    complaint_type: 'product_mismatch',
    description: 'تم تقديم صنف مختلف عن الموصوف في العرض ولم يتم تعويض الفارق.',
    incident_at: '2026-10-25',
    status: 'new',
    public_outcome: null,
    created_at: '2026-10-25T11:45:00Z',
    closed_at: null,
    updates: [],
  },
] as const;
