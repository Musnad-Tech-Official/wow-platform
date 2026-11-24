import { randomUUID } from 'expo-crypto';
import React, { createContext, useContext, useState, useMemo, useCallback, useRef, type PropsWithChildren } from 'react';
import { useGlobalSearchParams } from 'expo-router';
import {
  useCreateOffer,
  useSaveOfferDraft,
  useSubmitOffer,
  useOfferVersions,
  useOfferVersionDetails,
  useOfferEvidenceDraft,
  useSaveOfferEvidenceDraft,
  useBusiness,
  type OfferDraftPayload,
  type OfferKind,
  type OfferMedia,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import type { SelectedEvidenceFile } from '../../business/components/EvidencePicker';
import { offerDateTimestamp } from '../offer-local-date';
import { createEditorOperationGate } from '../editor-operation-gate';

export interface OfferDraftState {
  // Step 1: Definition
  offerKind: OfferKind;
  title: string;
  description: string;
  categoryId: string | null;

  // Step 2: Pricing, Benefits & Terms
  finalPrice: string;
  originalPrice: string;
  currency: string;
  benefitType: 'discount' | 'bundle' | 'gift';
  terms: string;
  mandatoryFees: string;
  isClearance: boolean;

  // Step 3: Branches, Dates & Availability
  selectedBranchIds: string[];
  startsAt: string;
  endsAt: string;
  merchantAvailable: boolean;
  quantityOrTimeNotice: string;

  // Step 4: Private Evidence
  evidenceFile: SelectedEvidenceFile | null;
}

export interface OfferEditorContextValue {
  // Identification
  businessId: string | null;
  offerId: string | null;
  versionId: string | null;
  media: OfferMedia[];
  prepareOfferMediaUpload:()=>Promise<{businessId:string;versionId:string}|null>;
  isNewOffer: boolean;
  isSyntheticPreview: boolean;

  // State & Setters
  draft: OfferDraftState;
  updateDraft: (patch: Partial<OfferDraftState>) => void;

  // Validation
  errors: Record<string, string>;
  validateStep: (step: 1 | 2 | 3 | 4 | 5) => boolean;
  canProceed: (step: 1 | 2 | 3 | 4) => boolean;
  isEvidenceRequired: boolean;

  // Actions
  isDirty: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  isUploadingEvidence: boolean;
  beginEvidenceUpload: () => boolean;
  endEvidenceUpload: () => void;
  actionFeedback: string | null;
  clearFeedback: () => void;
  saveDraft: () => Promise<string | null>;
  submitOfferForReview: () => Promise<string | null>;

  // Business Switch Safeguard
  businessConflict: boolean;
  resolveBusinessConflict: (action: 'switch_and_reset' | 'keep_draft') => void;
  draftBusinessName: string;
}

const OfferEditorContext = createContext<OfferEditorContextValue | null>(null);

/** Form fields contain yyyy-mm-dd or previously saved ISO values.
 * Date-only user input must never acquire a time suffix while being edited.
 */
export function isValidOfferDateValue(value: string): boolean {
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (value.length !== 10 && (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))) return false;
  const timestamp = Date.parse(date + 'T00:00:00.000Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}

export { offerDateTimestamp, formatOfferLocalDate } from '../offer-local-date';

const DEFAULT_DRAFT_STATE: OfferDraftState = {
  offerKind: 'product',
  title: '',
  description: '',
  categoryId: null,
  finalPrice: '',
  originalPrice: '',
  currency: 'YER',
  benefitType: 'discount',
  terms: '',
  mandatoryFees: '',
  isClearance: false,
  selectedBranchIds: [],
  startsAt: '',
  endsAt: '',
  merchantAvailable: true,
  quantityOrTimeNotice: '',
  evidenceFile: null,
};

export const PREVIEW_OFFER_FIXTURE: OfferDraftState = {
  offerKind: 'product',
  title: 'سماعات لاسلكية مع ضمان المحل',
  description: 'سماعات بلوتوث عالية الجودة مع عزل الضوضاء وضمان استبدال مباشر لمدة 6 أشهر لدى فروعنا المعتمدة.',
  categoryId: 'cat-electronics-uuid',
  finalPrice: '14500',
  originalPrice: '18000',
  currency: 'YER',
  benefitType: 'discount',
  terms: 'الكميات محدودة، يشمل الضمان العيوب المصنعية فقط ولا يشمل سوء الاستخدام. العرض سارٍ لدى الفروع المشاركة.',
  mandatoryFees: '',
  isClearance: false,
  selectedBranchIds: ['branch-tahrir-uuid'],
  startsAt: '2026-11-15T00:00:00.000Z',
  endsAt: '2026-12-15T23:59:59.000Z',
  merchantAvailable: true,
  quantityOrTimeNotice: 'العرض متاح حتى نفاد الكمية المخصصة (50 قطعة)',
  evidenceFile: {
    name: 'فاتورة_شراء_المورد_وضمان_الوكيل.pdf',
    size: 245000,
    mimeType: 'application/pdf',
    storageKey: 'business-verifications/dev-synthetic-business-uuid/dev_synthetic_merchant_user/offer-evidence-preview.pdf',
    isUploaded: true,
  },
};

export function OfferEditorProvider({
  children,
  initialOfferId,
}: PropsWithChildren<{ initialOfferId?: string | null }>) {
  const searchParams = useGlobalSearchParams<{
    offerId?: string;
    businessId?: string;
    preview?: string;
  }>();

  const isSyntheticPreview =
    __DEV__ &&
    (searchParams.preview === '1' ||
      (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const { activeBusinessId, activeBusiness, setActiveBusinessId } = useActiveBusiness();

  // Route-specified or context businessId
  const effectiveBusinessId = searchParams.businessId || activeBusinessId || null;

  // The draft is bound to a specific business
  const [draftBusinessId, setDraftBusinessId] = useState<string | null>(effectiveBusinessId);
  const [currentOfferId, setCurrentOfferId] = useState<string | null>(
    initialOfferId ?? searchParams.offerId ?? null
  );

  // Persist the confirmed ID synchronously, even before a React render or a partial save failure.
  const confirmedOfferId = useRef(currentOfferId);
  const confirmedVersionId=useRef<string|null>(null);
  const [savedVersionId,setSavedVersionId]=useState<string|null>(null);
  const draftRequestId = useRef<string|null>(null);
  const [operationGate] = useState(createEditorOperationGate);
  const [operation,setOperation] = useState<'save'|'submit'|'upload'|null>(null);
  const beginOperation = useCallback((kind:'save'|'submit'|'upload') => {
    if (!operationGate.begin(kind)) return false;
    setOperation(kind); return true;
  }, [operationGate]);
  const finishOperation = useCallback((kind:'save'|'submit'|'upload') => {
    if (operationGate.finish(kind)) setOperation(null);
  }, [operationGate]);
  const beginEvidenceUpload = useCallback(() => beginOperation('upload'),[beginOperation]);
  const endEvidenceUpload = useCallback(() => finishOperation('upload'),[finishOperation]);

  // Bind once when the active business loads. A guarded same-component render
  // update is intentional: no effect that races with the user's first edit.
  if (!draftBusinessId && effectiveBusinessId) {
    setDraftBusinessId(effectiveBusinessId);
  }

  const [draft, setDraft] = useState<OfferDraftState>(() => {
    if (isSyntheticPreview) return PREVIEW_OFFER_FIXTURE;
    return DEFAULT_DRAFT_STATE;
  });

  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Queries & Mutations
  const { data: businessDetail } = useBusiness(draftBusinessId);
  const { data: versions = [] } = useOfferVersions(currentOfferId);
  const draftVersion = versions.find((v) => v.review_status === 'draft') ?? versions[0] ?? null;
  const effectiveVersionId=savedVersionId??draftVersion?.id??null;
  const { data: versionDetails } = useOfferVersionDetails(effectiveVersionId);
  const { data: evidenceDocs = [] } = useOfferEvidenceDraft(currentOfferId);

  const createOfferMutation = useCreateOffer();
  const saveDraftMutation = useSaveOfferDraft();
  const submitOfferMutation = useSubmitOffer();
  const saveEvidenceMutation = useSaveOfferEvidenceDraft();

  // Synchronize draft from server when version details load without cascading effects
  const [syncedVersionId, setSyncedVersionId] = useState<string | null>(null);
  if (!isSyntheticPreview && !isDirty && versionDetails?.version && versionDetails.version.id !== syncedVersionId) {
    setSyncedVersionId(versionDetails.version.id);
    const v = versionDetails.version;
    setDraft((prev) => ({
      ...prev,
      title: v.title ?? prev.title,
      description: v.description ?? prev.description,
      offerKind: (v.offer_kind as OfferKind) ?? prev.offerKind,
      categoryId: v.category_id ?? prev.categoryId,
      isClearance: v.is_clearance ?? prev.isClearance,
      merchantAvailable: v.merchant_available_requested ?? prev.merchantAvailable,
      finalPrice: v.final_price !== null && v.final_price !== undefined ? String(v.final_price) : prev.finalPrice,
      originalPrice: v.original_price !== null && v.original_price !== undefined ? String(v.original_price) : prev.originalPrice,
      currency: v.currency ?? prev.currency,
      terms: v.terms ?? prev.terms,
      mandatoryFees: v.mandatory_fees ?? prev.mandatoryFees,
      startsAt: v.starts_at ?? prev.startsAt,
      endsAt: v.ends_at ?? prev.endsAt,
      quantityOrTimeNotice: v.stock_or_condition_notice ?? prev.quantityOrTimeNotice,
      selectedBranchIds: versionDetails.branches.length > 0
        ? versionDetails.branches.map((b) => b.branch_id)
        : prev.selectedBranchIds,
    }));
  }

  // Synchronize evidence when loaded
  const [syncedEvidenceOfferId, setSyncedEvidenceOfferId] = useState<string | null>(null);
  if (!isSyntheticPreview && currentOfferId && currentOfferId !== syncedEvidenceOfferId && evidenceDocs.length > 0) {
    setSyncedEvidenceOfferId(currentOfferId);
    if (!draft.evidenceFile) {
      const first = evidenceDocs[0];
      setDraft((prev) => ({
        ...prev,
        evidenceFile: {
          name: first.name,
          size: first.size,
          mimeType: first.mimeType,
          storageKey: first.storageKey,
          isUploaded: true,
        },
      }));
    }
  }

  // Business Switch Conflict Detection:
  // If user switches activeBusinessId via header to another business while editing this draft,
  // we warn rather than silently migrating this draft to the new business!
  const businessConflict = Boolean(
    activeBusinessId &&
    draftBusinessId &&
    activeBusinessId !== draftBusinessId
  );

  const resolveBusinessConflict = useCallback(
    (action: 'switch_and_reset' | 'keep_draft') => {
      if (operationGate.current() !== null) return;
      if (action === 'switch_and_reset') {
        // Discard old draft, bind to newly selected business
        setDraftBusinessId(activeBusinessId);
        confirmedOfferId.current = null;
        draftRequestId.current = null;
        confirmedVersionId.current=null;
        setSavedVersionId(null);
        setCurrentOfferId(null);
        setDraft(DEFAULT_DRAFT_STATE);
        setIsDirty(false);
        setErrors({});
        setActionFeedback('تم بدء مسودة جديدة للنشاط التجاري المختار.');
      } else {
        // Revert active business selector back to the draft's business
        setActiveBusinessId(draftBusinessId);
      }
    },
    [activeBusinessId, draftBusinessId, setActiveBusinessId, operationGate]
  );

  const updateDraft = useCallback((patch: Partial<OfferDraftState>) => {
    if (operationGate.current() === 'save' || operationGate.current() === 'submit') return;
    setDraft((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
    // Clear field errors on change
    setErrors((prevErrors) => {
      const next = { ...prevErrors };
      for (const k of Object.keys(patch)) {
        delete next[k];
      }
      return next;
    });
  }, [operationGate]);

  // Conditional Evidence Requirement Rule:
  // If reference price is provided (discount claim) or clearance is indicated, proof is strictly required.
  const isEvidenceRequired = useMemo(() => {
    const hasReferencePrice = Boolean(draft.originalPrice && Number(draft.originalPrice) > 0);
    return hasReferencePrice || draft.isClearance;
  }, [draft.originalPrice, draft.isClearance]);

  // Validation function for each step
  const validateStep = useCallback(
    (step: 1 | 2 | 3 | 4 | 5): boolean => {
      const errs: Record<string, string> = {};

      if (step === 1 || step === 5) {
        if (!draft.title.trim()) {
          errs.title = 'يرجى كتابة عنوان العرض.';
        } else if (draft.title.trim().length < 4) {
          errs.title = 'عنوان العرض قصير جداً (4 أحرف على الأقل).';
        } else if (draft.title.trim().length > 150) {
          errs.title = 'عنوان العرض طويل جداً (150 حرف كحد أقصى).';
        }

        if (!draft.description.trim()) {
          errs.description = 'يرجى كتابة وصف يوضح ما يحصل عليه العميل.';
        } else if (draft.description.trim().length < 10) {
          errs.description = 'الوصف قصير جداً (10 أحرف على الأقل).';
        } else if (draft.description.trim().length > 4000) {
          errs.description = 'الوصف يتجاوز الحد الأقصى المسموح (4000 حرف).';
        }

        if (!draft.offerKind) {
          errs.offerKind = 'يرجى اختيار نوع العرض.';
        }

        if (!draft.categoryId) {
          errs.categoryId = 'يرجى اختيار فئة العرض المطابقة لنشاطك التجاري.';
        }
      }

      if (step === 2 || step === 5) {
        const finalNum = Number(draft.finalPrice);
        if (!draft.finalPrice.trim() || isNaN(finalNum)) {
          errs.finalPrice = 'يرجى إدخال السعر النهائي الفعلي.';
        } else if (finalNum <= 0) {
          errs.finalPrice = 'يجب أن يكون السعر النهائي أكبر من صفر.';
        }

        if (draft.originalPrice.trim()) {
          const origNum = Number(draft.originalPrice);
          if (isNaN(origNum)) {
            errs.originalPrice = 'يرجى إدخال سعر مرجعي صالح أو تركه فارغاً.';
          } else if (origNum < finalNum) {
            errs.originalPrice = 'السعر المرجعي يجب أن يكون أكبر من أو مساوياً للسعر النهائي لتجنب الخصومات الوهمية.';
          }
        }

        if (!draft.terms.trim()) {
          errs.terms = 'يرجى توضيح الشروط والقيود والاستثناءات المهمة.';
        } else if (draft.terms.trim().length > 4000) {
          errs.terms = 'الشروط تتجاوز الحد الأقصى المسموح (4000 حرف).';
        }

        if (draft.mandatoryFees.trim() && draft.mandatoryFees.trim().length > 1200) {
          errs.mandatoryFees = 'الرسوم الإضافية تتجاوز الحد الأقصى المسموح (1200 حرف).';
        }
      }

      if (step === 3 || step === 5) {
        if (!draft.selectedBranchIds || draft.selectedBranchIds.length === 0) {
          errs.branches = 'يجب تحديد فرع مشارك معتمد واحد على الأقل.';
        }

        if (!draft.startsAt) {
          errs.startsAt = 'يرجى تحديد تاريخ بداية سريان العرض.';
        } else if (!isValidOfferDateValue(draft.startsAt)) {
          errs.startsAt = 'تاريخ البداية غير صالح. استخدم YYYY-MM-DD.';
        }

        if (!draft.endsAt) {
          errs.endsAt = 'يرجى تحديد تاريخ نهاية سريان العرض.';
        } else if (!isValidOfferDateValue(draft.endsAt)) {
          errs.endsAt = 'تاريخ النهاية غير صالح. استخدم YYYY-MM-DD.';
        } else if (isValidOfferDateValue(draft.startsAt)) {
          const start = Date.parse(offerDateTimestamp(draft.startsAt, false)!);
          const end = Date.parse(offerDateTimestamp(draft.endsAt, true)!);
          if (end <= start) {
            errs.endsAt = 'تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية.';
          }
        }
      }

      if (step === 4 || step === 5) {
        if (isEvidenceRequired) {
          if (!draft.evidenceFile || !draft.evidenceFile.isUploaded) {
            errs.evidence = 'يتطلب وجود سعر مرجعي أو تصفية إرفاق مستند إثبات معتمد.';
          }
        }
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [draft, isEvidenceRequired]
  );

  const canProceed = useCallback(
    (step: 1 | 2 | 3 | 4): boolean => {
      if (step === 1) {
        return Boolean(draft.title.trim() && draft.description.trim() && draft.offerKind && draft.categoryId);
      }
      if (step === 2) {
        const finalNum = Number(draft.finalPrice);
        const validFinal = Boolean(draft.finalPrice.trim() && !isNaN(finalNum) && finalNum > 0);
        const validOrig = !draft.originalPrice.trim() || Number(draft.originalPrice) >= finalNum;
        return validFinal && validOrig && Boolean(draft.terms.trim());
      }
      if (step === 3) {
        return Boolean(
          draft.selectedBranchIds.length > 0 &&
          isValidOfferDateValue(draft.startsAt) &&
          isValidOfferDateValue(draft.endsAt) &&
          Date.parse(offerDateTimestamp(draft.endsAt, true)!) >
            Date.parse(offerDateTimestamp(draft.startsAt, false)!)
        );
      }
      if (step === 4) {
        if (!isEvidenceRequired) return true;
        return Boolean(draft.evidenceFile && draft.evidenceFile.isUploaded);
      }
      return true;
    },
    [draft, isEvidenceRequired]
  );

  // Save Draft Action
  const persistDraft = useCallback(async (): Promise<string | null> => {
    if (isSyntheticPreview) {
      setIsDirty(false);
      setActionFeedback('تم حفظ المسودة بنجاح (معاينة تجريبية).');
      return currentOfferId || 'dev-synthetic-offer-preview';
    }

    if (!draftBusinessId || businessConflict) {
      setActionFeedback('يرجى تأكيد النشاط التجاري المرتبط بهذه المسودة أولاً.');
      return null;
    }
    // Empty dates are allowed in draft. Partially typed or impossible dates
    // must be rejected rather than silently lost when serializing to Postgres.
    if ((draft.startsAt && !isValidOfferDateValue(draft.startsAt)) ||
        (draft.endsAt && !isValidOfferDateValue(draft.endsAt))) {
      setActionFeedback('تحقق من صحة تواريخ العرض قبل حفظ المسودة (YYYY-MM-DD).');
      return null;
    }

    if (draft.evidenceFile && !draft.evidenceFile.isUploaded) {
      setActionFeedback('تعذّر تأكيد المستند. أعد رفعه أو أزله صراحةً قبل الحفظ.');
      return null;
    }
    try {
      let targetOfferId = confirmedOfferId.current;

      // 1. Create offer if this is a fresh draft
      if (!targetOfferId) {
        draftRequestId.current ??= randomUUID();
        targetOfferId = await createOfferMutation.mutateAsync({ businessId: draftBusinessId, requestId:draftRequestId.current });
        confirmedOfferId.current = targetOfferId;
        setCurrentOfferId(targetOfferId);
      }

      // 2. Prepare payload
      const finalPriceNum = draft.finalPrice.trim() ? Number(draft.finalPrice) : null;
      const origPriceNum = draft.originalPrice.trim() ? Number(draft.originalPrice) : null;

      const payload: OfferDraftPayload = {
        title: draft.title.trim() || null,
        description: draft.description.trim() || null,
        offer_kind: draft.offerKind,
        category_id: draft.categoryId || null,
        is_clearance: draft.isClearance,
        merchant_available_requested: draft.merchantAvailable,
        final_price: finalPriceNum,
        original_price: origPriceNum,
        currency: draft.currency || 'YER',
        terms: draft.terms.trim() || null,
        mandatory_fees: draft.mandatoryFees.trim() || null,
        benefit_details: draft.benefitType,
        stock_or_condition_notice: draft.quantityOrTimeNotice.trim() || null,
        starts_at: offerDateTimestamp(draft.startsAt, false),
        ends_at: offerDateTimestamp(draft.endsAt, true),
        items: [
          {
            item_type: draft.offerKind === 'service' ? 'service' : 'product',
            name: draft.title.trim() || 'بند العرض الأساسي',
            description: draft.description.trim() || null,
            quantity: 1,
            unit: 'piece',
            reference_value: origPriceNum,
          },
        ],
        branches: draft.selectedBranchIds.length > 0 ? draft.selectedBranchIds : [],
      };

      // 3. Persist even incomplete drafts. The database accepts zero branches
      // for drafts; submission still requires at least one approved branch.
      const savedVersion=await saveDraftMutation.mutateAsync({ offerId: targetOfferId, payload });
      confirmedVersionId.current=savedVersion;
      setSavedVersionId(savedVersion);

      // 4. Persist both attachments and explicit removal. Never report a
      // successful draft save when private evidence persistence fails.
      await saveEvidenceMutation.mutateAsync({
        offerId: targetOfferId,
        documents: draft.evidenceFile?.isUploaded && draft.evidenceFile.storageKey
          ? [{
              storageKey: draft.evidenceFile.storageKey,
              name: draft.evidenceFile.name,
              size: draft.evidenceFile.size,
              mimeType: draft.evidenceFile.mimeType,
              isPrimaryRequirement: true,
            }]
          : [],
      });

      setIsDirty(false);
      setActionFeedback('تم حفظ المسودة بنجاح.');
      return targetOfferId;
    } catch (err: any) {
      setActionFeedback(err?.message || 'تعذر حفظ المسودة.');
      return null;
    }
  }, [
    isSyntheticPreview,
    draftBusinessId,
    currentOfferId,
    draft,
    createOfferMutation,
    saveDraftMutation,
    saveEvidenceMutation,
    businessConflict,
  ]);

  const prepareOfferMediaUpload=useCallback(async()=>{
    if(isSyntheticPreview||!draftBusinessId||businessConflict||!beginOperation('upload'))return null;
    try{
      const saved=await persistDraft();
      if(saved&&confirmedVersionId.current)return {businessId:draftBusinessId,versionId:confirmedVersionId.current};
    }catch{/* persistDraft already reports failure */}
    finishOperation('upload');
    return null;
  },[isSyntheticPreview,draftBusinessId,businessConflict,beginOperation,finishOperation,persistDraft]);

  const saveDraft = useCallback(async (): Promise<string | null> => {
    if (!beginOperation('save')) return null;
    try { return await persistDraft(); }
    finally { finishOperation('save'); }
  }, [beginOperation,finishOperation,persistDraft]);

  // Submit Offer Action
  const submitOfferForReview = useCallback(async (): Promise<string | null> => {
    if (!beginOperation('submit')) return null;
    try {
    // Full validation before submit
    if (!validateStep(5)) {
      setActionFeedback('يرجى تصحيح الأخطاء الواردة في الأقسام قبل الإرسال.');
      return null;
    }

    if (isSyntheticPreview) {
      setIsDirty(false);
      setActionFeedback('تم إرسال العرض للمراجعة بنجاح (معاينة تجريبية).');
      return currentOfferId || 'dev-synthetic-offer-preview';
    }

    try {
      // 1. First ensure latest draft state is saved
      const savedOfferId = await persistDraft();
      if (!savedOfferId) throw new Error('تعذر إكمال حفظ بيانات العرض قبل الإرسال.');

      // 2. Submit to administration review
      await submitOfferMutation.mutateAsync(savedOfferId);
      setIsDirty(false);
      setActionFeedback('تم إرسال العرض للمراجعة بنجاح.');
      return savedOfferId;
    } catch (err: any) {
      setActionFeedback(err?.message || 'تعذر إرسال العرض للمراجعة.');
      return null;
    }
    } finally { finishOperation('submit'); }
  }, [validateStep, isSyntheticPreview, currentOfferId, persistDraft, submitOfferMutation,beginOperation,finishOperation]);

  const value = useMemo<OfferEditorContextValue>(
    () => ({
      businessId: draftBusinessId,
      offerId: currentOfferId,
      versionId:effectiveVersionId,
      media:versionDetails?.version.id===effectiveVersionId?versionDetails.media:[],
      prepareOfferMediaUpload,
      isNewOffer: !currentOfferId,
      isSyntheticPreview,
      draft,
      updateDraft,
      errors,
      validateStep,
      canProceed,
      isEvidenceRequired,
      isDirty,
      isSaving: operation !== null || createOfferMutation.isPending || saveDraftMutation.isPending || saveEvidenceMutation.isPending,
      isSubmitting: operation === 'submit' || submitOfferMutation.isPending,
      isUploadingEvidence: operation === 'upload',
      beginEvidenceUpload,
      endEvidenceUpload,
      actionFeedback,
      clearFeedback: () => setActionFeedback(null),
      saveDraft,
      submitOfferForReview,
      businessConflict,
      resolveBusinessConflict,
      draftBusinessName: businessDetail?.name || activeBusiness?.name || 'النشاط التجاري الحالي',
    }),
    [
      draftBusinessId,
      currentOfferId,
      effectiveVersionId,
      versionDetails,
      prepareOfferMediaUpload,
      isSyntheticPreview,
      draft,
      updateDraft,
      errors,
      validateStep,
      canProceed,
      isEvidenceRequired,
      isDirty,
      operation,
      beginEvidenceUpload,
      endEvidenceUpload,
      createOfferMutation.isPending,
      saveDraftMutation.isPending,
      saveEvidenceMutation.isPending,
      submitOfferMutation.isPending,
      actionFeedback,
      saveDraft,
      submitOfferForReview,
      businessConflict,
      resolveBusinessConflict,
      businessDetail?.name,
      activeBusiness?.name,
    ]
  );

  return <OfferEditorContext.Provider value={value}>{children}</OfferEditorContext.Provider>;
}

export function useOfferEditor(): OfferEditorContextValue {
  const ctx = useContext(OfferEditorContext);
  if (!ctx) {
    throw new Error('useOfferEditor must be used within an OfferEditorProvider.');
  }
  return ctx;
}
