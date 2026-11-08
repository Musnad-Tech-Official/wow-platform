import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@wow/auth';
import {
  useBusinessDraftDetails,
  useBusinessBranches,
  useCreateBranch,
  useUpdateBranchDraft,
  useDeleteDraftBranch,
  type Branch,
} from '@wow/api';
import type { BranchEditorData } from '../components/BranchEditorModal';

export interface UseBusinessOnboardingStep3Props {
  businessId?: string | null;
  fixtureAuth?: { isLoaded: boolean; isSignedIn: boolean; userId: string | null };
  fixtureBusiness?: { id: string; name: string; status: string };
  fixtureBranches?: Branch[];
  onNavigateToStep4?: (businessId: string) => void;
}

export type FeedbackTone = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackNotice {
  tone: FeedbackTone;
  text: string;
}

export type AmbiguousOperationKind =
  | 'primary_create'
  | 'primary_update'
  | 'additional_create'
  | 'additional_update'
  | 'additional_delete';

export interface AmbiguousWriteIntent {
  kind: AmbiguousOperationKind;
  businessId: string;
  branchId?: string | null;
  existingBranchIds?: string[];
  attemptedValues?: {
    name?: string;
    city?: string;
    address_line?: string;
    district?: string | null;
  };
  previousSnapshot?: {
    name?: string;
    city?: string;
    address_line?: string;
    district?: string | null;
  };
  attemptedAt: number;
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

export function useBusinessOnboardingStep3({
  businessId: propBusinessId,
  fixtureAuth,
  fixtureBusiness,
  fixtureBranches,
  onNavigateToStep4,
}: UseBusinessOnboardingStep3Props = {}) {
  const auth = useAuth();
  const isAuthLoaded = fixtureAuth ? fixtureAuth.isLoaded : auth.isLoaded;
  const isSignedIn = fixtureAuth ? fixtureAuth.isSignedIn : auth.isSignedIn;
  const userId = fixtureAuth ? fixtureAuth.userId : auth.userId;
  const isSyntheticPreview = Boolean(fixtureAuth || fixtureBusiness || fixtureBranches);

  const activeBusinessId = propBusinessId ?? (fixtureBusiness ? fixtureBusiness.id : null);

  // Scope tracking for strict account and business isolation
  const currentScope = `${userId ?? 'anon'}:${activeBusinessId ?? ''}`;
  const [prevScope, setPrevScope] = useState(currentScope);

  // Form field state for primary branch
  const [primaryName, setPrimaryName] = useState<string | null>(null);
  const [primaryCity, setPrimaryCity] = useState<string | null>(null);
  const [primaryAddressLine, setPrimaryAddressLine] = useState<string | null>(null);
  const [primaryDistrict, setPrimaryDistrict] = useState<string | null>(null);

  // Field validation errors
  const [primaryNameError, setPrimaryNameError] = useState<string | null>(null);
  const [primaryCityError, setPrimaryCityError] = useState<string | null>(null);
  const [primaryAddressError, setPrimaryAddressError] = useState<string | null>(null);

  // Dirty tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Feedback, uncertain, and reconciliation state
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);
  const [isUncertain, setIsUncertain] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [ambiguousIntent, setAmbiguousIntent] = useState<AmbiguousWriteIntent | null>(null);

  // Synthetic local branches for preview mode
  const defaultSyntheticBranches: Branch[] = useMemo(() => [
    {
      id: 'dev-synthetic-branch-primary',
      business_id: activeBusinessId || 'dev-synthetic-business-uuid',
      name: 'الفرع الرئيسي',
      city: 'عدن',
      address_line: 'حي التقنية، شارع الملك فهد، عدن',
      district: 'التقنية',
      is_primary: true,
      status: 'draft',
    },
    {
      id: 'dev-synthetic-branch-additional-1',
      business_id: activeBusinessId || 'dev-synthetic-business-uuid',
      name: 'فرع المنصورة',
      city: 'عدن',
      address_line: 'المنصورة، عدن',
      district: 'المنصورة',
      is_primary: false,
      status: 'draft',
    },
  ], [activeBusinessId]);

  const [syntheticBranchesState, setSyntheticBranchesState] = useState<Branch[] | null>(null);

  // Reset all state on identity/business switch
  if (currentScope !== prevScope) {
    setPrevScope(currentScope);
    setPrimaryName(null);
    setPrimaryCity(null);
    setPrimaryAddressLine(null);
    setPrimaryDistrict(null);
    setPrimaryNameError(null);
    setPrimaryCityError(null);
    setPrimaryAddressError(null);
    setHasUnsavedChanges(false);
    setFeedback(null);
    setIsUncertain(false);
    setIsReconciling(false);
    setAmbiguousIntent(null);
    setSyntheticBranchesState(null);
  }

  // Load existing business details (disabled in synthetic preview)
  const {
    data: remoteBusiness,
    isLoading: isBusinessLoadingRemote,
    error: businessLoadError,
    refetch: refetchBusiness,
  } = useBusinessDraftDetails(isSyntheticPreview ? null : activeBusinessId);

  // Load existing branches (disabled in synthetic preview)
  const {
    data: remoteBranches,
    isLoading: isBranchesLoadingRemote,
    error: branchesLoadError,
    refetch: refetchBranches,
  } = useBusinessBranches(isSyntheticPreview ? null : activeBusinessId);

  const existingBusiness = fixtureBusiness ?? remoteBusiness;
  const isBusinessLoading = isSyntheticPreview ? false : isBusinessLoadingRemote;
  const isBranchesLoading = isSyntheticPreview ? false : isBranchesLoadingRemote;

  const hasLoadError = Boolean(!isSyntheticPreview && (Boolean(businessLoadError) || Boolean(branchesLoadError)));

