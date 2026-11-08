import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@wow/auth';
import {
  useBusinessDraftDetails,
  useBusinessRepresentativeDraft,
  useSaveBusinessRepresentativeDraft,
  useUploadWowMedia,
  type BusinessRepresentativeDraft,
  type RepresentativeRole,
} from '@wow/api';
import type { SelectedEvidenceFile } from '../components/EvidencePicker';

export interface UseBusinessOnboardingStep2Props {
  businessId?: string | null;
  fixtureAuth?: { isLoaded: boolean; isSignedIn: boolean; userId: string | null };
  fixtureBusiness?: { id: string; name: string; status: string };
  fixtureRepresentative?: Partial<BusinessRepresentativeDraft> & { name: string; role: RepresentativeRole };
  onNavigateToStep3?: (businessId: string) => void;
}

export type FeedbackTone = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackNotice {
  tone: FeedbackTone;
  text: string;
}

function isDeploymentPendingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { code?: string; message?: string };
  return (
    anyErr.code === '42883' ||
    anyErr.code === 'PGRST202' ||
    anyErr.code === '42703' ||
    anyErr.code === '42P01' ||
    Boolean(
      anyErr.message &&
        /could not find the function|function .* does not exist|column .* does not exist|relation .* does not exist/i.test(
          anyErr.message
        )
    )
  );
}

