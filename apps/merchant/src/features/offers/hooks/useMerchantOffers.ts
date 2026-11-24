import { useState, useMemo, useCallback, useEffect } from 'react';
import { useBusinessOffers, useBusinessOfferVersions, useSetOfferAvailability } from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import {
  type MerchantOfferItem,
  type OfferCardStatus,
} from '../components/MerchantOfferCard';
import { resolveMerchantOfferStatus } from '../merchant-offer-status';

export type OfferFilterStatus = 'all' | OfferCardStatus;
export type OfferSortOption = 'newest' | 'price_desc' | 'price_asc';

export const PREVIEW_OFFERS_FIXTURE: MerchantOfferItem[] = [
  {
    id: 'preview-of-101',
    code: 'OF-101',
    title: 'سماعات لاسلكية بضمان المحل',
    category: 'إلكترونيات',
    status: 'visible',
    finalPrice: '14,500',
    originalPrice: '22,000',
    currency: 'ر.ي',
    metaText: 'ينتهي في 10 ديسمبر 2026',
    footerNote: '1,240 مشاهدة',
    viewsCount: 1240,
    iconType: 'headphones',
  },
  {
    id: 'preview-of-102',
    code: 'OF-102',
    title: 'خصم 30% على الأجهزة الذكية',
    category: 'إلكترونيات',
    status: 'pending',
    finalPrice: '39,900',
    originalPrice: null,
    currency: 'ر.ي',
    metaText: 'أرسل للمراجعة: 12 نوفمبر 2026',
    footerNote: 'في انتظار القرار',
    iconType: 'phone',
  },
  {
    id: 'preview-of-103',
    code: 'OF-103',
    title: 'عرض خاص على الأحذية الرياضية',
    category: 'ملابس وأحذية',
    status: 'needs_changes',
    finalPrice: '16,900',
    originalPrice: null,
    currency: 'ر.ي',
    metaText: 'ملاحظتا مراجعة متاحتان',
    footerNote: 'إجراء مطلوب',
    iconType: 'shoes',
  },
  {
    id: 'preview-of-104',
    code: 'OF-104',
    title: 'باقة الأدوات المنزلية المميزة',
    category: 'مستلزمات منزلية',
    status: 'draft',
    finalPrice: '8,900',
    originalPrice: null,
    currency: 'ر.ي',
    metaText: 'آخر تعديل: 9 نوفمبر 2026',
    footerNote: 'غير منشور',
    iconType: 'bag',
  },
];