  const effectiveBranches = useMemo(() => {
    if (isSyntheticPreview) {
      return syntheticBranchesState ?? fixtureBranches ?? defaultSyntheticBranches;
    }
    if (branchesLoadError) {
      return [];
    }
    return remoteBranches ?? [];
  }, [isSyntheticPreview, syntheticBranchesState, fixtureBranches, defaultSyntheticBranches, remoteBranches, branchesLoadError]);

  const primaryBranch = useMemo(() => {
    if (branchesLoadError) return null;
    return effectiveBranches.find(b => b.is_primary) ?? null;
  }, [effectiveBranches, branchesLoadError]);

  const additionalBranches = useMemo(() => {
    if (branchesLoadError) return [];
    return effectiveBranches.filter(b => !b.is_primary);
  }, [effectiveBranches, branchesLoadError]);

  // Form values for primary branch (falling back to saved primary branch)
  const effectivePrimaryName = primaryName !== null ? primaryName : (primaryBranch?.name ?? '');
  const effectivePrimaryCity = primaryCity !== null ? primaryCity : (primaryBranch?.city ?? '');
  const effectivePrimaryAddress = primaryAddressLine !== null ? primaryAddressLine : (primaryBranch?.address_line ?? '');
  const effectivePrimaryDistrict = primaryDistrict !== null ? primaryDistrict : (primaryBranch?.district ?? '');

  // Mutations
  const createBranchMutation = useCreateBranch();
  const updateBranchMutation = useUpdateBranchDraft();
  const deleteBranchMutation = useDeleteDraftBranch();

  const isSaving =
    createBranchMutation.isPending ||
    updateBranchMutation.isPending ||
    deleteBranchMutation.isPending ||
    isReconciling;

  // Determine read-only draft status
  const isReadOnly = Boolean(
    existingBusiness &&
    existingBusiness.status !== 'draft' &&
    existingBusiness.status !== 'rejected'
  );

  const readOnlyMessage = isReadOnly
    ? `حالة النشاط الحالية: ${existingBusiness?.status}. لا يمكن تعديل الفروع كمسودة أولية.`
    : null;

  // Handlers for primary branch inputs
  const handlePrimaryNameChange = useCallback((text: string) => {
    setPrimaryName(text);
    setHasUnsavedChanges(true);
    if (primaryNameError) setPrimaryNameError(null);
    if (feedback) setFeedback(null);
  }, [primaryNameError, feedback]);

  const handlePrimaryCityChange = useCallback((text: string) => {
    setPrimaryCity(text);
    setHasUnsavedChanges(true);
    if (primaryCityError) setPrimaryCityError(null);
    if (feedback) setFeedback(null);
  }, [primaryCityError, feedback]);

  const handlePrimaryAddressChange = useCallback((text: string) => {
    setPrimaryAddressLine(text);
    setHasUnsavedChanges(true);
    if (primaryAddressError) setPrimaryAddressError(null);
    if (feedback) setFeedback(null);
  }, [primaryAddressError, feedback]);

  const handlePrimaryDistrictChange = useCallback((text: string) => {
    setPrimaryDistrict(text);
    setHasUnsavedChanges(true);
    if (feedback) setFeedback(null);
  }, [feedback]);

  // Explicit discard of unsaved changes
  const discardUnsavedChanges = useCallback(() => {
    setPrimaryName(null);
    setPrimaryCity(null);
    setPrimaryAddressLine(null);
    setPrimaryDistrict(null);
    setPrimaryNameError(null);
    setPrimaryCityError(null);
    setPrimaryAddressError(null);
    setHasUnsavedChanges(false);
    setAmbiguousIntent(null);
    setIsUncertain(false);
  }, []);

  // Validations
  const validatePrimaryBranch = useCallback((): boolean => {
    let isValid = true;
    const trimmedName = effectivePrimaryName.trim();
    const trimmedCity = effectivePrimaryCity.trim();
    const trimmedAddress = effectivePrimaryAddress.trim();

    if (!trimmedName) {
      setPrimaryNameError('أدخل اسم الفرع الرئيسي للمتابعة.');
      isValid = false;
    } else if (trimmedName.length < 2 || trimmedName.length > 120) {
      setPrimaryNameError('يجب أن يتراوح اسم الفرع بين 2 و 120 حرفًا.');
      isValid = false;
    } else {
      setPrimaryNameError(null);
    }

    if (!trimmedCity) {
      setPrimaryCityError('أدخل اسم المدينة للفرع الرئيسي.');
      isValid = false;
    } else if (trimmedCity.length < 2 || trimmedCity.length > 120) {
      setPrimaryCityError('يجب أن تتراوح المدينة بين 2 و 120 حرفًا.');
      isValid = false;
    } else {
      setPrimaryCityError(null);
    }

    if (!trimmedAddress) {
      setPrimaryAddressError('أدخل عنوان التشغيل للفرع الرئيسي.');
      isValid = false;
    } else if (trimmedAddress.length < 5 || trimmedAddress.length > 500) {
      setPrimaryAddressError('يجب أن يتراوح عنوان التشغيل بين 5 و 500 حرف.');
      isValid = false;
    } else {
      setPrimaryAddressError(null);
    }

    return isValid;
  }, [effectivePrimaryName, effectivePrimaryCity, effectivePrimaryAddress]);

