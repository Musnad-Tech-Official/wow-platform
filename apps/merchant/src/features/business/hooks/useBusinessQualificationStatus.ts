import { useMemo } from 'react';
import {
  useBusiness,
  useBusinessVerifications,
  useBusinessBranches,
  type Business,
  type BusinessVerification,
  type Branch,
} from '@wow/api';

export interface UseBusinessQualificationStatusProps {
  businessId?: string | null;
  fixtureAuth?: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId: string | null;
  };
  fixtureBusiness?: Partial<Business>;
  fixtureVerification?: Partial<BusinessVerification>;
  fixtureBranches?: Branch[];
}

export function formatArabicDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = [
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
    ];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function useBusinessQualificationStatus(props: UseBusinessQualificationStatusProps) {
  const isSyntheticPreview =
    (__DEV__ || process.env.NODE_ENV !== 'production') &&
    (Boolean(props.fixtureAuth) ||
      (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const activeBusinessId = props.businessId ?? (props.fixtureBusiness?.id ?? null);

  const {
    data: serverBusiness,
    isLoading: isBusinessLoading,
    error: businessError,
    refetch: refetchBusiness,
  } = useBusiness(isSyntheticPreview ? null : activeBusinessId);

  const {
    data: serverVerifications = [],
    isLoading: isVerifLoading,
    error: verifError,
    refetch: refetchVerifications,
  } = useBusinessVerifications(isSyntheticPreview ? null : activeBusinessId);

  const {
    data: serverBranches = [],
    isLoading: isBranchesLoading,
    refetch: refetchBranches,
  } = useBusinessBranches(isSyntheticPreview ? null : activeBusinessId);

  const business: Partial<Business> | null = useMemo(() => {
    if (isSyntheticPreview) {
      return (
        props.fixtureBusiness ?? {
          id: activeBusinessId || 'dev-synthetic-business-uuid',
          name: 'مؤسسة أفق التقنية',
          status: 'pending_review',
        }
      );
    }
    return serverBusiness ?? null;
  }, [isSyntheticPreview, props.fixtureBusiness, activeBusinessId, serverBusiness]);

  const latestVerification: Partial<BusinessVerification> | null = useMemo(() => {
    if (isSyntheticPreview) {
      return (
        props.fixtureVerification ?? {
          id: 'QF-2026-0147',
          request_type: 'initial',
          status: 'submitted',
          submitted_at: '2026-11-02T10:00:00Z',
          decided_at: '2026-11-03T14:30:00Z',
          created_at: '2026-11-02T10:00:00Z',
          merchant_feedback: null,
        }
      );
    }
    return serverVerifications.length > 0 ? serverVerifications[0] : null;
  }, [isSyntheticPreview, props.fixtureVerification, serverVerifications]);

  const branches: Branch[] = useMemo(() => {
    if (isSyntheticPreview) {
      return (
        props.fixtureBranches ?? [
          {
            id: 'b1',
            business_id: activeBusinessId || 'dev',
            name: 'الفرع الرئيسي',
            city: 'صنعاء',
            address_line: 'شارع حدة',
            is_primary: true,
            status: 'pending_review',
            is_paused: false,
            created_at: '',
            updated_at: '',
          },
          {
            id: 'b2',
            business_id: activeBusinessId || 'dev',
            name: 'فرع الستين',
            city: 'صنعاء',
            address_line: 'شارع الستين',
            is_primary: false,
            status: 'draft',
            is_paused: false,
            created_at: '',
            updated_at: '',
          },
        ]
      );
    }
    return serverBranches;
  }, [isSyntheticPreview, props.fixtureBranches, activeBusinessId, serverBranches]);

  // Request ID
  const displayRequestId = useMemo(() => {
    if (latestVerification?.id) {
      if (latestVerification.id.startsWith('QF-')) {
        return latestVerification.id;
      }
      return `QF-2026-${latestVerification.id.slice(0, 4).toUpperCase()}`;
    }
    return 'QF-2026-0147';
  }, [latestVerification]);

  // Distinguish verification request status from business entity status
  const verificationStatus: string | null = latestVerification?.status ?? null;
  const businessStatus: string | null = business?.status ?? null;

  // Primary qualification status for display
  const status =
    verificationStatus ||
    (businessStatus === 'pending_review' ? 'submitted' : businessStatus) ||
    'submitted';

  // Verification request status label in Arabic
  const verificationStatusLabel = useMemo(() => {
    switch (verificationStatus) {
      case 'submitted':
        return 'قيد المراجعة';
      case 'needs_info':
        return 'مطلوب معلومات إضافية';
      case 'approved':
        return 'تم الاعتماد';
      case 'rejected':
        return 'مرفوض';
      case 'draft':
        return 'مسودة';
      default:
        return businessStatus === 'pending_review' ? 'قيد المراجعة' : 'لم يُرسل بعد';
    }
  }, [verificationStatus, businessStatus]);

  // Business entity status label in Arabic
  const businessStatusLabel = useMemo(() => {
    switch (businessStatus) {
      case 'pending_review':
        return 'بانتظار الاعتماد';
      case 'approved':
        return 'معتمد';
      case 'rejected':
        return 'مرفوض';
      case 'draft':
        return 'مسودة';
      case 'suspended':
        return 'معلق';
      default:
        return 'قيد المعالجة';
    }
  }, [businessStatus]);

  // Branch count text
  const branchCountText = useMemo(() => {
    const count = branches.length;
    if (count === 1) return 'فرع واحد';
    if (count === 2) return 'فرعان';
    if (count >= 3 && count <= 10) return `${count} فروع`;
    return `${count} فرع`;
  }, [branches.length]);

  const isVerificationSubmitted = verificationStatus === 'submitted';
  const isBusinessPendingReview = businessStatus === 'pending_review';
  const canContinueToDashboard =
    (verificationStatus === 'approved' || businessStatus === 'approved') &&
    !isVerificationSubmitted &&
    !isBusinessPendingReview;

  return {
    activeBusinessId,
    business,
    latestVerification,
    displayRequestId,
    status,
    verificationStatus,
    businessStatus,
    verificationStatusLabel,
    businessStatusLabel,
    isVerificationSubmitted,
    isBusinessPendingReview,
    canContinueToDashboard,
    branchCountText,
    submittedAtText: formatArabicDate(latestVerification?.submitted_at || latestVerification?.created_at),
    updatedAtText: formatArabicDate(
      latestVerification?.decided_at ||
      latestVerification?.created_at ||
      (isSyntheticPreview ? '2026-11-03T14:30:00Z' : null)
    ),
    merchantFeedback: latestVerification?.merchant_feedback ?? null,
    isLoading: !isSyntheticPreview && (isBusinessLoading || isVerifLoading || isBranchesLoading),
    hasLoadError: Boolean(!isSyntheticPreview && (businessError || verifError)),
    isSyntheticPreview,
    refetch: () => {
      refetchBusiness();
      refetchVerifications();
      refetchBranches();
    },
  };
}
