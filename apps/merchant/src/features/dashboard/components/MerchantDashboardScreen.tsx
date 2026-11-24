import React from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
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
    billingAvailable,
    complaintsAvailable,
    isOwner,
    offerMetrics,
    complaintMetrics,
    inquiriesMetrics,
    attentionOffers,
    isLoading,
    hasError,
    refetch,
    isSyntheticPreview,
  } = useMerchantDashboard();

  return (
    <MerchantScaffold
      currentTab="home"
      title="لوحة التاجر"
      subtitle="نظرة شاملة على أداء نشاطك وعروضك"
      initialBusinessId={activeBusinessId}
    >
      {!activeBusinessId && !isSyntheticPreview ? (
        <View className="rounded-2xl border border-border p-6 items-center">
          <AppText variant="label">لا يوجد نشاط تجاري مرتبط بالحساب. أنشئ نشاطًا أولًا.</AppText>
        </View>
      ) : isLoading ? (
        <View className="p-8 items-center gap-3">
          <ActivityIndicator size="large" />
          <AppText variant="caption" muted>جارٍ تحميل لوحة التاجر...</AppText>
        </View>
      ) : hasError ? (
        <View className="rounded-2xl border border-border p-6 items-center gap-3">
          <AppText variant="label">تعذر تحميل بعض بيانات النشاط. أعد المحاولة.</AppText>
          <Pressable accessibilityRole="button" onPress={refetch} className="min-h-12 px-5 rounded-xl items-center justify-center"
            style={{ backgroundColor: '#FACC15' }}>
            <AppText style={{ color: '#0F172D' }}>إعادة المحاولة</AppText>
          </Pressable>
        </View>
      ) : (
        <>
      {/* 1. Authoritative Dashboard Mascot Hero Banner */}
      <DashboardBanner />

      {/* 2. Business Eligibility Banner */}
      <DashboardEligibilityBanner
        isQualificationApproved={isQualificationApproved}
        isSubscriptionActive={subscriptionSummary.isActive}
        isSubscriptionKnown={billingAvailable}
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
        hasComplaintsTelemetry={complaintsAvailable}
        complaintsCount={complaintMetrics.totalCount}
        openComplaintsCount={complaintMetrics.openCount}
        closedComplaintsCount={complaintMetrics.closedCount}
        isSyntheticPreview={isSyntheticPreview}
      />

      {/* 4. Needs Attention Section */}
      <NeedsAttentionSection items={attentionOffers} />

      {/* 5. Subscription Summary Card */}
      {isOwner && billingAvailable ? <SubscriptionCard
        planName={subscriptionSummary.planName}
        daysRemaining={subscriptionSummary.daysRemaining}
        endsAtText={subscriptionSummary.endsAtText}
        progressPercentage={subscriptionSummary.progressPercentage}
      /> : isOwner ? <View className="rounded-2xl border border-border p-4 gap-2">
        <AppText variant="label">بيانات الاشتراك غير متاحة حاليًا</AppText>
        <AppText variant="caption" muted>لا يمكن تأكيد حالة الاشتراك من المصدر.</AppText>
      </View> : null}

      {/* 6. Quick Actions Section */}
      <QuickActionsSection />

      {/* Real-data dashboard: show unavailable metrics explicitly rather than fabricated values. */}
        </>
      )}
    </MerchantScaffold>
  );
}