  // Save or Update Primary Branch (C1: Checked read-after-write confirmation and correlation; V4: Ambiguous write intent tracking)
  const persistPrimaryBranch = useCallback(async (): Promise<boolean> => {
    if (isUncertain) {
      setFeedback({
        tone: 'warning',
        text: 'حالة الطلب غير مؤكدة حالياً. اضغط على "التحقق من حالة الطلب" لتأكيد حالة البيانات قبل المتابعة.',
      });
      return false;
    }

    if (hasLoadError) {
      setFeedback({
        tone: 'error',
        text: 'تعذر تحميل بيانات الفروع. يرجى إعادة المحاولة قبل تعديل البيانات.',
      });
      return false;
    }

    if (!validatePrimaryBranch()) return false;
    if (isReadOnly || isSaving) return false;

    setFeedback(null);

    if (isSyntheticPreview) {
      setSyntheticBranchesState(prev => {
        const list = prev ? [...prev] : (fixtureBranches ? [...fixtureBranches] : [...defaultSyntheticBranches]);
        const primIndex = list.findIndex(b => b.is_primary);
        const updated: Branch = {
          id: primIndex >= 0 ? list[primIndex].id : 'dev-synthetic-branch-primary',
          business_id: activeBusinessId || 'dev-synthetic-business-uuid',
          name: effectivePrimaryName.trim(),
          city: effectivePrimaryCity.trim(),
          address_line: effectivePrimaryAddress.trim(),
          district: effectivePrimaryDistrict.trim() || null,
          is_primary: true,
          status: 'draft',
        };
        if (primIndex >= 0) {
          list[primIndex] = updated;
        } else {
          list.unshift(updated);
        }
        return list;
      });
      setHasUnsavedChanges(false);
      return true;
    }

    if (!activeBusinessId || !userId) {
      setFeedback({
        tone: 'error',
        text: 'لم يتم العثور على سياق النشاط التجاري المطلوب.',
      });
      return false;
    }

    let createdOrUpdatedBranchId: string | null = null;
    const isUpdating = Boolean(primaryBranch);

    // V4: Track ambiguous intent before mutation dispatch
    const writeIntent: AmbiguousWriteIntent = isUpdating
      ? {
          kind: 'primary_update',
          businessId: activeBusinessId,
          branchId: primaryBranch!.id,
          attemptedValues: {
            name: effectivePrimaryName.trim(),
            city: effectivePrimaryCity.trim(),
            address_line: effectivePrimaryAddress.trim(),
            district: effectivePrimaryDistrict.trim() || null,
          },
          previousSnapshot: {
            name: primaryBranch!.name,
            city: primaryBranch!.city,
            address_line: primaryBranch!.address_line,
            district: primaryBranch!.district,
          },
          attemptedAt: Date.now(),
        }
      : {
          kind: 'primary_create',
          businessId: activeBusinessId,
          existingBranchIds: effectiveBranches.map(b => b.id),
          attemptedValues: {
            name: effectivePrimaryName.trim(),
            city: effectivePrimaryCity.trim(),
            address_line: effectivePrimaryAddress.trim(),
            district: effectivePrimaryDistrict.trim() || null,
          },
          attemptedAt: Date.now(),
        };

    try {
      if (primaryBranch) {
        const wasUpdated = await updateBranchMutation.mutateAsync({
          businessId: activeBusinessId,
          branchId: primaryBranch.id,
          patch: {
            name: effectivePrimaryName.trim(),
            city: effectivePrimaryCity.trim(),
            address_line: effectivePrimaryAddress.trim(),
            district: effectivePrimaryDistrict.trim() || null,
          },
        });
        if (!wasUpdated) {
          await refetchBranches().catch(() => null);
          setFeedback({
            tone: 'warning',
            text: 'تعذر تحديث بيانات الفرع الرئيسي؛ لم تطبق التغييرات.',
          });
          return false;
        }
        createdOrUpdatedBranchId = primaryBranch.id;
      } else {
        const newBranchId = await createBranchMutation.mutateAsync({
          businessId: activeBusinessId,
          name: effectivePrimaryName.trim(),
          city: effectivePrimaryCity.trim(),
          addressLine: effectivePrimaryAddress.trim(),
          district: effectivePrimaryDistrict.trim() || null,
        });
        createdOrUpdatedBranchId = newBranchId;
      }
    } catch (err: unknown) {
      if (isDeploymentPendingError(err)) {
        setFeedback({
          tone: 'warning',
          text: 'خدمة حفظ الفروع قيد التحديث في النظام حاليًا. يرجى المحاولة لاحقًا.',
        });
        return false;
      }
      const isNetworkOrTimeout =
        err instanceof TypeError ||
        (err instanceof Error && /network|timeout|abort/i.test(err.message));

      if (isNetworkOrTimeout) {
        setAmbiguousIntent(writeIntent);
        setIsUncertain(true);
        setFeedback({
          tone: 'warning',
          text: 'تعذر تأكيد الحفظ. تحقق من حالة الطلب قبل إعادة المحاولة.',
        });
      } else {
        setFeedback({
          tone: 'error',
          text: err instanceof Error ? err.message : 'تعذر حفظ بيانات الفرع الرئيسي.',
        });
      }
      return false;
    }

    // Step 2: Read-after-write authoritative verification (C1)
    let refetchRes;
    try {
      refetchRes = await refetchBranches();
    } catch {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم إرسال الطلب ولكن تعذر تأكيد حفظ الفرع الرئيسي. يرجى التحقق من حالة الطلب قبل المتابعة.',
      });
      return false;
    }

