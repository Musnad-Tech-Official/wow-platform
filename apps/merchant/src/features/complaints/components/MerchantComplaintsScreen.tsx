import React, { useState, useMemo } from 'react';
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { MessageSquare, Search } from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import { useBusinessComplaints } from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';

// Synthetic fallback cases matching reference MER-08
export interface SyntheticMerchantCase {
  id: string;
  code: string;
  offerTitle: string;
  branchName: string;
  status: 'waiting' | 'investigating' | 'closed';
  statusLabel: string;
  actionRequired: boolean;
}

const PREVIEW_CASES: SyntheticMerchantCase[] = [
  {
    id: 'case-018-uuid',
    code: 'CASE-018',
    offerTitle: 'سماعات لاسلكية مع ضمان المحل',
    branchName: 'فرع التحرير',
    status: 'waiting',
    statusLabel: 'طلب رد',
    actionRequired: true,
  },
  {
    id: 'case-021-uuid',
    code: 'CASE-021',
    offerTitle: 'ملحقات هاتف مختارة',
    branchName: 'فرع صينة',
    status: 'investigating',
    statusLabel: 'تُراجع',
    actionRequired: false,
  },
  {
    id: 'case-008-uuid',
    code: 'CASE-008',
    offerTitle: 'سماعات لاسلكية مع ضمان المحل',
    branchName: 'فرع التحرير',
    status: 'closed',
    statusLabel: 'مغلقة',
    actionRequired: false,
  },
];

export function MerchantComplaintsScreen() {
  const { activeBusinessId } = useActiveBusiness();
  return <MerchantComplaintsContent key={activeBusinessId ?? 'no-business'} />;
}

