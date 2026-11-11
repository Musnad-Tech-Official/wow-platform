import React, { useState, useMemo } from 'react';
import { View, Pressable, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit,
  Power,
} from 'lucide-react-native';
import { AppText, ToastBanner } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { wowIllustrations } from '@wow/assets';
import {
  useOfferVersions,
  useSetOfferAvailability,
  useBusinessBranches,
  useBusinessOffers,
  useOfferVersionDetails,
  usePublicCategories,
  type OfferVersion,
} from '@wow/api';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { PREVIEW_BRANCHES_FIXTURE } from './OfferBranchesScreen';

export const PREVIEW_DETAILS_VERSION_PUBLISHED: OfferVersion = {
  id: 'ver-published-uuid',
  business_id: 'dev-synthetic-business-uuid',
  offer_id: 'dev-synthetic-offer-preview',
  version_no: 1,
  title: 'سماعات لاسلكية مع ضمان المحل',
  description: 'سماعات بلوتوث عالية الجودة مع عزل الضوضاء وضمان استبدال مباشر لدى فروعنا المعتمدة.',
  offer_kind: 'product',
  original_price: '18000',
  final_price: '14500',
  currency: 'ريال يمني',
  benefit_details: 'تخفيض سعري',
  mandatory_fees: null,
  terms: 'حسب المواصفات المدرجة في العرض، لدى الفرع المشارك.',
  stock_or_condition_notice: 'الكميات محدودة حتى نفاد المخزون',
  starts_at: '2026-10-20T00:00:00.000Z',
  ends_at: '2026-11-25T23:59:59.000Z',
  review_status: 'approved',
  submitted_at: '2026-10-18T10:00:00.000Z',
  approved_at: '2026-10-19T14:30:00.000Z',
  created_at: '2026-10-18T09:00:00.000Z',
  updated_at: '2026-10-19T14:30:00.000Z',
};

export const PREVIEW_DETAILS_VERSION_PENDING: OfferVersion = {
  id: 'ver-pending-uuid',
  business_id: 'dev-synthetic-business-uuid',
  offer_id: 'dev-synthetic-offer-preview',
  version_no: 2,
  title: 'سماعات لاسلكية مع ضمان المحل (تعديل السعر)',
  description: 'تحديث المواصفات والسعر للموسم الجديد.',
  offer_kind: 'product',
  original_price: '19000',
  final_price: '14000',
  currency: 'ريال يمني',
  benefit_details: 'تخفيض سعري',
  mandatory_fees: null,
  terms: 'حسب الشروط المحدثة.',
  stock_or_condition_notice: null,
  starts_at: '2026-11-15T00:00:00.000Z',
  ends_at: '2026-12-31T23:59:59.000Z',
  review_status: 'pending',
  submitted_at: '2026-11-10T12:00:00.000Z',
  approved_at: null,
  created_at: '2026-11-10T11:00:00.000Z',
  updated_at: '2026-11-10T12:00:00.000Z',
};

