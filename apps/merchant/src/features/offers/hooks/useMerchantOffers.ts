import { useState, useMemo, useCallback } from 'react';
import { useBusinessOffers, useSetOfferAvailability } from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import {
  type MerchantOfferItem,
  type OfferCardStatus,
} from '../components/MerchantOfferCard';

export type OfferFilterStatus = 'all' | 'visible' | 'pending' | 'draft' | 'expired' | 'needs_changes';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<OfferFilterStatus>('all');
  const [sortOption, setSortOption] = useState<OfferSortOption>('newest');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Raw Offer Items
  const allOffers: MerchantOfferItem[] = useMemo(() => {
    if (isSyntheticPreview) {
      return PREVIEW_OFFERS_FIXTURE;
    }

    return serverOffers.map((offer, idx) => {
      let cardStatus: OfferCardStatus = 'draft';
      if (offer.status === 'active') {
        cardStatus = offer.merchant_available ? 'visible' : 'paused';
      } else if (offer.status === 'paused') {
        cardStatus = 'paused';
      } else if (offer.status === 'pending') {
        cardStatus = 'pending';
      } else if (offer.status === 'closed') {
        cardStatus = 'expired';
      }

      return {
        id: offer.id,
        code: `OF-${101 + idx}`,
        title: `عرض تجاري #${idx + 1}`,
        category: 'عام',
        status: cardStatus,
        finalPrice: '15,000',
        originalPrice: null,
        currency: 'ر.ي',
        metaText: `تاريخ التحديث: ${new Date(offer.updated_at).toLocaleDateString('ar-YE')}`,
        footerNote: cardStatus === 'visible' ? 'ظاهر للعملاء' : 'غير منشور',
        iconType: 'general',
      };
    });
  }, [isSyntheticPreview, serverOffers]);

  // Counts
  const counts = useMemo(() => {
    if (isSyntheticPreview) {
      return {
        all: 20,
        visible: 9,
        pending: 4,
        draft: 4,
        expired: 2,
        needs_changes: 1,
      };
    }

    const visible = allOffers.filter((o) => o.status === 'visible').length;
    const pending = allOffers.filter((o) => o.status === 'pending').length;
    const draft = allOffers.filter((o) => o.status === 'draft').length;
    const expired = allOffers.filter((o) => o.status === 'expired').length;
    const needs_changes = allOffers.filter((o) => o.status === 'needs_changes').length;

    return {
      all: allOffers.length,
      visible,
      pending,
      draft,
      expired,
      needs_changes,
    };
  }, [isSyntheticPreview, allOffers]);

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
      const priceA = parseFloat(a.finalPrice.replace(/,/g, '')) || 0;
      const priceB = parseFloat(b.finalPrice.replace(/,/g, '')) || 0;
      if (sortOption === 'price_desc') return priceB - priceA;
      if (sortOption === 'price_asc') return priceA - priceB;
      return 0; // default newest
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
    isLoading: !isSyntheticPreview && isServerLoading,
    hasError: Boolean(!isSyntheticPreview && serverError),
    refetch,
    isSyntheticPreview,
  };
}
