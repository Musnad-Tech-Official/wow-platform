import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@wow/auth';
import {
  useBusinessDraftDetails,
  useBusinessRepresentativeDraft,
  useBusinessVerificationEvidenceDraft,
  useSaveBusinessVerificationEvidenceDraft,
  useUploadWowMedia,
  useBusinessBranches,
  useSubmitBusinessVerification,
  useResubmitBusinessVerification,
  useBusinessVerifications,
  type Branch,
  type BusinessDraftDetails,
  type BusinessRepresentativeDraft,
  type VerificationDraftDocument,
  type RepresentativeRole,
} from '@wow/api';

export const REPRESENTATIVE_ROLE_LABELS: Record<RepresentativeRole, string> = {
  owner: 'مالك النشاط',
  authorized_representative: 'مفوض رسمي',
  legal_agent: 'وكيل شرعي',
  manager: 'مدير مفوض',
};

export interface EvidenceDocument {
  id: string;
  name: string;
  size: number;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  storageKey: string;
  isUploaded: boolean;
  uploadedAt: string;
  title: string;
  isPrimaryRequirement?: boolean;
}

export interface UseBusinessOnboardingStep4Props {
  businessId?: string | null;
  readOnly?: boolean;
  fixtureAuth?: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId: string | null;
  };
  fixtureBusiness?: Partial<BusinessDraftDetails>;
  fixtureRepresentative?: Partial<BusinessRepresentativeDraft>;
  fixtureBranches?: Branch[];
  fixtureEvidenceFiles?: EvidenceDocument[];
  onNavigateToStatus?: (businessId: string) => void;
  onNavigateToStep?: (step: 1 | 2 | 3, businessId: string) => void;
}

