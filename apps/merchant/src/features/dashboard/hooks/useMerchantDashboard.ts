import { useEffect, useMemo, useState } from 'react';
import {
  useBusiness,
  useBusinessBilling,
  useBusinessOffers,
  useBusinessOfferVersions,
  useMerchantComplaintCounts,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { formatArabicDate } from '../../business/hooks/useBusinessQualificationStatus';
import { isSubscriptionInForce } from '../../subscription/subscription-time';
import { resolveMerchantOfferStatus } from '../../offers/merchant-offer-status';

export function useMerchantDashboard() {
  const { activeBusiness, activeBusinessId, isSyntheticPreview, isOwner } = useActiveBusiness();
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimestamp(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Real Queries
  const { data: businessData, isLoading: isBusinessLoading, error: businessError, refetch: refetchBusiness } = useBusiness(
    isSyntheticPreview ? null : activeBusinessId
  );
  const { data: billingData, isLoading: isBillingLoading, error: billingError, refetch: refetchBilling } = useBusinessBilling(
    isSyntheticPreview || !isOwner ? null : activeBusinessId
  );
  const { data: offersData = [], isLoading: isOffersLoading, error: offersError, refetch: refetchOffers } = useBusinessOffers(
    isSyntheticPreview ? null : activeBusinessId
  );
  const { data: complaintsData, isLoading: isComplaintsLoading, error: complaintsError, refetch: refetchComplaints } = useMerchantComplaintCounts(
    isSyntheticPreview ? null : activeBusinessId
  );

  const { data: offerVersions = [], isLoading: versionsLoading, error: versionsError, refetch: refetchVersions } =
    useBusinessOfferVersions(isSyntheticPreview ? [] : offersData);

  // Business qualification status
  const isQualificationApproved = useMemo(() => {
    if (isSyntheticPreview) return true;
    return businessData?.status === 'approved';
  }, [isSyntheticPreview, businessData]);

  // Optional sources never block the authorized core dashboard.
  const billingAvailable = isSyntheticPreview || (isOwner && !isBillingLoading && !billingError && !!billingData);
  // Server aggregate uses the same owner/branch-monitor scope without pagination.
  const complaintsAvailable = isSyntheticPreview || (!isComplaintsLoading && !complaintsError && !!complaintsData);

  // Subscription status
  const subscriptionSummary = useMemo(() => {
    if (isSyntheticPreview) {
      return {
        isActive: true,
        kindText: 'الاشتراك تجريبي',
        planName: 'الفترة التجريبية',
        daysRemaining: 7,
        endsAtText: '28 نوفمبر 2026',
        progressPercentage: 75,
      };
    }

    if (!billingAvailable) {
      return { isActive: false, kindText: 'الاشتراك غير متاح', planName: 'بيانات الاشتراك غير متاحة',
        daysRemaining: 0, endsAtText: '—', progressPercentage: 0 };
    }
    const subs = billingData?.subscriptions ?? [];
    const activeSub = subs.find((s) => isSubscriptionInForce(s,currentTimestamp));
    if (!activeSub) {
      return {
        isActive: false,
        kindText: 'غير نشط',
        planName: 'لا يوجد اشتراك نشط',
        daysRemaining: 0,
        endsAtText: '—',
        progressPercentage: 0,
      };
    }

    const isTrial = activeSub.kind === 'trial';
    const now = currentTimestamp;
    const ends = activeSub.ends_at ? new Date(activeSub.ends_at).getTime() : now;
    const diffDays = Math.max(0, Math.ceil((ends - now) / (1000 * 60 * 60 * 24)));

    return {
      isActive: true,
      kindText: isTrial ? 'الاشتراك تجريبي' : 'الاشتراك نشط',
      planName: isTrial ? 'الفترة التجريبية' : 'باقة الأعمال',
      daysRemaining: diffDays,
      endsAtText: formatArabicDate(activeSub.ends_at),
      progressPercentage: isTrial ? Math.min(100, Math.round(((30 - diffDays) / 30) * 100)) : 100,
    };
  }, [isSyntheticPreview, billingAvailable, billingData, currentTimestamp]);

  // Offer Metrics
  const offerMetrics = useMemo(() => {
    if (isSyntheticPreview) {
      return {
        visibleCount: 14,
        pendingCount: 2,
        draftCount: 4,
        totalCount: 20,
      };
    }

    const visibleCount = offersData.filter(o => resolveMerchantOfferStatus(o,offerVersions.find(v=>v.id===o.current_version_id),undefined,currentTimestamp)==='visible').length;
    const pendingCount = offersData.filter((o) => o.status === 'pending').length;
    const draftCount = offersData.filter((o) => o.status === 'draft').length;
    const totalCount = offersData.length;

    return {
      visibleCount,
      pendingCount,
      draftCount,
      totalCount,
    };
  }, [isSyntheticPreview, offersData, offerVersions,currentTimestamp]);

  // Complaint Metrics
  const complaintMetrics = useMemo(() => {
    if (isSyntheticPreview) {
      return {
        totalCount: 3,
        openCount: 2,
        closedCount: 1,
      };
    }

    return complaintsData ?? {totalCount:0,openCount:0,closedCount:0};
  }, [isSyntheticPreview, complaintsData]);

  // Inquiries Metrics (distinguish synthetic preview from truthful production telemetry)
  const inquiriesMetrics = useMemo(() => {
    if (isSyntheticPreview) {
      return {
        count: 27,
        trendText: '8% ↗',
        isAvailable: true,
      };
    }
    return {
      count: 0,
      trendText: '—',
      isAvailable: false,
    };
  }, [isSyntheticPreview]);

  // Attention Items (real draft/pending offers in production, fixtures only in preview)
  const attentionOffers = useMemo(() => {
    if (isSyntheticPreview) {
      return [
        {
          id: 'mock-1',
          title: 'فحص وصيانة أجهزة الحاسوب',
          subtitle: 'مسودة عرض لم تُرسل للمراجعة بعد',
          actionText: 'استكمال',
        },
        {
          id: 'mock-2',
          title: 'شاحن أصلي — نسخة مراجعة',
          subtitle: 'مطلوب استكمال مستندات العرض',
          actionText: 'مراجعة',
        },
      ];
    }
    return offersData
      .filter((o) => o.status === 'draft' || o.status === 'pending')
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        title: (offerVersions.find((v) => v.id === o.current_version_id)
          ?? offerVersions.find((v) => v.offer_id === o.id))?.title || 'عرض دون عنوان',
        subtitle: o.status === 'draft' ? 'مسودة عرض لم تُرسل للمراجعة بعد' : 'قيد مراجعة الإدارة',
        actionText: o.status === 'draft' ? 'استكمال' : 'متابعة',
      }));
  }, [isSyntheticPreview, offersData, offerVersions]);

  const isLoading =
    !isSyntheticPreview &&
    (isBusinessLoading || isOffersLoading || versionsLoading);

  return {
    activeBusiness,
    activeBusinessId,
    isQualificationApproved,
    subscriptionSummary,
    billingAvailable,
    publicationEntitlement: isSyntheticPreview ? true : billingAvailable ? billingData?.has_publication_entitlement ?? null : null,
    complaintsAvailable,
    isOwner,
    offerMetrics,
    complaintMetrics,
    inquiriesMetrics,
    attentionOffers,
    isLoading,
    hasError: Boolean(!isSyntheticPreview && (businessError || offersError || versionsError)),
    refetch: () => {
      if (isSyntheticPreview || !activeBusinessId) return;
      void Promise.all([refetchBusiness(), refetchOffers(), refetchComplaints(), refetchVersions(),
        ...(isOwner ? [refetchBilling()] : [])]);
    },
    isSyntheticPreview,
  };
}
