import { useState, useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@wow/auth';
import {
  useBusinessDraftDetails,
  useCreateBusinessWithCategory,
  useUpdateBusinessDraft,
  usePublicCategories,
  type PublicCategory,
} from '@wow/api';

export interface UseBusinessOnboardingStep1Props {
  businessId?: string | null;
  onBusinessIdCaptured?: (id: string) => void;
  fixtureAuth?: { isLoaded: boolean; isSignedIn: boolean; userId: string | null };
  onNavigateToStep2?: (businessId: string) => void;
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
    Boolean(
      anyErr.message &&
        /could not find the function|function .* does not exist|column .* does not exist/i.test(
          anyErr.message
        )
    )
  );
}

export function useBusinessOnboardingStep1({
  businessId: propBusinessId,
  onBusinessIdCaptured,
  fixtureAuth,
  onNavigateToStep2,
}: UseBusinessOnboardingStep1Props = {}) {
  const auth = useAuth();
  const isAuthLoaded = fixtureAuth ? fixtureAuth.isLoaded : auth.isLoaded;
  const isSignedIn = fixtureAuth ? fixtureAuth.isSignedIn : auth.isSignedIn;
  const userId = fixtureAuth ? fixtureAuth.userId : auth.userId;
  const isSyntheticPreview = Boolean(fixtureAuth);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(propBusinessId ?? null);

  // Scope tracking for strict account and business isolation
  const currentScope = `${userId ?? 'anon'}:${propBusinessId ?? ''}`;
  const [prevScope, setPrevScope] = useState(currentScope);

  // Form field state (with fallback to existing loaded business)
  const [userName, setUserName] = useState<string | null>(null);
  const [userCategoryId, setUserCategoryId] = useState<string | null | undefined>(undefined);
  const [userDescription, setUserDescription] = useState<string | null>(null);

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Dirty tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Status and feedback
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);
  const [isUncertain, setIsUncertain] = useState(false);

  // If owner user or target businessId changes, immediately reset state before rendering
  if (currentScope !== prevScope) {
    setPrevScope(currentScope);
    setActiveBusinessId(propBusinessId ?? null);
    setUserName(null);
    setUserCategoryId(undefined);
    setUserDescription(null);
    setNameError(null);
    setCategoryError(null);
    setDescriptionError(null);
    setHasUnsavedChanges(false);
    setFeedback(null);
    setIsUncertain(false);
  }

  // Categories list for rehydrating selected category name
  const { data: publicCategories = [] } = usePublicCategories();

  // Load existing draft business if businessId is present (using scoped pre-migration-safe hook)
  const {
    data: existingBusiness,
    isLoading: isBusinessLoading,
    error: businessLoadError,
    refetch: refetchBusiness,
  } = useBusinessDraftDetails(activeBusinessId);

  const name = userName !== null ? userName : (existingBusiness?.name ?? '');
  const categoryId = userCategoryId !== undefined ? userCategoryId : (existingBusiness?.requested_category_id ?? null);
  const description = userDescription !== null ? userDescription : (existingBusiness?.description ?? '');

  // Derived category name
  const categoryName = useMemo(() => {
    if (!categoryId) return null;
    return publicCategories.find(c => c.id === categoryId)?.name_ar ?? null;
  }, [categoryId, publicCategories]);

  // Mutation hooks
  const createMutation = useCreateBusinessWithCategory();
  const updateMutation = useUpdateBusinessDraft();

  const isSavingDraft =
    (createMutation.isPending && !createMutation.variables?.requestedCategoryId) ||
    (updateMutation.isPending && updateMutation.variables?.name === name);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Determine read-only draft status
  const isReadOnly = Boolean(
    existingBusiness &&
    existingBusiness.status !== 'draft' &&
    existingBusiness.status !== 'rejected'
  );

  const readOnlyMessage = isReadOnly
    ? `حالة النشاط الحالية: ${existingBusiness?.status}. لا يمكن تعديل هذا النشاط كمسودة أولية.`
    : null;

  // Input change handlers
  const handleNameChange = useCallback((text: string) => {
    setUserName(text);
    setHasUnsavedChanges(true);
    if (nameError) setNameError(null);
    if (feedback) setFeedback(null);
  }, [nameError, feedback]);

  const handleCategorySelect = useCallback((category: PublicCategory) => {
    setUserCategoryId(category.id);
    setHasUnsavedChanges(true);
    if (categoryError) setCategoryError(null);
    if (feedback) setFeedback(null);
  }, [categoryError, feedback]);

  const handleDescriptionChange = useCallback((text: string) => {
    setUserDescription(text);
    setHasUnsavedChanges(true);
    if (text.length > 1200) {
      setDescriptionError('يجب ألا يتجاوز وصف النشاط 1200 حرف.');
    } else {
      if (descriptionError) setDescriptionError(null);
    }
    if (feedback) setFeedback(null);
  }, [descriptionError, feedback]);

  // Client validation
  const validateForDraft = useCallback((): boolean => {
    let isValid = true;
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('أدخل اسم النشاط التجاري للمتابعة.');
      isValid = false;
    } else if (trimmedName.length < 2 || trimmedName.length > 120) {
      setNameError('يجب أن يتراوح اسم النشاط بين 2 و 120 حرفًا.');
      isValid = false;
    } else {
      setNameError(null);
    }

    if (description.length > 1200) {
      setDescriptionError('يجب ألا يتجاوز وصف النشاط 1200 حرف.');
      isValid = false;
    } else {
      setDescriptionError(null);
    }

    return isValid;
  }, [name, description]);

  const validateForContinue = useCallback((): boolean => {
    let isValid = validateForDraft();

    if (!categoryId) {
      setCategoryError('اختر فئة النشاط للمتابعة.');
      isValid = false;
    } else {
      setCategoryError(null);
    }

    return isValid;
  }, [validateForDraft, categoryId]);

  // Save as draft
  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (isReadOnly || isSaving) return false;
    if (!validateForDraft()) return false;

    setFeedback(null);
    setIsUncertain(false);

    if (isSyntheticPreview) {
      setHasUnsavedChanges(false);
      setFeedback({
        tone: 'success',
        text: 'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
      });
      return true;
    }

    try {
      if (activeBusinessId) {
        // Update existing draft
        await updateMutation.mutateAsync({
          businessId: activeBusinessId,
          name: name.trim(),
          requestedCategoryId: categoryId,
          description: description.trim() || null,
        });

        setHasUnsavedChanges(false);
        setFeedback({
          tone: 'success',
          text: 'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
        });
        return true;
      } else {
        // Create new draft business
        const newBusinessId = await createMutation.mutateAsync({
          name: name.trim(),
          requestedCategoryId: categoryId,
          description: description.trim() || null,
        });

        setActiveBusinessId(newBusinessId);
        onBusinessIdCaptured?.(newBusinessId);
        setHasUnsavedChanges(false);
        setFeedback({
          tone: 'success',
          text: 'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
        });
        return true;
      }
    } catch (err: unknown) {
      if (isDeploymentPendingError(err)) {
        setFeedback({
          tone: 'warning',
          text: 'خدمة حفظ النشاط قيد التحديث في النظام حاليًا. يرجى المحاولة لاحقًا.',
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
    validateForDraft,
    isSyntheticPreview,
    activeBusinessId,
    name,
    categoryId,
    description,
    updateMutation,
    createMutation,
    onBusinessIdCaptured,
  ]);

  // Save and continue (truthful step progression)
  const saveAndContinue = useCallback(async (): Promise<boolean> => {
    if (isReadOnly || isSaving) return false;
    if (!validateForContinue()) return false;

    setFeedback(null);
    setIsUncertain(false);

    if (isSyntheticPreview) {
      const syntheticId = activeBusinessId || 'dev-synthetic-business-uuid';
      setActiveBusinessId(syntheticId);
      onBusinessIdCaptured?.(syntheticId);
      setHasUnsavedChanges(false);
      setFeedback({
        tone: 'success',
        text: 'تم حفظ بيانات النشاط. يمكنك استكمال الخطوات التالية عند توفرها.',
      });
      if (onNavigateToStep2) {
        onNavigateToStep2(syntheticId);
      } else {
        router.push({
          pathname: '/business/onboarding/representative',
          params: { businessId: syntheticId, preview: '1' },
        });
      }
      return true;
    }

    try {
      let currentId = activeBusinessId;
      if (currentId) {
        // Update existing draft
        await updateMutation.mutateAsync({
          businessId: currentId,
          name: name.trim(),
          requestedCategoryId: categoryId,
          description: description.trim() || null,
        });
      } else {
        // Create new business with category
        currentId = await createMutation.mutateAsync({
          name: name.trim(),
          requestedCategoryId: categoryId,
          description: description.trim() || null,
        });
        setActiveBusinessId(currentId);
        onBusinessIdCaptured?.(currentId);
      }

      setHasUnsavedChanges(false);
      // Retain approved feedback string for backwards compatibility and screen state
      setFeedback({
        tone: 'success',
        text: 'تم حفظ بيانات النشاط. يمكنك استكمال الخطوات التالية عند توفرها.',
      });

      if (onNavigateToStep2) {
        onNavigateToStep2(currentId);
      } else {
        router.push({
          pathname: '/business/onboarding/representative',
          params: { businessId: currentId },
        });
      }
      return true;
    } catch (err: unknown) {
      if (isDeploymentPendingError(err)) {
        setFeedback({
          tone: 'warning',
          text: 'خدمة حفظ النشاط قيد التحديث في النظام حاليًا. يرجى المحاولة لاحقًا.',
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
    isSyntheticPreview,
    activeBusinessId,
    name,
    categoryId,
    description,
    updateMutation,
    createMutation,
    onBusinessIdCaptured,
    onNavigateToStep2,
  ]);

  // Reconcile uncertain state
  const reconcileState = useCallback(async () => {
    if (activeBusinessId) {
      await refetchBusiness();
      setIsUncertain(false);
      setFeedback({
        tone: 'info',
        text: 'تم تحديث حالة النشاط بنجاح.',
      });
    }
  }, [activeBusinessId, refetchBusiness]);

  return {
    // Auth state
    isAuthLoaded,
    isSignedIn,
    userId,

    // Form values
    name,
    categoryId,
    categoryName,
    description,
    activeBusinessId,

    // Form errors
    nameError,
    categoryError,
    descriptionError,

    // Mutation states
    isSaving,
    isSavingDraft,
    feedback,
    isUncertain,
    hasUnsavedChanges,
    setHasUnsavedChanges,

    // Read only guard
    isReadOnly,
    readOnlyMessage,
    isBusinessLoading,
    businessLoadError,

    // Actions
    handleNameChange,
    handleCategorySelect,
    handleDescriptionChange,
    saveDraft,
    saveAndContinue,
    reconcileState,
  };
}