    // Inspect resolved query result for .error or missing data
    if (refetchRes.error || !refetchRes.data) {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم إرسال الطلب ولكن تعذر تأكيد حفظ الفرع الرئيسي. يرجى التحقق من حالة الطلب قبل المتابعة.',
      });
      return false;
    }

    // Verify presence and primary status in authoritative data
    const branches = (refetchRes.data as Branch[]) ?? [];
    const confirmedPrimary = branches.find((b: Branch) => b.is_primary);

    if (!confirmedPrimary) {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم إرسال الطلب ولكن لم يظهر الفرع الرئيسي في السجلات المحدثة. يرجى التحقق من حالة الطلب.',
      });
      return false;
    }

    // Correlate with returned created or updated UUID
    if (createdOrUpdatedBranchId && confirmedPrimary.id !== createdOrUpdatedBranchId) {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'حالة الفرع الرئيسي غير متطابقة في الخادم. يرجى التحقق من حالة الطلب قبل المتابعة.',
      });
      return false;
    }

    // Write conclusively confirmed
    setAmbiguousIntent(null);
    setHasUnsavedChanges(false);
    setIsUncertain(false);
    return true;
  }, [
    isUncertain,
    hasLoadError,
    validatePrimaryBranch,
    isReadOnly,
    isSaving,
    isSyntheticPreview,
    activeBusinessId,
    userId,
    primaryBranch,
    effectiveBranches,
    effectivePrimaryName,
    effectivePrimaryCity,
    effectivePrimaryAddress,
    effectivePrimaryDistrict,
    fixtureBranches,
    defaultSyntheticBranches,
    updateBranchMutation,
    createBranchMutation,
    refetchBranches,
  ]);

  // Create additional branch (F1: Sequential confirmed primary required; C1: Read-after-write verification; C3: Independent setState scheduling; V4: Ambiguous intent)
  const createAdditionalBranch = useCallback(async (data: BranchEditorData): Promise<boolean> => {
    if (isUncertain) {
      setFeedback({
        tone: 'warning',
        text: 'حالة الطلب غير مؤكدة حالياً. اضغط على "التحقق من حالة الطلب" لتأكيد حالة البيانات قبل المتابعة.',
      });
      return false;
    }

    if (hasLoadError) {
      setFeedback({
        tone: 'error',
        text: 'تعذر تحميل بيانات الفروع. يرجى إعادة المحاولة قبل تعديل البيانات.',
      });
      return false;
    }

    // F1: Guard against creating secondary branch before primary branch is saved
    if (!primaryBranch) {
      setFeedback({
        tone: 'warning',
        text: 'يجب حفظ بيانات الفرع الرئيسي أولاً قبل إضافة فروع أخرى.',
      });
      return false;
    }

    if (isReadOnly || isSaving) return false;
    setFeedback(null);

    // C3: Preview mode independent of setState scheduling
    if (isSyntheticPreview) {
      const newBranch: Branch = {
        id: `dev-synthetic-branch-additional-${Date.now()}`,
        business_id: activeBusinessId || 'dev-synthetic-business-uuid',
        name: data.name,
        city: data.city,
        address_line: data.address_line,
        district: data.district ?? null,
        is_primary: false,
        status: 'draft',
      };
      setSyntheticBranchesState(prev => {
        const list = prev ? [...prev] : (fixtureBranches ? [...fixtureBranches] : [...defaultSyntheticBranches]);
        return [...list, newBranch];
      });
      setFeedback({
        tone: 'success',
        text: 'تمت إضافة الفرع بنجاح.',
      });
      return true;
    }

    if (!activeBusinessId || !userId) {
      setFeedback({ tone: 'error', text: 'لم يتم العثور على سياق النشاط التجاري.' });
      return false;
    }

    // V4: Track ambiguous intent before mutation dispatch
    const writeIntent: AmbiguousWriteIntent = {
      kind: 'additional_create',
      businessId: activeBusinessId,
      existingBranchIds: effectiveBranches.map(b => b.id),
      attemptedValues: {
        name: data.name.trim(),
        city: data.city.trim(),
        address_line: data.address_line.trim(),
        district: data.district?.trim() || null,
      },
      attemptedAt: Date.now(),
    };

    let createdId: string | null = null;
    try {
      createdId = await createBranchMutation.mutateAsync({
        businessId: activeBusinessId,
        name: data.name,
        city: data.city,
        addressLine: data.address_line,
        district: data.district ?? null,
      });
    } catch (err: unknown) {
      if (isDeploymentPendingError(err)) {
        setFeedback({
          tone: 'warning',
          text: 'خدمة إضافة الفروع قيد التحديث في النظام حالياً. يرجى المحاولة لاحقاً.',
        });
        return false;
      }
      const isNetworkOrTimeout =
        err instanceof TypeError ||
        (err instanceof Error && /network|timeout|abort/i.test(err.message));

      if (isNetworkOrTimeout) {
        setAmbiguousIntent(writeIntent);
        setIsUncertain(true);
        setFeedback({
          tone: 'warning',
          text: 'تعذر تأكيد إضافة الفرع. تحقق من حالة الطلب قبل إعادة المحاولة.',
        });
      } else {
        setFeedback({
          tone: 'error',
          text: err instanceof Error ? err.message : 'تعذر إضافة الفرع الجديد.',
        });
      }
      return false;
    }

    // Read-after-write verification for secondary branch
    let refetchRes;
    try {
      refetchRes = await refetchBranches();
    } catch {
      setAmbiguousIntent({ ...writeIntent, branchId: createdId });
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم إرسال طلب إضافة الفرع ولكن تعذر تأكيد التحديث. تحقق من حالة الطلب.',
      });
      return false;
    }

    if (refetchRes.error || !refetchRes.data) {
      setAmbiguousIntent({ ...writeIntent, branchId: createdId });
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم إرسال طلب إضافة الفرع ولكن تعذر تأكيد التحديث. تحقق من حالة الطلب.',
      });
      return false;
    }

    const branches = (refetchRes.data as Branch[]) ?? [];
    const found = branches.find((b: Branch) => b.id === createdId);
    if (!found) {
      setAmbiguousIntent({ ...writeIntent, branchId: createdId });
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تمت إضافة الفرع ولكن لم يظهر في قائمة الفروع المسترجعة. يرجى التحقق من حالة الطلب.',
      });
      return false;
    }

    setAmbiguousIntent(null);
    setIsUncertain(false);
    setFeedback({
      tone: 'success',
      text: 'تمت إضافة الفرع بنجاح.',
    });
    return true;
  }, [
    isUncertain,
    hasLoadError,
    primaryBranch,
    isReadOnly,
    isSaving,
    isSyntheticPreview,
    activeBusinessId,
    userId,
    effectiveBranches,
    fixtureBranches,
    defaultSyntheticBranches,
    createBranchMutation,
    refetchBranches,
  ]);

  // Update additional branch (F2: Inspect returned boolean; C1: Read-after-write verification; C3: Independent setState scheduling; F6: Status check; V4: Ambiguous intent)
  const updateAdditionalBranch = useCallback(async (data: BranchEditorData): Promise<boolean> => {
    if (!data.id || isReadOnly || isSaving) return false;

    if (isUncertain) {
      setFeedback({
        tone: 'warning',
        text: 'حالة الطلب غير مؤكدة حالياً. اضغط على "التحقق من حالة الطلب" لتأكيد حالة البيانات قبل المتابعة.',
      });
      return false;
    }

    if (hasLoadError) {
      setFeedback({
        tone: 'error',
        text: 'تعذر تحميل بيانات الفروع. يرجى إعادة المحاولة قبل تعديل البيانات.',
      });
      return false;
    }

    // F6: Branch status safeguard
    const targetBranch = effectiveBranches.find(b => b.id === data.id);
    if (targetBranch && targetBranch.status !== 'draft' && targetBranch.status !== 'rejected') {
      setFeedback({
        tone: 'warning',
        text: `لا يمكن تعديل الفرع في حالته الحالية (${targetBranch.status}).`,
      });
      return false;
    }

    setFeedback(null);

    // C3: Preview mode independent of setState scheduling
    if (isSyntheticPreview) {
      const exists = effectiveBranches.some(b => b.id === data.id);
      if (!exists) {
        setFeedback({
          tone: 'warning',
          text: 'تعذر تحديث بيانات الفرع؛ لم يتم العثور عليه.',
        });
        return false;
      }
      setSyntheticBranchesState(prev => {
        const list = prev ? [...prev] : (fixtureBranches ? [...fixtureBranches] : [...defaultSyntheticBranches]);
        const idx = list.findIndex(b => b.id === data.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            name: data.name,
            city: data.city,
            address_line: data.address_line,
            district: data.district ?? null,
          };
        }
        return list;
      });
      setFeedback({
        tone: 'success',
        text: 'تم تحديث بيانات الفرع بنجاح.',
      });
      return true;
    }

    if (!activeBusinessId || !userId) {
      setFeedback({ tone: 'error', text: 'لم يتم العثور على سياق النشاط التجاري.' });
      return false;
    }

    // V4: Track ambiguous intent before mutation dispatch
    const writeIntent: AmbiguousWriteIntent = {
      kind: 'additional_update',
      businessId: activeBusinessId,
      branchId: data.id,
      attemptedValues: {
        name: data.name.trim(),
        city: data.city.trim(),
        address_line: data.address_line.trim(),
        district: data.district?.trim() || null,
      },
      previousSnapshot: {
        name: targetBranch?.name,
        city: targetBranch?.city,
        address_line: targetBranch?.address_line,
        district: targetBranch?.district,
      },
      attemptedAt: Date.now(),
    };

    try {
      const wasUpdated = await updateBranchMutation.mutateAsync({
        businessId: activeBusinessId,
        branchId: data.id,
        patch: {
          name: data.name,
          city: data.city,
          address_line: data.address_line,
          district: data.district ?? null,
        },
      });

      if (!wasUpdated) {
        await refetchBranches().catch(() => null);
        setFeedback({
          tone: 'warning',
          text: 'تعذر تحديث بيانات الفرع؛ لم تطبق التغييرات.',
        });
        return false;
      }
    } catch (err: unknown) {
      if (isDeploymentPendingError(err)) {
        setFeedback({
          tone: 'warning',
          text: 'خدمة تعديل الفروع قيد التحديث في النظام حالياً. يرجى المحاولة لاحقاً.',
        });
        return false;
      }
      const isNetworkOrTimeout =
        err instanceof TypeError ||
        (err instanceof Error && /network|timeout|abort/i.test(err.message));

      if (isNetworkOrTimeout) {
        setAmbiguousIntent(writeIntent);
        setIsUncertain(true);
        setFeedback({
          tone: 'warning',
          text: 'تعذر تأكيد تعديل الفرع. تحقق من حالة الطلب قبل إعادة المحاولة.',
        });
      } else {
        setFeedback({
          tone: 'error',
          text: err instanceof Error ? err.message : 'تعذر تعديل بيانات الفرع.',
        });
      }
      return false;
    }

    // Read-after-write verification for update
    let refetchRes;
    try {
      refetchRes = await refetchBranches();
    } catch {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم إرسال تعديل الفرع ولكن تعذر تأكيد التحديث. تحقق من حالة الطلب.',
      });
      return false;
    }

    if (refetchRes.error || !refetchRes.data) {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم إرسال تعديل الفرع ولكن تعذر تأكيد التحديث. تحقق من حالة الطلب.',
      });
      return false;
    }

    const branches = (refetchRes.data as Branch[]) ?? [];
    const found = branches.find((b: Branch) => b.id === data.id);
    if (!found) {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم تحديث بيانات الفرع ولكن لم يظهر في قائمة الفروع المسترجعة. يرجى التحقق من حالة الطلب.',
      });
      return false;
    }

    setAmbiguousIntent(null);
    setIsUncertain(false);
    setFeedback({
      tone: 'success',
      text: 'تم تحديث بيانات الفرع بنجاح.',
    });
    return true;
  }, [
    isReadOnly,
    isSaving,
    isUncertain,
    hasLoadError,
    effectiveBranches,
    isSyntheticPreview,
    activeBusinessId,
    userId,
    fixtureBranches,
    defaultSyntheticBranches,
    updateBranchMutation,
    refetchBranches,
  ]);

  // Delete additional branch (F2: Inspect returned boolean; C1: Read-after-write verification; C3: Independent setState scheduling; F6: Status check; V4: Ambiguous intent)
  const deleteAdditionalBranch = useCallback(async (branchId: string): Promise<boolean> => {
    if (isReadOnly || isSaving) return false;

    if (isUncertain) {
      setFeedback({
        tone: 'warning',
        text: 'حالة الطلب غير مؤكدة حالياً. اضغط على "التحقق من حالة الطلب" لتأكيد حالة البيانات قبل المتابعة.',
      });
      return false;
    }

    if (hasLoadError) {
      setFeedback({
        tone: 'error',
        text: 'تعذر تحميل بيانات الفروع. يرجى إعادة المحاولة قبل تعديل البيانات.',
      });
      return false;
    }

    // F6: Branch status safeguard
    const targetBranch = effectiveBranches.find(b => b.id === branchId);
    if (targetBranch && targetBranch.status !== 'draft' && targetBranch.status !== 'rejected') {
      setFeedback({
        tone: 'warning',
        text: `لا يمكن حذف الفرع في حالته الحالية (${targetBranch.status}).`,
      });
      return false;
    }

    setFeedback(null);

    // C3: Preview mode independent of setState scheduling
    if (isSyntheticPreview) {
      const exists = effectiveBranches.some(b => b.id === branchId);
      if (!exists) {
        setFeedback({
          tone: 'info',
          text: 'لم يتم العثور على الفرع المطلوب أو تم حذفه مسبقاً.',
        });
        return false;
      }
      setSyntheticBranchesState(prev => {
        const list = prev ? [...prev] : (fixtureBranches ? [...fixtureBranches] : [...defaultSyntheticBranches]);
        return list.filter(b => b.id !== branchId);
      });
      setFeedback({
        tone: 'success',
        text: 'تم حذف الفرع بنجاح.',
      });
      return true;
    }

    if (!activeBusinessId || !userId) {
      setFeedback({ tone: 'error', text: 'لم يتم العثور على سياق النشاط التجاري.' });
      return false;
    }

    // V4: Track ambiguous intent before mutation dispatch
    const writeIntent: AmbiguousWriteIntent = {
      kind: 'additional_delete',
      businessId: activeBusinessId,
      branchId,
      previousSnapshot: {
        name: targetBranch?.name,
      },
      attemptedAt: Date.now(),
    };

    try {
      const wasDeleted = await deleteBranchMutation.mutateAsync({
        businessId: activeBusinessId,
        branchId,
      });

      if (!wasDeleted) {
        await refetchBranches().catch(() => null);
        setFeedback({
          tone: 'info',
          text: 'لم يتم العثور على الفرع المطلوب أو تم حذفه مسبقاً.',
        });
        return false;
      }
    } catch (err: unknown) {
      if (isDeploymentPendingError(err)) {
        setFeedback({
          tone: 'warning',
          text: 'خدمة حذف الفرع قيد التحديث في النظام حالياً. يرجى المحاولة لاحقاً.',
        });
        return false;
      }
      const isNetworkOrTimeout =
        err instanceof TypeError ||
        (err instanceof Error && /network|timeout|abort/i.test(err.message));

      if (isNetworkOrTimeout) {
        setAmbiguousIntent(writeIntent);
        setIsUncertain(true);
        setFeedback({
          tone: 'warning',
          text: 'تعذر تأكيد حذف الفرع. تحقق من حالة الطلب قبل إعادة المحاولة.',
        });
      } else {
        setFeedback({
          tone: 'error',
          text: err instanceof Error ? err.message : 'تعذر حذف الفرع.',
        });
      }
      return false;
    }

    // Read-after-write verification for deletion
    let refetchRes;
    try {
      refetchRes = await refetchBranches();
    } catch {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم حذف الفرع ولكن تعذر تأكيد تحديث القائمة. يرجى التحقق من حالة الطلب.',
      });
      return false;
    }

    if (refetchRes.error || !refetchRes.data) {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم حذف الفرع ولكن تعذر تأكيد تحديث القائمة. يرجى التحقق من حالة الطلب.',
      });
      return false;
    }

    const branches = (refetchRes.data as Branch[]) ?? [];
    const stillPresent = branches.some((b: Branch) => b.id === branchId);
    if (stillPresent) {
      setAmbiguousIntent(writeIntent);
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تم طلب حذف الفرع ولكن لا يزال معروضاً في القائمة. يرجى التحقق من حالة الطلب.',
      });
      return false;
    }

    setAmbiguousIntent(null);
    setIsUncertain(false);
    setFeedback({
      tone: 'success',
      text: 'تم حذف الفرع بنجاح.',
    });
    return true;
  }, [
    isReadOnly,
    isSaving,
    isUncertain,
    hasLoadError,
    effectiveBranches,
    isSyntheticPreview,
    activeBusinessId,
    userId,
    fixtureBranches,
    defaultSyntheticBranches,
    deleteBranchMutation,
    refetchBranches,
  ]);

  // Save Draft (F7: Documented draft semantics; requires primary persistence if no primary exists yet)
  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (isReadOnly || isSaving || isUncertain || hasLoadError) return false;

    // If no primary branch exists yet, primary branch inputs must be validated and persisted
    if (!primaryBranch) {
      const saved = await persistPrimaryBranch();
      if (!saved) return false;
      setFeedback({
        tone: 'success',
        text: 'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
      });
      return true;
    }

    // If primary branch already exists and there are unsaved changes
    if (hasUnsavedChanges) {
      const saved = await persistPrimaryBranch();
      if (!saved) return false;
    }

    setFeedback({
      tone: 'success',
      text: 'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
    });
    return true;
  }, [isReadOnly, isSaving, isUncertain, hasLoadError, primaryBranch, hasUnsavedChanges, persistPrimaryBranch]);

  // Save and Continue
  const saveAndContinue = useCallback(async (): Promise<boolean> => {
    if (isUncertain || hasLoadError) return false;

    const saved = await persistPrimaryBranch();
    if (!saved) return false;

    // Check if next step destination exists
    if (onNavigateToStep4) {
      onNavigateToStep4(activeBusinessId || 'dev-synthetic-business-uuid');
    } else {
      setFeedback({
        tone: 'success',
        text: 'تم حفظ بيانات الفروع بنجاح. الخطوة التالية (المراجعة) قيد التطوير ولم تُتح بعد.',
      });
    }
    return true;
  }, [isUncertain, hasLoadError, persistPrimaryBranch, onNavigateToStep4, activeBusinessId]);

  // Reconcile state (C1: Robust verification of both refetches; V4: Reconcile affected operation intent, preserve local New edits, prevent duplicate secondary creation)
  const reconcileState = useCallback(async (): Promise<boolean> => {
    if (isSyntheticPreview || !activeBusinessId) {
      setIsUncertain(false);
      setAmbiguousIntent(null);
      setFeedback({
        tone: 'info',
        text: 'تم تحديث حالة البيانات بنجاح.',
      });
      return true;
    }

    setIsReconciling(true);
    try {
      const [busRes, branchRes] = await Promise.allSettled([
        refetchBusiness(),
        refetchBranches(),
      ]);

      const busFailed =
        busRes.status === 'rejected' ||
        Boolean(busRes.value?.error) ||
        !busRes.value?.data;

      const branchFailed =
        branchRes.status === 'rejected' ||
        Boolean(branchRes.value?.error) ||
        !branchRes.value?.data;

      if (busFailed || branchFailed) {
        setIsUncertain(true);
        setFeedback({
          tone: 'warning',
          text: 'تعذر التحقق من حالة الطلب بسبب خطأ في الاتصال. يرجى إعادة المحاولة.',
        });
        return false;
      }

      // Authoritative synchronization
      const authoritativeBranches = (branchRes.value.data as Branch[]) ?? [];
      const primaryBranches = authoritativeBranches.filter((b: Branch) => b.is_primary);

      // Check for contradictory data: multiple primaries
      if (primaryBranches.length > 1) {
        setIsUncertain(true);
        setFeedback({
          tone: 'warning',
          text: 'تم اكتشاف حالة غير متطابقة للفروع في الخادم. يرجى مراجعة الدعم الفني.',
        });
        return false;
      }

      const authoritativePrimary = primaryBranches[0] ?? null;

      // V4: Operation-specific intent reconciliation
      if (ambiguousIntent) {
        if (ambiguousIntent.kind === 'primary_update') {
          if (!authoritativePrimary) {
            setIsUncertain(true);
            setFeedback({
              tone: 'warning',
              text: 'لم يتم العثور على الفرع الرئيسي في السجلات المحدثة.',
            });
            return false;
          }

          const attempted = ambiguousIntent.attemptedValues;
          const nameMatches = authoritativePrimary.name === attempted?.name;
          const cityMatches = authoritativePrimary.city === attempted?.city;
          const addressMatches = authoritativePrimary.address_line === attempted?.address_line;
          const districtMatches = (authoritativePrimary.district ?? null) === (attempted?.district ?? null);
          const isConfirmed = nameMatches && cityMatches && addressMatches && districtMatches;

          if (!isConfirmed) {
            // V4 Requirement 3: Never silently discard unsaved edits.
            // When authoritative server primary still has Old values:
            // Local New values and dirty indication must be preserved!
            // Do NOT overwrite typed fields or clear hasUnsavedChanges.
            // Keep uncertainty stop active against blind retries.
            setIsUncertain(true);
            setFeedback({
              tone: 'warning',
              text: 'لم يتم تطبيق تعديلات الفرع الرئيسي على الخادم وما زالت البيانات القديمة مسجلة. تم الاحتفاظ بتعديلاتك المدخلة.',
            });
            return false;
          }

          // Positively confirmed: authoritative server primary has the New values!
          setAmbiguousIntent(null);
          setIsUncertain(false);
          setPrimaryName(null);
          setPrimaryCity(null);
          setPrimaryAddressLine(null);
          setPrimaryDistrict(null);
          setHasUnsavedChanges(false);
          setFeedback({
            tone: 'success',
            text: 'تم تأكيد حفظ تعديلات الفرع الرئيسي في الخادم بنجاح.',
          });
          return true;
        }

        if (ambiguousIntent.kind === 'primary_create') {
          if (!authoritativePrimary) {
            setIsUncertain(true);
            setFeedback({
              tone: 'warning',
              text: 'لم يتم تأكيد إنشاء الفرع الرئيسي في الخادم. يرجى التحقق من حالة الاتصال.',
            });
            return false;
          }

          const attempted = ambiguousIntent.attemptedValues;
          const nameMatches = authoritativePrimary.name === attempted?.name;
          const cityMatches = authoritativePrimary.city === attempted?.city;
          const addressMatches = authoritativePrimary.address_line === attempted?.address_line;
          const isConfirmed = nameMatches && cityMatches && addressMatches;

          if (!isConfirmed) {
            setIsUncertain(true);
            setFeedback({
              tone: 'warning',
              text: 'الفرع الرئيسي المسجل في الخادم لا يطابق البيانات التي حاولت إنشاءها.',
            });
            return false;
          }

          setAmbiguousIntent(null);
          setIsUncertain(false);
          setPrimaryName(null);
          setPrimaryCity(null);
          setPrimaryAddressLine(null);
          setPrimaryDistrict(null);
          setHasUnsavedChanges(false);
          setFeedback({
            tone: 'success',
            text: 'تم تأكيد إنشاء الفرع الرئيسي في الخادم بنجاح.',
          });
          return true;
        }

        if (ambiguousIntent.kind === 'additional_create') {
          // V4 Requirement 4: Prevent duplicate secondary creation.
          // Check if a new branch matching attempted values was created
          const existingIds = ambiguousIntent.existingBranchIds ?? [];
          const attempted = ambiguousIntent.attemptedValues;

          const matchingNewBranch = authoritativeBranches.find((b: Branch) => {
            if (b.is_primary) return false;
            if (existingIds.includes(b.id)) return false;
            return (
              b.name === attempted?.name &&
              b.city === attempted?.city &&
              b.address_line === attempted?.address_line
            );
          });

          if (!matchingNewBranch) {
            // Write was NOT confirmed on the server!
            // Do NOT infer success merely from valid query fetch of unrelated branches.
            // Retry must remain blocked.
            setIsUncertain(true);
            setFeedback({
              tone: 'warning',
              text: 'لم يتم تأكيد إضافة الفرع في الخادم. يظل الإجراء متوقفاً لمنع تكرار إنشاء الفرع. تحقق من حالة الاتصال.',
            });
            return false;
          }

          // Unambiguously confirmed!
          setAmbiguousIntent(null);
          setIsUncertain(false);
          setFeedback({
            tone: 'success',
            text: 'تم تأكيد إضافة الفرع في الخادم بنجاح.',
          });
          return true;
        }

        if (ambiguousIntent.kind === 'additional_update') {
          const targetBranch = authoritativeBranches.find((b: Branch) => b.id === ambiguousIntent.branchId);
          if (!targetBranch) {
            setIsUncertain(true);
            setFeedback({
              tone: 'warning',
              text: 'لم يتم العثور على الفرع المطلوب تحديثه في السجلات.',
            });
            return false;
          }

          const attempted = ambiguousIntent.attemptedValues;
          const isConfirmed =
            targetBranch.name === attempted?.name &&
            targetBranch.city === attempted?.city &&
            targetBranch.address_line === attempted?.address_line &&
            (targetBranch.district ?? null) === (attempted?.district ?? null);

          if (!isConfirmed) {
            setIsUncertain(true);
            setFeedback({
              tone: 'warning',
              text: 'لم يتم تطبيق تعديلات الفرع على الخادم وما زالت البيانات السابقة مسجلة.',
            });
            return false;
          }

          setAmbiguousIntent(null);
          setIsUncertain(false);
          setFeedback({
            tone: 'success',
            text: 'تم تأكيد تحديث بيانات الفرع في الخادم بنجاح.',
          });
          return true;
        }

        if (ambiguousIntent.kind === 'additional_delete') {
          const stillExists = authoritativeBranches.some((b: Branch) => b.id === ambiguousIntent.branchId);
          if (stillExists) {
            setIsUncertain(true);
            setFeedback({
              tone: 'warning',
              text: 'لم يتم تأكيد حذف الفرع من الخادم وما زال الفرع موجوداً.',
            });
            return false;
          }

          setAmbiguousIntent(null);
          setIsUncertain(false);
          setFeedback({
            tone: 'success',
            text: 'تم تأكيد حذف الفرع من الخادم بنجاح.',
          });
          return true;
        }
      }

      // Fallback reconciliation when no ambiguous write intent was tracked
      if (authoritativePrimary) {
        if (!hasUnsavedChanges) {
          setPrimaryName(null);
          setPrimaryCity(null);
          setPrimaryAddressLine(null);
          setPrimaryDistrict(null);
        }
      }

      setIsUncertain(false);
      setFeedback({
        tone: 'success',
        text: 'تم التحقق من حالة الفروع ومزامنة البيانات بنجاح.',
      });
      return true;
    } catch {
      setIsUncertain(true);
      setFeedback({
        tone: 'warning',
        text: 'تعذر التحقق من حالة الطلب. يرجى إعادة المحاولة لاحقاً.',
      });
      return false;
    } finally {
      setIsReconciling(false);
    }
  }, [
    isSyntheticPreview,
    activeBusinessId,
    refetchBusiness,
    refetchBranches,
    ambiguousIntent,
    hasUnsavedChanges,
  ]);

  return {
    isAuthLoaded,
    isSignedIn,
    activeBusinessId,
    existingBusiness,
    isSyntheticPreview,
    businessLoadError,
    branchesLoadError,
    hasLoadError,
    isBusinessLoading,
    isBranchesLoading,
    isReadOnly,
    readOnlyMessage,
    isSaving,
    hasUnsavedChanges,
    feedback,
    isUncertain,
    ambiguousIntent,
    // Primary branch fields
    primaryBranch,
    primaryName: effectivePrimaryName,
    primaryCity: effectivePrimaryCity,
    primaryAddress: effectivePrimaryAddress,
    primaryDistrict: effectivePrimaryDistrict,
    primaryNameError,
    primaryCityError,
    primaryAddressError,
    handlePrimaryNameChange,
    handlePrimaryCityChange,
    handlePrimaryAddressChange,
    handlePrimaryDistrictChange,
    discardUnsavedChanges,
    persistPrimaryBranch,
    // Additional branches
    additionalBranches,
    createAdditionalBranch,
    updateAdditionalBranch,
    deleteAdditionalBranch,
    // Flow actions
    saveDraft,
    saveAndContinue,
    reconcileState,
  };
}