export function useBusinessOnboardingStep2({
  businessId: propBusinessId,
  fixtureAuth,
  fixtureBusiness,
  fixtureRepresentative,
  onNavigateToStep3,
}: UseBusinessOnboardingStep2Props = {}) {
  const auth = useAuth();
  const isAuthLoaded = fixtureAuth ? fixtureAuth.isLoaded : auth.isLoaded;
  const isSignedIn = fixtureAuth ? fixtureAuth.isSignedIn : auth.isSignedIn;
  const userId = fixtureAuth ? fixtureAuth.userId : auth.userId;
  const isSyntheticPreview = Boolean(fixtureAuth || fixtureBusiness || fixtureRepresentative);

  const activeBusinessId = propBusinessId ?? (fixtureBusiness ? fixtureBusiness.id : null);

  // Scope tracking for strict account and business isolation
  const currentScope = `${userId ?? 'anon'}:${activeBusinessId ?? ''}`;
  const [prevScope, setPrevScope] = useState(currentScope);

  // Form field state
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<RepresentativeRole | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedEvidenceFile | null>(null);

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Dirty tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Status and feedback
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);
  const [isUncertain, setIsUncertain] = useState(false);

  // If owner user or target businessId changes, immediately reset state before rendering
  if (currentScope !== prevScope) {
    setPrevScope(currentScope);
    setUserName(null);
    setUserRole(null);
    setSelectedFile(null);
    setNameError(null);
    setRoleError(null);
    setFileError(null);
    setHasUnsavedChanges(false);
    setFeedback(null);
    setIsUncertain(false);
  }

  // Load existing business details (disabled in synthetic preview)
  const {
    data: remoteBusiness,
    isLoading: isBusinessLoadingRemote,
    error: businessLoadError,
    refetch: refetchBusiness,
  } = useBusinessDraftDetails(isSyntheticPreview ? null : activeBusinessId);

  // Load existing representative draft (disabled in synthetic preview)
  const {
    data: remoteRepresentative,
    isLoading: isRepresentativeLoadingRemote,
    refetch: refetchRepresentative,
  } = useBusinessRepresentativeDraft(isSyntheticPreview ? null : activeBusinessId);

  const existingBusiness = fixtureBusiness ?? remoteBusiness;
  const existingRepresentative = fixtureRepresentative ?? remoteRepresentative;

  const isBusinessLoading = isSyntheticPreview ? false : (isBusinessLoadingRemote || isRepresentativeLoadingRemote);

  // Effective form field values
  const name = userName !== null ? userName : (existingRepresentative?.name ?? '');
  const role: RepresentativeRole = userRole !== null ? userRole : (existingRepresentative?.role ?? 'owner');

  const saveMutation = useSaveBusinessRepresentativeDraft();
  const uploadMutation = useUploadWowMedia();

  const isSaving = saveMutation.isPending || uploadMutation.isPending;

  // Determine read-only draft status
  const isReadOnly = Boolean(
    existingBusiness &&
    existingBusiness.status !== 'draft' &&
    existingBusiness.status !== 'rejected'
  );

  const readOnlyMessage = isReadOnly
    ? `حالة النشاط الحالية: ${existingBusiness?.status}. لا يمكن تعديل بيانات المفوض كمسودة أولية.`
    : null;

  // Handlers
  const handleNameChange = useCallback((text: string) => {
    setUserName(text);
    setHasUnsavedChanges(true);
    if (nameError) setNameError(null);
    if (feedback) setFeedback(null);
  }, [nameError, feedback]);

  const handleRoleSelect = useCallback((newRole: RepresentativeRole) => {
    setUserRole(newRole);
    setHasUnsavedChanges(true);
    if (roleError) setRoleError(null);
    if (feedback) setFeedback(null);
  }, [roleError, feedback]);

  const handleFileChange = useCallback((file: SelectedEvidenceFile | null) => {
    setSelectedFile(file);
    setHasUnsavedChanges(true);
    if (fileError) setFileError(null);
    if (feedback) setFeedback(null);
  }, [fileError, feedback]);

  // Validations
  const validateForDraft = useCallback((): boolean => {
    let isValid = true;
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('أدخل اسم الممثل المفوض للمتابعة.');
      isValid = false;
    } else if (trimmedName.length < 2 || trimmedName.length > 120) {
      setNameError('يجب أن يتراوح اسم المفوض بين 2 و 120 حرفًا.');
      isValid = false;
    } else {
      setNameError(null);
    }

    if (!role) {
      setRoleError('اختر صفة التمثيل للمتابعة.');
      isValid = false;
    } else {
      setRoleError(null);
    }

    return isValid;
  }, [name, role]);

  const validateForContinue = useCallback((): boolean => {
    return validateForDraft();
  }, [validateForDraft]);

  // Execute save (shared between draft and continue)
  const executeSave = useCallback(async (isContinue: boolean): Promise<boolean> => {
    if (isReadOnly || isSaving) return false;
    if (isContinue ? !validateForContinue() : !validateForDraft()) return false;

    setFeedback(null);
    setIsUncertain(false);

    // DEV-only synthetic preview mode intercepts ALL remote operations
    if (isSyntheticPreview) {
      setHasUnsavedChanges(false);
      setFeedback({
        tone: 'success',
        text: isContinue
          ? 'تم حفظ بيانات المفوض بنجاح. جارٍ الانتقال إلى الفروع...'
          : 'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
      });
      if (isContinue) {
        const syntheticId = activeBusinessId || 'dev-synthetic-business-uuid';
        if (onNavigateToStep3) {
          onNavigateToStep3(syntheticId);
        } else {
          router.push({
            pathname: '/business/onboarding/branches',
            params: { businessId: syntheticId, preview: '1' },
          });
        }
      }
      return true;
    }

    if (!activeBusinessId || !userId) {
      setFeedback({
        tone: 'error',
        text: 'لم يتم العثور على سياق النشاط التجاري المطلوب.',
      });
      return false;
    }

    try {
      let evidenceStorageKey: string | null = selectedFile?.storageKey ?? existingRepresentative?.evidence_storage_key ?? null;
      let evidenceFileName: string | null = selectedFile?.name ?? existingRepresentative?.evidence_file_name ?? null;
      let evidenceFileSize: number | null = selectedFile?.size ?? existingRepresentative?.evidence_file_size ?? null;
      let evidenceContentType: string | null = selectedFile?.mimeType ?? existingRepresentative?.evidence_content_type ?? null;

      // If user selected a new local file with bytes, upload it securely to private wow-verification-evidence
      if (selectedFile?.bytes && !selectedFile.isUploaded) {
        const uploaded = await uploadMutation.mutateAsync({
          scope: { kind: 'verification', businessId: activeBusinessId },
          bytes: selectedFile.bytes,
          contentType: selectedFile.mimeType,
        });
        evidenceStorageKey = uploaded.key;
        setSelectedFile(prev => prev ? { ...prev, isUploaded: true, storageKey: uploaded.key } : null);
      }

      await saveMutation.mutateAsync({
        businessId: activeBusinessId,
        name: name.trim(),
        role,
        evidenceStorageKey,
        evidenceFileName,
        evidenceFileSize,
        evidenceContentType,
      });

      setHasUnsavedChanges(false);
      setFeedback({
        tone: 'success',
        text: isContinue
          ? 'تم حفظ بيانات المفوض بنجاح. جارٍ الانتقال إلى الفروع...'
          : 'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
      });
      if (isContinue) {
        if (onNavigateToStep3) {
          onNavigateToStep3(activeBusinessId);
        } else {
          router.push({
            pathname: '/business/onboarding/branches',
            params: { businessId: activeBusinessId },
          });
        }
      }
      return true;
    } catch (err: unknown) {
      if (isDeploymentPendingError(err)) {
        setFeedback({
          tone: 'warning',
          text: 'خدمة حفظ المفوض قيد التحديث في النظام حاليًا. يرجى المحاولة لاحقًا.',
        });
        return false;
      }

      const isNetworkOrTimeout =
        err instanceof TypeError ||
        (err instanceof Error && /network|timeout|abort/i.test(err.message));

      if (isNetworkOrTimeout) {
        setIsUncertain(true);
        setFeedback({
          tone: 'warning',
          text: 'تعذر تأكيد الحفظ. تحقق من حالة الطلب قبل إعادة المحاولة.',
        });
      } else {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'تعذر إتمام عملية الحفظ. يرجى المحاولة مرة أخرى.';
        setFeedback({
          tone: 'error',
          text: errorMsg,
        });
      }
      return false;
    }
  }, [
    isReadOnly,
    isSaving,
    validateForContinue,
    validateForDraft,
    isSyntheticPreview,
    activeBusinessId,
    userId,
    selectedFile,
    existingRepresentative,
    uploadMutation,
    saveMutation,
    name,
    role,
    onNavigateToStep3,
  ]);

  const saveDraft = useCallback(() => executeSave(false), [executeSave]);
  const saveAndContinue = useCallback(() => executeSave(true), [executeSave]);

  const reconcileState = useCallback(async () => {
    if (activeBusinessId && !isSyntheticPreview) {
      await Promise.all([refetchBusiness(), refetchRepresentative()]);
      setIsUncertain(false);
    }
  }, [activeBusinessId, isSyntheticPreview, refetchBusiness, refetchRepresentative]);

  return {
    isAuthLoaded,
    isSignedIn,
    activeBusinessId,
    existingBusiness,
    isSyntheticPreview,
    businessLoadError,
    name,
    role,
    selectedFile,
    nameError,
    roleError,
    fileError,
    isSaving,
    isReadOnly,
    readOnlyMessage,
    isBusinessLoading,
    hasUnsavedChanges,
    feedback,
    isUncertain,
    handleNameChange,
    handleRoleSelect,
    handleFileChange,
    saveDraft,
    saveAndContinue,
    reconcileState,
  };
}
