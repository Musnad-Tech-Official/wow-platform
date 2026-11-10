import { useEffect, useMemo, useState } from 'react';
import {
  useBusiness,
  useBusinessBilling,
  useBusinessOffers,
  useBusinessComplaints,
  type MerchantComplaintSummary,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { formatArabicDate } from '../../business/hooks/useBusinessQualificationStatus';

export function useMerchantDashboard() {
  const { activeBusiness, activeBusinessId, isSyntheticPreview } = useActiveBusiness();
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimestamp(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Real Queries
  const { data: businessData, isLoading: isBusinessLoading } = useBusiness(
    isSyntheticPreview ? null : activeBusinessId
  );
  const { data: billingData, isLoading: isBillingLoading } = useBusinessBilling(
    isSyntheticPreview ? null : activeBusinessId
  );
  const { data: offersData = [], isLoading: isOffersLoading } = useBusinessOffers(
    isSyntheticPreview ? null : activeBusinessId
  );
  const { data: complaintsData = [], isLoading: isComplaintsLoading } = useBusinessComplaints(
    isSyntheticPreview || !activeBusinessId ? null : { businessId: activeBusinessId }
  );

  // Business qualification status
  const isQualificationApproved = useMemo(() => {
    if (isSyntheticPreview) return true;
    return businessData?.status === 'approved';
  }, [isSyntheticPreview, businessData]);

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

    const subs = billingData?.subscriptions ?? [];
    const activeSub = subs.find((s) => s.status === 'active' &&
      (!s.ends_at || new Date(s.ends_at).getTime() > currentTimestamp));
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
  }, [isSyntheticPreview, billingData, currentTimestamp]);

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

    const visibleCount = offersData.filter((o) => o.status === 'active' && o.merchant_available).length;
    const pendingCount = offersData.filter((o) => o.status === 'pending').length;
    const draftCount = offersData.filter((o) => o.status === 'draft').length;
    const totalCount = offersData.length;

    return {
      visibleCount,
      pendingCount,
      draftCount,
      totalCount,
    };
  }, [isSyntheticPreview, offersData]);

  // Complaint Metrics
  const complaintMetrics = useMemo(() => {
    if (isSyntheticPreview) {
      return {
        totalCount: 3,
        openCount: 2,
        closedCount: 1,
      };
    }

    const totalCount = complaintsData.length;
    const openCount = complaintsData.filter(
      (c: MerchantComplaintSummary) => c.status === 'new' || c.status === 'investigating' || c.status === 'waiting'
    ).length;
    const closedCount = complaintsData.filter(
      (c: MerchantComplaintSummary) => c.status === 'closed'
    ).length;

    return {
      totalCount,
      openCount,
      closedCount,
    };
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
      .map((o, idx) => ({
        id: o.id,
        title: `عرض تجاري #${idx + 1}`,
        subtitle: o.status === 'draft' ? 'مسودة عرض لم تُرسل للمراجعة بعد' : 'قيد مراجعة الإدارة',
        actionText: o.status === 'draft' ? 'استكمال' : 'متابعة',
      }));
  }, [isSyntheticPreview, offersData]);

  const isLoading =
    !isSyntheticPreview &&
    (isBusinessLoading || isBillingLoading || isOffersLoading || isComplaintsLoading);

  return {
    activeBusiness,
    activeBusinessId,
    isQualificationApproved,
    subscriptionSummary,
    offerMetrics,
    complaintMetrics,
    inquiriesMetrics,
    attentionOffers,
    isLoading,
    isSyntheticPreview,
  };
}