function MerchantComplaintsContent() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const {
    activeBusinessId,
    isSyntheticPreview,
  } = useActiveBusiness();

  const pageSize = 50;
  const [pageIndex, setPageIndex] = useState(0);
  const offset = pageIndex * pageSize;
  // Fetch one extra item so next-page availability is confirmed by the server.
  const { data: serverComplaints = [], isLoading, error: complaintsError } = useBusinessComplaints(
    activeBusinessId ? { businessId: activeBusinessId, limit: pageSize + 1, offset } : null
  );
  const hasNextPage = !isSyntheticPreview && serverComplaints.length > pageSize
    && offset + pageSize <= 10000;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'investigating' | 'closed'>('all');

  const navParams = {
    ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    ...(isSyntheticPreview ? { preview: '1' } : {}),
  };

  // Standardize cases
  const cases: SyntheticMerchantCase[] = useMemo(() => {
    if (isSyntheticPreview) return PREVIEW_CASES;

    return serverComplaints.slice(0, pageSize).map((c) => {
      // The backend does not supply sequential case numbers; never invent them.
      const code = 'حالة ' + c.id.slice(0, 8).toUpperCase();
      let statusLabel = 'قيد المراجعة';
      const actionReq = c.action_required === true;

      if (c.status === 'waiting') {
        statusLabel = actionReq ? 'مطلوب رد' : 'بانتظار متابعة';
      } else if (c.status === 'investigating') {
        statusLabel = 'تُراجع';
      } else if (c.status === 'closed') {
        statusLabel = 'مغلقة';
      }

      return {
        id: c.id,
        code,
        offerTitle: c.offer_title?.trim() || 'عرض ' + c.offer_id.slice(0, 8).toUpperCase(),
        branchName: c.branch_name?.trim() || (c.branch_id ? 'فرع ' + c.branch_id.slice(0, 8).toUpperCase() : 'الفرع غير محدد'),
        status: c.status === 'new' ? 'investigating' : c.status,
        statusLabel,
        actionRequired: actionReq,
      };
    }).sort((a, b) => Number(b.actionRequired) - Number(a.actionRequired));
  }, [isSyntheticPreview, serverComplaints]);

  // Filter cases
  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesSearch = searchQuery.trim() === ''
        || item.code.toLowerCase().includes(searchQuery.trim().toLowerCase())
        || item.offerTitle.includes(searchQuery.trim())
        || item.branchName.includes(searchQuery.trim());
      return matchesSearch && (statusFilter === 'all' || item.status === statusFilter);
    });
  }, [cases, searchQuery, statusFilter]);

  const handleOpenDetails = (caseId: string) => {
    router.push({
      pathname: '/complaints/details',
      params: { ...navParams, complaintId: caseId },
    });
  };

  const formatStatusBadge = (statusLabel: string) => {
    switch (statusLabel) {
      case 'مطلوب رد':
      case 'طلب رد':
      case 'بانتظار متابعة':
        return { bg: isDark ? '#451A03' : '#FEF3C7', text: '#D97706' };
      case 'تُراجع':
        return { bg: isDark ? '#1E293B' : '#E0E7FF', text: '#4F46E5' };
      case 'مغلقة':
        return { bg: isDark ? '#064E3B' : '#DCFCE7', text: '#16A34A' };
      default:
        return { bg: isDark ? '#27272A' : '#F1F5F9', text: colors.foreground };
    }
  };

  return (
    <MerchantScaffold
      currentTab="complaints"
      title="شكاوى النشاط"
      subtitle="حالات ضمن صلاحيات النشاط والفروع المسندة."
    >
      <View className="gap-5 pb-10">
        {/* Top Header Card with Stats Badge (Matching Reference MER-08) */}
        <View className="flex-row items-center justify-between">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#FEF3C7' }}
          >
            <AppText
              variant="heading"
              className="font-tajawal-bold text-lg"
              style={{ color: '#D97706' }}
            >
              {cases.length}
            </AppText>
          </View>

          <View className="items-end">
            <AppText variant="heading" className="font-tajawal-bold text-xl text-right">
              حالات معروضة
            </AppText>
            <AppText variant="caption" muted className="text-right">
              {cases.filter((item) => item.actionRequired).length} تتطلب رد المالك
            </AppText>
          </View>
        </View>

        {/* Factual Disclaimer Banner */}
        <View
          className="p-3.5 rounded-xl border border-border"
          style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
        >
          <AppText variant="caption" muted className="text-xs text-center leading-relaxed">
            الشكوى لا تعني إثبات مخالفة. تظهر المعلومات المسموح بها للدور فقط.
          </AppText>
        </View>

        {/* Search Field */}
        <View
          className="flex-row items-center gap-2.5 px-3.5 rounded-xl border"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            height: 48,
          }}
        >
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="ابحث برقم الحالة..."
            placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
            className="flex-1 text-right text-sm font-tajawal-regular"
            style={{ color: colors.foreground }}
          />
          <Search size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
        </View>

        {/* Status filtering is based on the recorded status, not an inferred owner-reply demand. */}
        <View className="flex-row flex-wrap gap-2">
          {([
            ['all', 'الكل'],
            ['waiting', 'بانتظار'],
            ['investigating', 'قيد المراجعة'],
            ['closed', 'مغلقة'],
          ] as const).map(([value, label]) => (
            <Pressable key={value} accessibilityRole="tab"
              accessibilityState={{ selected: statusFilter === value }}
              onPress={() => setStatusFilter(value)}
              className="rounded-full border px-3 py-2"
              style={{ borderColor: statusFilter === value ? '#EAB308' : colors.border,
                backgroundColor: statusFilter === value ? (isDark ? '#422006' : '#FEF9C3') : colors.surface }}>
              <AppText variant="caption" className="font-tajawal-bold">{label}</AppText>
            </Pressable>
          ))}
        </View>

        {complaintsError && !isSyntheticPreview ? (
          <View className="rounded-xl border border-border p-3">
            <AppText muted className="text-right">تعذر تحميل قائمة الشكاوى. تحقق من الاتصال ثم أعد المحاولة.</AppText>
          </View>
        ) : null}

        {/* Loading State */}
        {isLoading && !isSyntheticPreview ? (
          <View className="py-12 items-center justify-center gap-2">
            <ActivityIndicator size="small" color="#FACC15" />
            <AppText muted className="text-xs">جارٍ فحص حالات الشكاوى...</AppText>
          </View>
        ) : null}

        {/* Empty State with Mascot */}
        {!isLoading && !complaintsError && filteredCases.length === 0 ? (
          <View
            className="rounded-2xl border p-6 items-center justify-center gap-3.5 text-center"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Image
              source={wowIllustrations.merchant.mer08ComplaintsMascot}
              alt="مساعد واو للشكاوى"
              style={{ width: 90, height: 90 }}
              contentFit="contain"
            />
            <AppText variant="heading" className="font-tajawal-bold text-base text-center">
              {cases.length === 0 ? 'لا توجد شكاوى مسجلة' : 'لا توجد نتائج مطابقة'}
            </AppText>
            <AppText variant="body" muted className="text-xs text-center max-w-xs leading-relaxed">
              {cases.length === 0 ? 'لا توجد شكاوى مصرح بعرضها في هذه الصفحة.' : 'غيّر البحث أو عامل التصفية، أو انتقل إلى صفحة أخرى.'}
            </AppText>
          </View>
        ) : null}

        {/* Section Heading: Cases Linked to Offers */}
        {filteredCases.length > 0 ? (
          <View className="gap-2.5">
            <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
              الحالات المرتبطة بالعروض
            </AppText>

            <View className="gap-3">
              {filteredCases.map((item) => {
                const badgeStyle = formatStatusBadge(item.statusLabel);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`شكوى ${item.code}`}
                    onPress={() => handleOpenDetails(item.id)}
                    className="p-4 rounded-2xl border flex-row items-center justify-between active:opacity-75"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  >
                    {/* Status Badge on Left */}
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: badgeStyle.bg }}
                    >
                      <AppText
                        variant="caption"
                        className="font-tajawal-bold text-xs"
                        style={{ color: badgeStyle.text }}
                      >
                        {item.statusLabel}
                      </AppText>
                    </View>

                    {/* Case Code & Offer/Branch Summary on Right */}
                    <View className="flex-row items-center gap-3">
                      <View className="items-end">
                        <AppText variant="label" className="font-tajawal-bold text-sm">
                          {item.code}
                        </AppText>
                        <AppText variant="caption" muted className="text-xs text-right mt-0.5">
                          {item.offerTitle}
                        </AppText>
                        <AppText variant="caption" muted className="text-[11px] text-right">
                          {item.branchName}
                        </AppText>
                      </View>

                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: isDark ? '#1E293B' : '#FEF9C3' }}
                      >
                        <MessageSquare size={18} color="#D97706" />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {!isSyntheticPreview ? (
          <View className="gap-2">
            <AppText variant="caption" muted className="text-xs text-right">
              البحث والتصفية ينطبقان على الصفحة الحالية، وليس جميع الشكاوى المحفوظة.
            </AppText>
            {(pageIndex > 0 || hasNextPage) ? (
              <View className="flex-row items-center justify-between gap-3">
                <AppButton title="السابق" variant="outline" size="sm"
                  disabled={isLoading || pageIndex === 0}
                  onPress={() => {
                    setPageIndex((prev) => Math.max(prev - 1, 0));
                    setSearchQuery('');
                    setStatusFilter('all');
                  }} />
                <AppText variant="label" className="font-tajawal-bold text-xs">
                  الصفحة {pageIndex + 1}
                </AppText>
                <AppButton title="التالي" variant="outline" size="sm"
                  disabled={isLoading || !hasNextPage}
                  onPress={() => {
                    if (!hasNextPage) return;
                    setPageIndex((prev) => prev + 1);
                    setSearchQuery('');
                    setStatusFilter('all');
                  }} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </MerchantScaffold>
  );
}