export function OfferDetailsScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { activeBusinessId } = useActiveBusiness();
  const searchParams = useLocalSearchParams<{
    offerId?: string;
    businessId?: string;
    preview?: string;
    submitted?: string;
  }>();

  const isSyntheticPreview =
    __DEV__ &&
    (searchParams.preview === '1' ||
      (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const offerId = searchParams.offerId || null;
  const effectiveBusinessId = searchParams.businessId || activeBusinessId || null;

  const [selectedVersionTab, setSelectedVersionTab] = useState<'published' | 'pending'>(
    searchParams.submitted === '1' ? 'pending' : 'published'
  );
  const [feedback, setFeedback] = useState<string | null>(
    searchParams.submitted === '1' ? 'تم إرسال العرض بنجاح وهو الآن قيد مراجعة الإدارة.' : null
  );

  // Queries
  const { data: serverVersions = [] } = useOfferVersions(
    isSyntheticPreview ? null : offerId
  );
  const { data: serverBranches = [] } = useBusinessBranches(effectiveBusinessId);
  const { data: serverOffers = [] } = useBusinessOffers(isSyntheticPreview ? null : effectiveBusinessId);
  const { data: categories = [] } = usePublicCategories();
  const offer = serverOffers.find((item) => item.id === offerId) ?? null;

  const setAvailabilityMutation = useSetOfferAvailability();

  // Selected Version
  const versions = useMemo(() => {
    if (isSyntheticPreview) {
      if (searchParams.submitted === '1') {
        return [PREVIEW_DETAILS_VERSION_PENDING];
      }
      return [PREVIEW_DETAILS_VERSION_PENDING, PREVIEW_DETAILS_VERSION_PUBLISHED];
    }
    return serverVersions;
  }, [isSyntheticPreview, searchParams.submitted, serverVersions]);

  const publishedVersion = useMemo(
    () => versions.find((v) => v.review_status === 'approved') ?? null,
    [versions]
  );
  const pendingVersion = useMemo(
    () => versions.find((v) => v.review_status === 'pending' || v.review_status === 'draft') ?? null,
    [versions]
  );

  const activeVersion = useMemo(() => {
    if (selectedVersionTab === 'pending' && pendingVersion) return pendingVersion;
    if (publishedVersion) return publishedVersion;
    return versions[0] ?? null;
  }, [selectedVersionTab, pendingVersion, publishedVersion, versions]);

  const { data: activeVersionDetails } = useOfferVersionDetails(
    isSyntheticPreview ? null : activeVersion?.id
  );
  const branches = useMemo(() => isSyntheticPreview ? PREVIEW_BRANCHES_FIXTURE : serverBranches,
    [isSyntheticPreview, serverBranches]);
  const versionBranchIds = activeVersionDetails?.branches.map((branch) => branch.branch_id) ?? [];
  const participatingBranches = isSyntheticPreview
    ? PREVIEW_BRANCHES_FIXTURE.filter((branch) => branch.status === 'approved')
    : branches.filter((branch) => versionBranchIds.includes(branch.id));
  const branchName = participatingBranches.map((branch) => branch.name).join('، ') || '—';
  const categoryName = categories.find((category) => category.id === activeVersion?.category_id)?.name_ar || '—';

  // The server owns operational state; never invent an active offer locally.
  const isOfferActive = isSyntheticPreview
    ? true
    : offer?.status === 'active' && offer.merchant_available === true;
  const canToggleAvailability = isSyntheticPreview ||
    Boolean(offer && offer.current_version_id && ['active','paused'].includes(offer.status));

  // Authoritative Content Review Status
  const reviewStatus = (activeVersion?.review_status as string) || 'pending';

  const reviewStatusConfig = {
    approved: {
      label: 'معتمد',
      badgeBg: isDark ? '#064E3B' : '#ECFDF5',
      badgeColor: '#059669',
      icon: CheckCircle2,
    },
    pending: {
      label: 'قيد المراجعة',
      badgeBg: isDark ? '#422006' : '#FEF3C7',
      badgeColor: '#D97706',
      icon: Clock,
    },
    needs_changes: {
      label: 'يحتاج تعديل',
      badgeBg: isDark ? '#451B20' : '#FFF1F2',
      badgeColor: '#E11D48',
      icon: AlertTriangle,
    },
    rejected: {
      label: 'مرفوض',
      badgeBg: isDark ? '#451B20' : '#FFF1F2',
      badgeColor: '#E11D48',
      icon: XCircle,
    },
    draft: {
      label: 'مسودة',
      badgeBg: isDark ? '#1E293B' : '#EFF6FF',
      badgeColor: '#2563EB',
      icon: HelpCircle,
    },
  }[reviewStatus] || {
    label: 'قيد المراجعة',
    badgeBg: isDark ? '#422006' : '#FEF3C7',
    badgeColor: '#D97706',
    icon: Clock,
  };

  // Independent Public Visibility Status
  // Content review and customer visibility are strictly independent!
  const now = Date.now();
  const validWindow = Boolean(
    activeVersion?.starts_at && activeVersion.ends_at &&
    new Date(activeVersion.starts_at).getTime() <= now &&
    new Date(activeVersion.ends_at).getTime() > now
  );
  const hasApprovedBranch = isSyntheticPreview ||
    participatingBranches.some((branch) => branch.status === 'approved');
  const currentApprovedVersion = isSyntheticPreview ||
    (offer?.current_version_id != null && offer.current_version_id === activeVersion?.id);
  const isVisibleToCustomers =
    activeVersion?.review_status === 'approved' &&
    currentApprovedVersion && isOfferActive && validWindow && hasApprovedBranch;

  const visibilityReason = useMemo(() => {
    const status = activeVersion?.review_status;
    if (!activeVersion) return 'لا توجد بيانات عرض مؤكدة بعد.';
    if (status === 'pending') return 'هذه النسخة ما زالت قيد مراجعة الإدارة.';
    if (status === 'draft') return 'هذه النسخة مسودة غير مرسلة للمراجعة.';
    if (status === 'rejected') return 'هذه النسخة لم تعتمدها الإدارة.';
    if (!currentApprovedVersion) return 'هذه النسخة ليست الإصدار المعتمد حاليًا.';
    if (!isOfferActive) return 'العرض غير متاح حاليًا بحسب حالته الفعلية.';
    if (!validWindow) return 'المدة المحددة للعرض لم تبدأ بعد أو انتهت.';
    if (!hasApprovedBranch) return 'لا يوجد فرع مشارك معتمد لهذه النسخة.';
    return 'النسخة المعتمدة مؤهلة للظهور بحسب بيانات التوافر الحالية.';
  }, [activeVersion, currentApprovedVersion, isOfferActive, validWindow, hasApprovedBranch]);

  const handleToggleAvailability = async () => {
    if (!canToggleAvailability || !offerId) {
      setFeedback('لا يمكن تغيير التوافر في حالة العرض الحالية.');
      return;
    }
    try {
      const nextActive = !isOfferActive;
      if (!isSyntheticPreview) {
        await setAvailabilityMutation.mutateAsync({
          offerId,
          available: nextActive,
          paused: !nextActive,
        });
      }
      // React Query invalidates the merchant offer cache on success.
      setFeedback(nextActive ? 'تم استئناف توفر العرض للعملاء.' : 'تم إيقاف توفر العرض مؤقتاً.');
    } catch (err: any) {
      setFeedback(err?.message || 'تعذر تغيير حالة توفر العرض.');
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: '/offers/editor',
      params: {
        offerId,
        ...(effectiveBusinessId ? { businessId: effectiveBusinessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  return (
    <MerchantScaffold
      currentTab="offers"
      title="تفاصيل العرض وحالته"
      subtitle="WOW للتجار"
    >
      {feedback && (
        <View className="mb-3">
          <ToastBanner
            visible={Boolean(feedback)}
            tone="info"
            message={feedback}
            onDismiss={() => setFeedback(null)}
          />
        </View>
      )}

      {/* Hero Review Status Card with Magnifier Mascot */}
      <View
        className="w-full rounded-2xl border p-4 mb-4"
        style={{
          backgroundColor: isDark ? '#27272A' : '#FEFCE8',
          borderColor: isDark ? '#3F3F46' : '#FEF08A',
        }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 items-start gap-1.5">
            {/* Top Visibility Badge */}
            <View
              className="px-3 py-1 rounded-xl flex-row items-center gap-1.5 border"
              style={{
                backgroundColor: isVisibleToCustomers
                  ? '#FACC15'
                  : isDark
                  ? '#3F3F46'
                  : '#E2E8F0',
                borderColor: isVisibleToCustomers ? '#EAB308' : colors.border,
              }}
            >
              {isVisibleToCustomers ? (
                <Eye size={15} color="#0F172D" />
              ) : (
                <EyeOff size={15} color={isDark ? '#A1A1AA' : '#64748B'} />
              )}
              <AppText
                className="font-tajawal-bold text-xs"
                style={{
                  color: isVisibleToCustomers ? '#0F172D' : colors.foreground,
                }}
              >
                {isVisibleToCustomers ? 'ظاهر الآن' : 'مخفي حالياً'}
              </AppText>
            </View>

            <AppText
              variant="caption"
              className="font-tajawal-medium text-xs leading-5 text-right mt-1"
              style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
            >
              {visibilityReason}
            </AppText>
          </View>

          {/* Official Magnifier Review Mascot */}
          <Image
            source={wowIllustrations.merchant.offerDetailsReview}
            style={{ width: 92, height: 92 }}
            resizeMode="contain"
            accessibilityLabel="تميمة واو الرسمية لتدقيق وحالة مراجعة العرض"
          />
        </View>
      </View>

      {/* Offer Summary Header */}
      <View
        className="w-full rounded-2xl border p-4 gap-2 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View className="flex-row items-center justify-between">
          <AppText className="font-tajawal-bold text-lg" style={{ color: colors.primary }}>
            {activeVersion?.final_price || '—'} {activeVersion?.currency || 'ريال يمني'}
          </AppText>
          <AppText variant="caption" muted className="text-xs">
            {offerId ? offerId.slice(0, 8).toUpperCase() : '—'} • {categoryName}
          </AppText>
        </View>

        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          {activeVersion?.title || 'عنوان العرض'}
        </AppText>

        <AppText
          variant="caption"
          className="font-tajawal-medium text-xs leading-5 text-right"
          style={{ color: colors.foreground }}
        >
          {activeVersion?.description || 'لا يوجد وصف متاح لهذا العرض.'}
        </AppText>
      </View>

      {/* Section: Content Review vs Public Visibility */}
      <View
        className="w-full rounded-2xl border p-4 gap-3 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          مراجعة محتوى العرض
        </AppText>

        <View className="gap-2.5">
          <View className="flex-row items-center justify-between py-1.5 border-b border-border/50">
            <View
              className="px-2.5 py-1 rounded-lg flex-row items-center gap-1"
              style={{ backgroundColor: reviewStatusConfig.badgeBg }}
            >
              <AppText
                className="font-tajawal-bold text-xs"
                style={{ color: reviewStatusConfig.badgeColor }}
              >
                {reviewStatusConfig.label}
              </AppText>
            </View>
            <AppText variant="body" className="font-tajawal text-xs text-right">
              حالة مراجعة المحتوى
            </AppText>
          </View>

          <View className="flex-row items-center justify-between py-1.5">
            <View
              className="px-2.5 py-1 rounded-lg flex-row items-center gap-1"
              style={{
                backgroundColor: isVisibleToCustomers
                  ? isDark
                    ? '#064E3B'
                    : '#ECFDF5'
                  : isDark
                  ? '#3F3F46'
                  : '#F1F5F9',
              }}
            >
              <AppText
                className="font-tajawal-bold text-xs"
                style={{ color: isVisibleToCustomers ? '#059669' : colors.foreground }}
              >
                {isVisibleToCustomers ? 'ظاهر' : 'مخفي'}
              </AppText>
            </View>
            <AppText variant="body" className="font-tajawal text-xs text-right">
              ظهور النسخة المحددة
            </AppText>
          </View>
        </View>
      </View>

      {/* Section: Price & Schedule */}
      <View
        className="w-full rounded-2xl border p-4 gap-3 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          السعر والمدة
        </AppText>

        <View className="gap-2">
          <View className="flex-row items-center justify-between py-1 border-b border-border/40">
            <AppText className="font-tajawal-bold text-xs">
              {activeVersion?.final_price || '—'} {activeVersion?.currency || 'ر.ي'}
            </AppText>
            <AppText variant="caption" muted className="text-xs">
              السعر النهائي
            </AppText>
          </View>

          <View className="flex-row items-center justify-between py-1 border-b border-border/40">
            <AppText className="font-tajawal-bold text-xs">{branchName}</AppText>
            <AppText variant="caption" muted className="text-xs">
              الفرع
            </AppText>
          </View>

          <View className="flex-row items-center justify-between py-1 border-b border-border/40">
            <AppText className="font-tajawal-bold text-xs">
              {activeVersion?.starts_at ? activeVersion.starts_at.slice(0, 10) : '—'}
            </AppText>
            <AppText variant="caption" muted className="text-xs">
              البداية
            </AppText>
          </View>

          <View className="flex-row items-center justify-between py-1">
            <AppText className="font-tajawal-bold text-xs">
              {activeVersion?.ends_at ? activeVersion.ends_at.slice(0, 10) : '—'}
            </AppText>
            <AppText variant="caption" muted className="text-xs">
              النهاية
            </AppText>
          </View>

          <AppText variant="caption" muted className="text-right text-[11px] mt-1">
            {activeVersion?.terms || 'لم تُدرج شروط إضافية.'}
          </AppText>
        </View>
      </View>

      {/* Section: Offer Versions */}
      <View
        className="w-full rounded-2xl border p-4 gap-3 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          إصدارات العرض
        </AppText>

        {/* Versions Tab Selector */}
        <View className="flex-row items-center gap-2">
          {publishedVersion && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="النسخة المنشورة"
              onPress={() => setSelectedVersionTab('published')}
              className="flex-1 min-h-[44px] py-2 px-3 rounded-xl border flex-row items-center justify-center gap-2 active:opacity-80"
              style={{
                backgroundColor: selectedVersionTab === 'published' ? '#FACC15' : colors.surface,
                borderColor: selectedVersionTab === 'published' ? '#FACC15' : colors.border,
              }}
            >
              <AppText
                className="font-tajawal-bold text-xs"
                style={{
                  color: selectedVersionTab === 'published' ? '#0F172D' : colors.foreground,
                }}
              >
                نسخة منشورة
              </AppText>
            </Pressable>
          )}

          {pendingVersion && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="النسخة المعلقة"
              onPress={() => setSelectedVersionTab('pending')}
              className="flex-1 min-h-[44px] py-2 px-3 rounded-xl border flex-row items-center justify-center gap-2 active:opacity-80"
              style={{
                backgroundColor: selectedVersionTab === 'pending' ? '#FACC15' : colors.surface,
                borderColor: selectedVersionTab === 'pending' ? '#FACC15' : colors.border,
              }}
            >
              <AppText
                className="font-tajawal-bold text-xs"
                style={{
                  color: selectedVersionTab === 'pending' ? '#0F172D' : colors.foreground,
                }}
              >
                نسخة معلّقة
              </AppText>
            </Pressable>
          )}
        </View>

        <View
          className="p-3 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          }}
        >
          <AppText variant="caption" muted className="font-tajawal text-xs text-right leading-5">
            {publishedVersion
              ? 'لا توجد نسخة عامة جديدة ما لم تعتمدها الإدارة وكان العرض مؤهلاً للظهور.'
              : 'النسخة الحالية قيد إجراءات المراجعة لدى إدارة واو.'}
          </AppText>
        </View>
      </View>

      {/* Section: Review Notes */}
      <View
        className="w-full rounded-2xl border p-4 gap-2 mb-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          ملاحظات المراجعة
        </AppText>
        <View
          className="w-full min-h-[48px] p-3 rounded-xl border justify-center"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          }}
        >
          <AppText variant="caption" muted className="font-tajawal text-xs text-right">
            لا توجد تفاصيل مراجعة أخرى مسموح بعرضها في هذا السيناريو.
          </AppText>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="w-full gap-2.5 pb-6">
        <View className="flex-row items-center gap-2">
          {/* Pause / Resume Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isOfferActive ? 'إيقاف التوفر' : 'استئناف التوفر'}
            onPress={handleToggleAvailability}
            disabled={setAvailabilityMutation.isPending || !canToggleAvailability}
            className="flex-1 min-h-[48px] rounded-xl items-center justify-center flex-row gap-2 active:opacity-85 shadow-sm"
            style={{ backgroundColor: '#0F172D' }}
          >
            <Power size={16} color="#FFFFFF" />
            <AppText className="font-tajawal-bold text-xs" style={{ color: '#FFFFFF' }}>
              {isOfferActive ? 'إيقاف التوفر' : 'استئناف التوفر'}
            </AppText>
          </Pressable>

          {/* Edit Offer Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="تعديل العرض"
            onPress={handleEdit}
            className="flex-1 min-h-[48px] rounded-xl items-center justify-center border flex-row gap-2 active:opacity-75"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
          >
            <Edit size={16} color={colors.foreground} />
            <AppText className="font-tajawal-bold text-xs" style={{ color: colors.foreground }}>
              تعديل العرض
            </AppText>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="العودة إلى قائمة العروض"
          onPress={() => router.push('/offers')}
          className="w-full min-h-[44px] items-center justify-center active:opacity-75"
        >
          <AppText variant="caption" className="font-tajawal-bold text-sm" style={{ color: colors.foreground }}>
            العودة إلى قائمة العروض
          </AppText>
        </Pressable>
      </View>
    </MerchantScaffold>
  );
}
