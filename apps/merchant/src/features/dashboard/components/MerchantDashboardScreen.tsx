import React from 'react';
import { View } from 'react-native';
import { AppText } from '@wow/ui';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { DashboardBanner } from './DashboardBanner';
import { DashboardEligibilityBanner } from './DashboardEligibilityBanner';
import { DashboardMetrics } from './DashboardMetrics';
import { NeedsAttentionSection } from './NeedsAttentionSection';
import { SubscriptionCard } from './SubscriptionCard';
import { QuickActionsSection } from './QuickActionsSection';
import { useMerchantDashboard } from '../hooks/useMerchantDashboard';

export function MerchantDashboardScreen() {
  const {
    activeBusinessId,
    isQualificationApproved,
    subscriptionSummary,
    offerMetrics,
    complaintMetrics,
    inquiriesMetrics,
    attentionOffers,
    isSyntheticPreview,
  } = useMerchantDashboard();

  return (
    <MerchantScaffold
      currentTab="home"
      title="لوحة التاجر"
      subtitle="نظرة شاملة على أداء نشاطك وعروضك"
      initialBusinessId={activeBusinessId}
    >
      {/* 1. Authoritative Dashboard Mascot Hero Banner */}
      <DashboardBanner />

      {/* 2. Business Eligibility Banner */}
      <DashboardEligibilityBanner
        isQualificationApproved={isQualificationApproved}
        isSubscriptionActive={subscriptionSummary.isActive}
        subscriptionKindText={subscriptionSummary.kindText}
      />

      {/* 3. Performance Overview Metrics */}
      <DashboardMetrics
        visibleOffersCount={offerMetrics.visibleCount}
        pendingOffersCount={offerMetrics.pendingCount}
        totalOffersCount={offerMetrics.totalCount}
        inquiriesCount={inquiriesMetrics.count}
        inquiriesTrend={inquiriesMetrics.trendText}
        hasInquiriesTelemetry={inquiriesMetrics.isAvailable}
        complaintsCount={complaintMetrics.totalCount}
        openComplaintsCount={complaintMetrics.openCount}
        closedComplaintsCount={complaintMetrics.closedCount}
        isSyntheticPreview={isSyntheticPreview}
      />

      {/* 4. Needs Attention Section */}
      <NeedsAttentionSection items={attentionOffers} />

      {/* 5. Subscription Summary Card */}
      <SubscriptionCard
        planName={subscriptionSummary.planName}
        daysRemaining={subscriptionSummary.daysRemaining}
        endsAtText={subscriptionSummary.endsAtText}
        progressPercentage={subscriptionSummary.progressPercentage}
      />

      {/* 6. Quick Actions Section */}
      <QuickActionsSection />

      {/* 7. Design System Review Footnote */}
      <View className="py-4 items-center">
        <AppText variant="caption" muted className="font-tajawal text-[11px] text-center">
          قيم ورسوم توضيحية لمراجعة التصميم، وتُستبدل ببيانات النشاط الفعلية.
        </AppText>
      </View>
    </MerchantScaffold>
  );
}