export function useBusinessOnboardingStep4(props: UseBusinessOnboardingStep4Props) {
  const auth = useAuth();
  const effectiveAuth = props.fixtureAuth ?? auth;
  const userId = effectiveAuth.userId;

  const isSyntheticPreview =
    (__DEV__ || process.env.NODE_ENV !== 'production') &&
    (Boolean(props.fixtureAuth) ||
      (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const activeBusinessId = props.businessId ?? (props.fixtureBusiness ? props.fixtureBusiness.id ?? null : null);

  // Queries
  const {
    data: serverBusiness,
    isLoading: isBusinessLoading,
    error: businessError,
    refetch: refetchBusiness,
  } = useBusinessDraftDetails(isSyntheticPreview ? null : activeBusinessId);

  const {
    data: serverRepresentative,
    isLoading: isRepLoading,
    error: repError,
    refetch: refetchRepresentative,
  } = useBusinessRepresentativeDraft(isSyntheticPreview ? null : activeBusinessId);

  const {
    data: serverBranches = [],
    isLoading: isBranchesLoading,
    error: branchesError,
    refetch: refetchBranches,
  } = useBusinessBranches(isSyntheticPreview ? null : activeBusinessId);

  const {
    data: savedEvidenceDraft,
    isLoading: isEvidenceDraftLoading,
    error: evidenceDraftError,
    refetch: refetchEvidenceDraft,
  } = useBusinessVerificationEvidenceDraft(isSyntheticPreview ? null : activeBusinessId);
  const submitMutation = useSubmitBusinessVerification();
  const resubmitMutation = useResubmitBusinessVerification();
  const { data: businessVerifications = [], isLoading: isVerificationsLoading, error: verificationsError, refetch: refetchVerifications } =
    useBusinessVerifications(isSyntheticPreview ? null : activeBusinessId);
  const saveEvidenceDraftMutation = useSaveBusinessVerificationEvidenceDraft();
  const uploadMutation = useUploadWowMedia();

  // Synthetic or Server Data
  const business: Partial<BusinessDraftDetails> | null = useMemo(() => {
    if (isSyntheticPreview) {
      return (
        props.fixtureBusiness ?? {
          id: activeBusinessId || 'dev-synthetic-business-uuid',
          name: 'دار الألوان',
          status: 'draft',
          requested_category_name: 'أدوات منزلية (بيانات تجريبية)',
          description: 'مؤسسة تجارية متخصصة في المستلزمات والأدوات المنزلية.',
        }
      );
    }
    return serverBusiness ?? null;
  }, [isSyntheticPreview, props.fixtureBusiness, activeBusinessId, serverBusiness]);

  const representative: Partial<BusinessRepresentativeDraft> | null = useMemo(() => {
    if (isSyntheticPreview) {
      return (
        props.fixtureRepresentative ?? {
          business_id: activeBusinessId || 'dev-synthetic-business-uuid',
          name: 'المالك',
          role: 'owner',
          evidence_storage_key: 'business-verifications/dev-preview/auth-rep.pdf',
          evidence_file_name: 'إثبات_النشاط.pdf',
          evidence_file_size: 1.2 * 1024 * 1024,
          evidence_content_type: 'application/pdf',
        }
      );
    }
    return serverRepresentative ?? null;
  }, [isSyntheticPreview, props.fixtureRepresentative, activeBusinessId, serverRepresentative]);

  const branches: Branch[] = useMemo(() => {
    if (isSyntheticPreview) {
      return (
        props.fixtureBranches ?? [
          {
            id: 'dev-primary-branch-id',
            business_id: activeBusinessId || 'dev-synthetic-business-uuid',
            name: 'الفرع الرئيسي',
            city: 'صنعاء',
            district: 'حدة',
            address_line: 'شارع حدة العام أمام المركز التجاري',
            is_primary: true,
            status: 'draft',
            is_paused: false,
            created_at: '2026-11-01T00:00:00Z',
            updated_at: '2026-11-01T00:00:00Z',
          },
          {
            id: 'dev-secondary-branch-id',
            business_id: activeBusinessId || 'dev-synthetic-business-uuid',
            name: 'فرع الستين',
            city: 'صنعاء',
            district: 'الستين الغربي',
            address_line: 'شارع الستين بجوار الجولة',
            is_primary: false,
            status: 'draft',
            is_paused: false,
            created_at: '2026-11-02T00:00:00Z',
            updated_at: '2026-11-02T00:00:00Z',
          },
        ]
      );
    }
    return serverBranches;
  }, [isSyntheticPreview, props.fixtureBranches, activeBusinessId, serverBranches]);

  const primaryBranch = useMemo(() => {
    return branches.find((b) => b.is_primary) ?? null;
  }, [branches]);

  // Documents state & persistence
  const defaultInitialDoc: EvidenceDocument = useMemo(() => ({
    id: 'initial-doc-1',
    name: 'إثبات_النشاط.pdf',
    size: 1.2 * 1024 * 1024,
    mimeType: 'application/pdf',
    storageKey: `business-verifications/${activeBusinessId || 'dev'}/${userId || 'user'}/proof.pdf`,
    isUploaded: true,
    uploadedAt: new Date().toISOString(),
    title: 'مستند إثبات النشاط والصلاحية',
    isPrimaryRequirement: true,
  }), [activeBusinessId, userId]);

  // Track user-modified documents list
  const [userModifiedDocs, setUserModifiedDocs] = useState<EvidenceDocument[] | null>(
    props.fixtureEvidenceFiles ?? (isSyntheticPreview ? [defaultInitialDoc] : null)
  );

  // Saved draft is authoritative (including an intentionally empty array).
  // Only fall back to legacy representative evidence when no draft row exists yet.
  const documents = useMemo<EvidenceDocument[]>(() => {
    if (userModifiedDocs !== null) return userModifiedDocs;
    if (savedEvidenceDraft !== undefined && savedEvidenceDraft !== null) {
      return savedEvidenceDraft.map((doc) => ({
        id: doc.storageKey,
        name: doc.name,
        size: doc.size,
        mimeType: doc.mimeType,
        storageKey: doc.storageKey,
        isUploaded: true,
        uploadedAt: '',
        title: doc.isPrimaryRequirement ? 'مستند إثبات النشاط والصلاحية' : 'مستند داعم إضافي',
        isPrimaryRequirement: doc.isPrimaryRequirement,
      }));
    }
    if (serverRepresentative?.evidence_storage_key) {
      return [
        {
          id: `rep-doc-${serverRepresentative.business_id}`,
          name: serverRepresentative.evidence_file_name || 'مستند_إثبات_النشاط.pdf',
          size: serverRepresentative.evidence_file_size ?? 0,
          mimeType: (serverRepresentative.evidence_content_type as EvidenceDocument['mimeType']) || 'application/pdf',
          storageKey: serverRepresentative.evidence_storage_key,
          isUploaded: Boolean(serverRepresentative.evidence_file_size && serverRepresentative.evidence_content_type),
          uploadedAt: serverRepresentative.updated_at || '',
          title: 'مستند إثبات النشاط والصلاحية',
          isPrimaryRequirement: true,
        },
      ];
    }
    return isSyntheticPreview ? [defaultInitialDoc] : [];
  }, [userModifiedDocs, savedEvidenceDraft, serverRepresentative, isSyntheticPreview, defaultInitialDoc]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'danger' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Current initial request may be returned for additional evidence (needs_info).
  const latestInitialVerification = useMemo(() => businessVerifications
    .filter(v => v.request_type === 'initial')
    .sort((a, b) => (b.submitted_at || b.created_at).localeCompare(a.submitted_at || a.created_at))[0] ?? null,
    [businessVerifications]);
  const canResubmit = !isSyntheticPreview &&
    latestInitialVerification?.status === 'needs_info' &&
    business?.status === 'pending_review' && primaryBranch?.status === 'pending_review';

  // Status checks
  const isStep1Complete = Boolean(business?.name?.trim() && business.requested_category_id);
  const isStep2Complete = Boolean(representative?.name?.trim() && representative?.role);
  const isStep3Complete = Boolean(primaryBranch && primaryBranch.name && primaryBranch.city);
  const hasUploadedDocuments = documents.length <= 12 &&
    documents.some((d) => d.isUploaded && Boolean(d.storageKey));

  const isReadyToSubmit = isStep1Complete && isStep2Complete && isStep3Complete && hasUploadedDocuments &&
    (business?.status === 'draft' || business?.status === 'rejected' || canResubmit) &&
    !isBusinessLoading && !isRepLoading && !isBranchesLoading && !isEvidenceDraftLoading && !isVerificationsLoading &&
    !businessError && !repError && !branchesError && !evidenceDraftError && !verificationsError &&
    !uploadMutation.isPending && !saveEvidenceDraftMutation.isPending;

  // Upload bytes to private Storage before adding the reference. A separate,
  // owner-scoped draft RPC persists all 0–12 documents without altering the representative.
  const uploadDocument = useCallback(async (
    file: { name: string; size: number; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'; bytes?: ArrayBuffer },
    replaceId?: string,
  ): Promise<boolean> => {
    if (props.readOnly || !activeBusinessId || !userId || !file.name ||
        file.name.length > 255 || file.size < 1 || file.size > 10 * 1024 * 1024 ||
        (!replaceId && documents.length >= 12)) {
      setFeedback({ tone: 'danger', text: 'تعذر التحقق من المستند أو سياق النشاط.' });
      return false;
    }
    if (!isSyntheticPreview && (!file.bytes || file.bytes.byteLength !== file.size)) {
      setFeedback({ tone: 'danger', text: 'تعذر قراءة محتوى الملف؛ لم يُرفع أي مستند.' });
      return false;
    }
    try {
      const key = isSyntheticPreview
        ? `business-verifications/preview/${file.name}`
        : (await uploadMutation.mutateAsync({
          scope: { kind: 'verification', businessId: activeBusinessId },
          bytes: file.bytes!,
          contentType: file.mimeType,
        })).key;
      const newDoc: EvidenceDocument = {
        id: key,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        storageKey: key,
        isUploaded: true,
        uploadedAt: new Date().toISOString(),
        title: replaceId
          ? (documents.find(d => d.id === replaceId)?.title ?? 'مستند داعم')
          : 'مستند داعم إضافي',
        isPrimaryRequirement: replaceId
          ? Boolean(documents.find(d => d.id === replaceId)?.isPrimaryRequirement)
          : documents.length === 0,
      };
      setUserModifiedDocs((previous) => {
        const existing = previous ?? documents;
        return replaceId
          ? existing.map(d => d.id === replaceId ? newDoc : d)
          : [...existing, newDoc];
      });
      setFeedback({ tone: 'success', text: 'تم رفع المستند إلى التخزين الخاص بنجاح.' });
      return true;
    } catch (error: unknown) {
      setFeedback({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'فشل رفع المستند؛ لم يُضف إلى الطلب.',
      });
      return false;
    }
  }, [activeBusinessId, userId, isSyntheticPreview, uploadMutation, documents, props.readOnly]);

  const handleAddDocument = useCallback(
    (file: { name: string; size: number; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'; bytes?: ArrayBuffer }) =>
      uploadDocument(file),
    [uploadDocument]
  );

  const handleReplaceDocument = useCallback(
    (id: string, file: { name: string; size: number; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'; bytes?: ArrayBuffer }) =>
      uploadDocument(file, id),
    [uploadDocument]
  );

  // Remove document
  const handleRemoveDocument = useCallback((id: string) => {
    if (props.readOnly) return;
    setUserModifiedDocs(documents.filter((doc) => doc.id !== id));
    setFeedback({ tone: 'info', text: 'أُزيل المستند من المسودة. اضغط حفظ لتثبيت التغييرات.' });
  }, [documents, props.readOnly]);

  // Submit Verification
  const { readOnly, onNavigateToStatus } = props;
  const submitVerificationRequest = useCallback(async (): Promise<boolean> => {
    if (readOnly) return false;
    if (!isReadyToSubmit) {
      setFeedback({
        tone: 'danger',
        text: 'يرجى استكمال جميع بيانات النشاط والفروع والمستندات قبل إرسال الطلب.',
      });
      return false;
    }

    if (!primaryBranch?.id || !activeBusinessId) {
      setFeedback({
        tone: 'danger',
        text: 'بيانات الفرع الرئيسي غير متوفرة. يرجى مراجعة بيانات الفروع.',
      });
      return false;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const evidenceRefs = documents.filter((d) => d.isUploaded).map((d) => d.storageKey);

    if (evidenceRefs.length === 0) {
      setIsSubmitting(false);
      setFeedback({
        tone: 'danger',
        text: 'يجب إرفاق مستند واحد على الأقل للمراجعة.',
      });
      return false;
    }

    if (isSyntheticPreview) {
      setTimeout(() => {
        setIsSubmitting(false);
        setFeedback({
          tone: 'success',
          text: 'تم إرسال طلب التأهيل بنجاح وهو قيد مراجعة الإدارة.',
        });
        if (onNavigateToStatus) {
          onNavigateToStatus(activeBusinessId);
        }
      }, 500);
      return true;
    }

    try {
      if (canResubmit && latestInitialVerification) {
        await resubmitMutation.mutateAsync({ verificationId: latestInitialVerification.id, evidenceRefs });
      } else {
        await submitMutation.mutateAsync({
          businessId: activeBusinessId,
          branchId: primaryBranch.id,
          requestType: 'initial',
          evidenceRefs,
        });
      }

      setIsSubmitting(false);
      setFeedback({
        tone: 'success',
        text: 'تم إرسال طلب التأهيل للمراجعة بنجاح.',
      });

      if (onNavigateToStatus) {
        onNavigateToStatus(activeBusinessId);
      }
      return true;
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = err?.message || 'تعذر إرسال الطلب للمراجعة. يرجى التحقق من الاتصال وإعادة المحاولة.';
      setFeedback({
        tone: 'danger',
        text: msg,
      });
      return false;
    }
  }, [
    readOnly,
    isReadyToSubmit,
    primaryBranch,
    activeBusinessId,
    documents,
    isSyntheticPreview,
    submitMutation,
    resubmitMutation,
    canResubmit,
    latestInitialVerification,
    onNavigateToStatus,
  ]);

  // Save every document reference without rewriting the representative's identity.
  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (props.readOnly) return false;
    if (isSyntheticPreview) {
      setFeedback({ tone: 'success', text: 'تم حفظ المسودة التجريبية.' });
      return true;
    }
    if (!activeBusinessId || !business || (!['draft', 'rejected'].includes(business.status ?? '') && !canResubmit) ||
        isEvidenceDraftLoading || evidenceDraftError || uploadMutation.isPending) {
      setFeedback({ tone: 'danger', text: 'تعذر حفظ المسودة: حالة النشاط أو البيانات غير صالحة.' });
      return false;
    }
    if (documents.length > 12 || documents.some(d => !d.isUploaded || !d.storageKey)) {
      setFeedback({ tone: 'danger', text: 'تحقق من رفع المستندات (الحد الأقصى 12).' });
      return false;
    }
    try {
      const payload: VerificationDraftDocument[] = documents.map((doc) => ({
        storageKey: doc.storageKey,
        name: doc.name,
        size: doc.size,
        mimeType: doc.mimeType,
        isPrimaryRequirement: Boolean(doc.isPrimaryRequirement),
      }));
      await saveEvidenceDraftMutation.mutateAsync({ businessId: activeBusinessId, documents: payload });
      setFeedback({ tone: 'success', text: 'تم حفظ جميع مرفقات مسودة التأهيل واستعادتها متاحة من الخادم.' });
      return true;
    } catch (err: unknown) {
      setFeedback({
        tone: 'danger',
        text: err instanceof Error ? err.message : 'تعذر حفظ المسودة على الخادم.',
      });
      return false;
    }
  }, [
    props.readOnly, isSyntheticPreview, activeBusinessId, business, documents,
    saveEvidenceDraftMutation, isEvidenceDraftLoading, evidenceDraftError, uploadMutation.isPending, canResubmit,
  ]);

  return {
    activeBusinessId,
    business,
    representative,
    branches,
    primaryBranch,
    documents,
    isSubmitting: isSubmitting || uploadMutation.isPending || saveEvidenceDraftMutation.isPending || resubmitMutation.isPending,
    feedback,
    isReadyToSubmit,
    canResubmit,
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    hasUploadedDocuments,
    isLoading: !isSyntheticPreview && (isBusinessLoading || isRepLoading || isBranchesLoading || isEvidenceDraftLoading || isVerificationsLoading),
    hasLoadError: Boolean(!isSyntheticPreview && (businessError || repError || branchesError || evidenceDraftError || verificationsError)),
    isSyntheticPreview,
    handleAddDocument,
    handleReplaceDocument,
    handleRemoveDocument,
    submitVerificationRequest,
    saveDraft,
    refetch: () => {
      void refetchBusiness();
      void refetchRepresentative();
      void refetchBranches();
      void refetchEvidenceDraft();
      void refetchVerifications();
    },
  };
}
