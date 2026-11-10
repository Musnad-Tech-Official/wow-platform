import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@wow/auth';
import {
  useBusinessDraftDetails,
  useBusinessRepresentativeDraft,
  useSaveBusinessRepresentativeDraft,
  useUploadWowMedia,
  useBusinessBranches,
  useSubmitBusinessVerification,
  type Branch,
  type BusinessDraftDetails,
  type BusinessRepresentativeDraft,
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
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
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

  const submitMutation = useSubmitBusinessVerification();
  const saveRepresentativeMutation = useSaveBusinessRepresentativeDraft();
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

  // Restore from serverRepresentative if not manually modified
  const documents = useMemo<EvidenceDocument[]>(() => {
    if (userModifiedDocs !== null) {
      return userModifiedDocs;
    }
    if (serverRepresentative?.evidence_storage_key) {
      return [
        {
          id: `rep-doc-${serverRepresentative.business_id}`,
          name: serverRepresentative.evidence_file_name || 'مستند_إثبات_النشاط.pdf',
          size: serverRepresentative.evidence_file_size || 1.2 * 1024 * 1024,
          mimeType: (serverRepresentative.evidence_content_type as any) || 'application/pdf',
          storageKey: serverRepresentative.evidence_storage_key,
          isUploaded: true,
          uploadedAt: serverRepresentative.updated_at || new Date().toISOString(),
          title: 'مستند إثبات النشاط والصلاحية',
          isPrimaryRequirement: true,
        },
      ];
    }
    return isSyntheticPreview ? [defaultInitialDoc] : [];
  }, [userModifiedDocs, serverRepresentative, isSyntheticPreview, defaultInitialDoc]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'danger' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Status checks
  const isStep1Complete = Boolean(business?.name?.trim() && business.requested_category_id);
  const isStep2Complete = Boolean(representative?.name?.trim() && representative?.role);
  const isStep3Complete = Boolean(primaryBranch && primaryBranch.name && primaryBranch.city);
  const hasUploadedDocuments = documents.some((d) => d.isUploaded && Boolean(d.storageKey));

  const isReadyToSubmit = isStep1Complete && isStep2Complete && isStep3Complete && hasUploadedDocuments &&
    (business?.status === 'draft' || business?.status === 'rejected') &&
    !isBusinessLoading && !isRepLoading && !isBranchesLoading &&
    !businessError && !repError && !branchesError && !uploadMutation.isPending;

  // Upload bytes to the private verification bucket BEFORE marking a document as attached.
  // The representative draft RPC only stores ONE evidence reference. Extra uploaded files
  // are kept for the current submission and cannot be advertised as persisted draft files.
  const uploadDocument = useCallback(async (
    file: { name: string; size: number; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'; bytes?: ArrayBuffer },
    replaceId?: string,
  ): Promise<boolean> => {
    if (!activeBusinessId || !userId || !file.name || file.size < 1 || file.size > 10 * 1024 * 1024) {
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
  }, [activeBusinessId, userId, isSyntheticPreview, uploadMutation, documents]);

  const handleAddDocument = useCallback(
    (file: { name: string; size: number; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'; bytes?: ArrayBuffer }) =>
      uploadDocument(file),
    [uploadDocument]
  );

  const handleReplaceDocument = useCallback(
    (id: string, file: { name: string; size: number; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'; bytes?: ArrayBuffer }) =>
      uploadDocument(file, id),
    [uploadDocument]
  );

  // Remove document
  const handleRemoveDocument = useCallback((id: string) => {
    setUserModifiedDocs(documents.filter((doc) => doc.id !== id));
    setFeedback({ tone: 'info', text: 'تم حذف المستند.' });
  }, [documents]);

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
      await submitMutation.mutateAsync({
        businessId: activeBusinessId,
        branchId: primaryBranch.id,
        requestType: 'initial',
        evidenceRefs,
      });

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
    onNavigateToStatus,
  ]);

  // Save Draft (Persists document references into existing business_representative_drafts table)
  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (isSyntheticPreview) {
      setFeedback({
        tone: 'success',
        text: 'تم حفظ مسودة الطلب والمستندات بنجاح.',
      });
      return true;
    }

    if (!activeBusinessId) {
      setFeedback({
        tone: 'danger',
        text: 'لم يتم العثور على سياق النشاط التجاري.',
      });
      return false;
    }

    try {
      const primaryDoc = documents.find((d) => d.isPrimaryRequirement) || documents[0] || null;
      if (!representative?.name?.trim() || !representative?.role) {
        setFeedback({ tone: 'danger', text: 'أكمل بيانات المفوض قبل حفظ المستند.' });
        return false;
      }
      if (primaryDoc && !primaryDoc.isUploaded) {
        setFeedback({ tone: 'danger', text: 'لم يكتمل رفع المستند.' });
        return false;
      }
      await saveRepresentativeMutation.mutateAsync({
        businessId: activeBusinessId,
        name: representative.name.trim(),
        role: representative.role,
        evidenceStorageKey: primaryDoc?.storageKey ?? null,
        evidenceFileName: primaryDoc?.name ?? null,
        evidenceFileSize: primaryDoc?.size ?? null,
        evidenceContentType: primaryDoc?.mimeType ?? null,
      });

      setFeedback({
        tone: documents.length > 1 ? 'warning' : 'success',
        text: documents.length > 1
          ? 'حُفظ مستند المفوض فقط. المرفقات الإضافية متاحة للإرسال الحالي ولا تُستعاد عند فتح المسودة مجددًا.'
          : 'تم حفظ مستند المفوض في المسودة بنجاح.',
      });
      return true;
    } catch (err: any) {
      setFeedback({
        tone: 'danger',
        text: err?.message || 'تعذر حفظ مسودة المستندات.',
      });
      return false;
    }
  }, [isSyntheticPreview, activeBusinessId, documents, representative, saveRepresentativeMutation]);

  return {
    activeBusinessId,
    business,
    representative,
    branches,
    primaryBranch,
    documents,
    isSubmitting: isSubmitting || uploadMutation.isPending || saveRepresentativeMutation.isPending,
    feedback,
    isReadyToSubmit,
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    hasUploadedDocuments,
    isLoading: !isSyntheticPreview && (isBusinessLoading || isRepLoading || isBranchesLoading),
    hasLoadError: Boolean(!isSyntheticPreview && (businessError || repError || branchesError)),
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
    },
  };
}