export function useMerchantOffers() {
  const { activeBusinessId, isSyntheticPreview } = useActiveBusiness();

  const {
    data: serverOffers = [],
    isLoading: isServerLoading,
    error: serverError,
    refetch,
  } = useBusinessOffers(isSyntheticPreview ? null : activeBusinessId);

  const setAvailabilityMutation = useSetOfferAvailability();
  const {
    data: serverVersions = [],
    isLoading: isVersionsLoading,
    error: versionsError,
  } = useBusinessOfferVersions(isSyntheticPreview ? [] : serverOffers);

  const [now,setNow] = useState(Date.now);
  useEffect(() => { const timer=setInterval(() => setNow(Date.now()),1000); return () => clearInterval(timer); },[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<OfferFilterStatus>('all');
  const [sortOption, setSortOption] = useState<OfferSortOption>('newest');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Raw Offer Items
  const allOffers: MerchantOfferItem[] = useMemo(() => {
    if (isSyntheticPreview) {
      return PREVIEW_OFFERS_FIXTURE;
    }

    return serverOffers.map((offer) => {
      const versions = serverVersions.filter((version) => version.offer_id === offer.id);
      const version = versions.find((v) => v.id === offer.current_version_id) ?? versions[0];
      const latestReview = versions[0]?.review_status;
      const cardStatus = resolveMerchantOfferStatus(offer,
        versions.find(v=>v.id===offer.current_version_id),latestReview,now);
      const kind = version?.offer_kind;
      const category = kind === 'product' ? 'منتج'
        : kind === 'service' ? 'خدمة'
        : kind === 'bundle' ? 'باقة'
        : kind === 'clearance' ? 'تصفية' : 'غير محدد';
      const moneyText = (value: string | number | null | undefined): string =>
        value === null || value === undefined ? '—' : String(value);
      return {
        id: offer.id,
        code: `ID-${offer.id.slice(0, 8).toUpperCase()}`,
        title: version?.title?.trim() || 'عرض دون عنوان',
        category,
        status: cardStatus,
        finalPrice: moneyText(version?.final_price),
        originalPrice: version?.original_price == null ? null : moneyText(version.original_price),
        currency: version?.currency || '',
        metaText: version?.ends_at
          ? `ينتهي في ${new Date(version.ends_at).toLocaleDateString('ar-YE')}`
          : `آخر تحديث: ${new Date(offer.updated_at).toLocaleDateString('ar-YE')}`,
        footerNote: cardStatus === 'visible' ? 'مفعّل، ويعتمد ظهوره على الأهلية'
          : cardStatus === 'paused' ? 'متوقف مؤقتًا'
          : cardStatus === 'pending' ? 'بانتظار قرار الإدارة'
          : cardStatus === 'needs_changes' ? 'مطلوب تعديل'
          : cardStatus === 'scheduled' ? 'لم يبدأ سريان العرض بعد'
          : cardStatus === 'unavailable' ? 'تعذّر تأكيد النسخة المعتمدة والمدة'
          : 'غير ظاهر للعملاء',
        iconType: 'general' as const,
        updatedAt: offer.updated_at,
      };
    });
  }, [isSyntheticPreview, serverOffers, serverVersions,now]);

  // Counts
  const counts = useMemo(() => {
    const visible = allOffers.filter((o) => o.status === 'visible').length;
    const paused = allOffers.filter((o) => o.status === 'paused').length;
    const pending = allOffers.filter((o) => o.status === 'pending').length;
    const draft = allOffers.filter((o) => o.status === 'draft').length;
    const expired = allOffers.filter((o) => o.status === 'expired').length;
    const needs_changes = allOffers.filter((o) => o.status === 'needs_changes').length;

    return {
      all: allOffers.length,
      visible,
      paused,
      pending,
      draft,
      expired,
      needs_changes,
      scheduled: allOffers.filter(o=>o.status==='scheduled').length,
      unavailable: allOffers.filter(o=>o.status==='unavailable').length,
    };
  }, [allOffers]);

  // Filtered & Sorted Offers
  const filteredOffers = useMemo(() => {
    let result = [...allOffers];

    // Status filter
    if (selectedFilter !== 'all') {
      result = result.filter((item) => item.status === selectedFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const priceA = a.finalPrice === '—' ? null : Number(a.finalPrice.replace(/,/g, ''));
      const priceB = b.finalPrice === '—' ? null : Number(b.finalPrice.replace(/,/g, ''));
      if (sortOption !== 'newest' && priceA === null) return 1;
      if (sortOption !== 'newest' && priceB === null) return -1;
      if (sortOption === 'price_desc') return (priceB ?? 0) - (priceA ?? 0);
      if (sortOption === 'price_asc') return (priceA ?? 0) - (priceB ?? 0);
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });

    return result;
  }, [allOffers, selectedFilter, searchQuery, sortOption]);

  // Toggle Availability (wired to real RPC: wow_set_offer_availability)
  const toggleOfferAvailability = useCallback(
    async (offer: MerchantOfferItem) => {
      if (isSyntheticPreview) {
        setActionFeedback(`تم تحديث حالة العرض "${offer.title}".`);
        return;
      }

      // Enforce DB business rule: only approved (active/paused) offers can be paused or resumed
      if (offer.status !== 'visible' && offer.status !== 'paused') {
        setActionFeedback('لا يمكن تفعيل أو إيقاف العرض إلا بعد اعتماده من الإدارة.');
        return;
      }

      try {
        const isCurrentlyAvailable = offer.status === 'visible';
        await setAvailabilityMutation.mutateAsync({
          offerId: offer.id,
          available: !isCurrentlyAvailable,
          paused: isCurrentlyAvailable,
        });
        setActionFeedback(`تم ${isCurrentlyAvailable ? 'إيقاف' : 'تفعيل'} العرض بنجاح.`);
      } catch (err: any) {
        setActionFeedback(err?.message || 'تعذر تغيير حالة العرض.');
      }
    },
    [isSyntheticPreview, setAvailabilityMutation]
  );

  return {
    offers: filteredOffers,
    counts,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    sortOption,
    setSortOption,
    actionFeedback,
    clearFeedback: () => setActionFeedback(null),
    toggleOfferAvailability,
    isLoading: !isSyntheticPreview && (isServerLoading || (serverOffers.length > 0 && isVersionsLoading)),
    hasError: Boolean(!isSyntheticPreview && (serverError || versionsError)),
    refetch,
    isSyntheticPreview,
  };
}
