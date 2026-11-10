import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Search, SlidersHorizontal, ArrowUpDown, Info, Tag } from 'lucide-react-native';
import { AppText, ToastBanner } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { OffersHeroBanner } from './OffersHeroBanner';
import { OfferStatusDistribution } from './OfferStatusDistribution';
import { MerchantOfferCard } from './MerchantOfferCard';
import { useMerchantOffers, type OfferFilterStatus } from '../hooks/useMerchantOffers';

export function MerchantOffersScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const {
    offers,
    counts,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    sortOption,
    setSortOption,
    actionFeedback,
    clearFeedback,
    toggleOfferAvailability,
    isSyntheticPreview,
  } = useMerchantOffers();

  const filterTabs: { key: OfferFilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: counts.all },
    { key: 'visible', label: 'ظاهر', count: counts.visible },
    { key: 'pending', label: 'قيد المراجعة', count: counts.pending },
    { key: 'draft', label: 'مسودة', count: counts.draft },
    { key: 'expired', label: 'منتهي', count: counts.expired },
  ];

  return (
    <MerchantScaffold
      currentTab="offers"
      title="إدارة العروض"
      subtitle="عرض وتحديث جميع عروض نشاطك التجاري"
      extraRightBadge={
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: '#FACC15' }}
        >
          <Tag size={18} color="#0F172D" />
        </View>
      }
    >
      {/* 1. Authoritative Offers Mascot Scene Hero Banner */}
      <OffersHeroBanner />

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <View className="mb-3">
          <ToastBanner
            visible={Boolean(actionFeedback)}
            tone="info"
            message={actionFeedback}
            onDismiss={clearFeedback}
          />
        </View>
      )}

      {/* 2. Offer Status Distribution Summary */}
      <OfferStatusDistribution
        visibleCount={counts.visible}
        pendingCount={counts.pending}
        draftCount={counts.draft}
        expiredCount={counts.expired}
        needsChangesCount={counts.needs_changes}
        totalCount={counts.all}
        isSyntheticPreview={isSyntheticPreview}
      />

      {/* 3. Search & Filter Bar */}
      <View className="w-full gap-2.5 mb-3">
        {/* Search Input Row */}
        <View className="flex-row items-center gap-2">
          {/* Filter Options Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="تصفية"
            className="flex-row items-center gap-1.5 px-3.5 min-h-[44px] rounded-xl border active:opacity-75"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <SlidersHorizontal size={16} color={colors.foreground} />
            <AppText variant="label" className="font-tajawal-bold text-xs">
              تصفية
            </AppText>
          </Pressable>

          {/* Search Box */}
          <View
            className="flex-1 flex-row items-center gap-2 px-3 min-h-[44px] rounded-xl border"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <Search size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="ابحث بالاسم أو رقم العرض أو التصنيف..."
              placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
              textAlign="right"
              className="flex-1 font-tajawal-medium text-xs text-foreground"
              style={{ color: colors.foreground }}
            />
          </View>
        </View>

        {/* Status Filter Chips Row */}
        <View className="flex-row items-center justify-between gap-1.5 py-1">
          {filterTabs.map((tab) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityLabel={`${tab.label} (${tab.count})`}
                onPress={() => setSelectedFilter(tab.key)}
                className="px-2.5 py-1.5 rounded-xl border active:opacity-80"
                style={{
                  backgroundColor: isSelected
                    ? '#FACC15'
                    : isDark
                    ? '#202024'
                    : '#FFFFFF',
                  borderColor: isSelected ? '#FACC15' : colors.border,
                }}
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-xs"
                  style={{
                    color: isSelected ? '#0F172D' : colors.foreground,
                  }}
                >
                  {tab.label} ({tab.count})
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 4. Offers List Header with Sort */}
      <View className="flex-row items-center justify-between mb-2 pt-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تغيير الترتيب"
          onPress={() =>
            setSortOption(
              sortOption === 'newest'
                ? 'price_desc'
                : sortOption === 'price_desc'
                ? 'price_asc'
                : 'newest'
            )
          }
          className="flex-row items-center gap-1 active:opacity-75"
        >
          <ArrowUpDown size={14} color={isDark ? '#A1A1AA' : '#64748B'} />
          <AppText variant="caption" muted className="font-tajawal-medium text-xs">
            ترتيب:{' '}
            {sortOption === 'newest'
              ? 'الأحدث أولًا'
              : sortOption === 'price_desc'
              ? 'الأعلى سعرًا'
              : 'الأقل سعرًا'}
          </AppText>
        </Pressable>

        <AppText variant="heading" className="font-tajawal-bold text-base text-right">
          قائمة عروضك
        </AppText>
      </View>

      {/* 5. Offers List Cards */}
      {offers.length === 0 ? (
        <View
          className="w-full py-12 rounded-2xl border items-center justify-center p-6 my-2"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <Tag size={36} color={isDark ? '#71717A' : '#94A3B8'} />
          <AppText variant="label" className="font-tajawal-bold text-sm mt-3">
            لا توجد عروض مطابقة
          </AppText>
          <AppText variant="caption" muted className="text-center text-xs mt-1">
            لم نجد أي عروض تطابق خيارات البحث والتصفية المحددة.
          </AppText>
        </View>
      ) : (
        offers.map((offer) => (
          <MerchantOfferCard
            key={offer.id}
            offer={offer}
            onPrimaryAction={(item) => toggleOfferAvailability(item)}
            onViewDetails={() => {}}
            onMenuPress={() => {}}
          />
        ))
      )}

      {/* 6. Important Info Alert */}
      <View
        className="w-full flex-row items-center gap-3 p-3.5 rounded-2xl border my-2"
        style={{
          backgroundColor: isDark ? '#27272A' : '#FEFCE8',
          borderColor: isDark ? '#3F3F46' : '#FEF08A',
        }}
      >
        <Info size={20} color="#D97706" />
        <AppText
          variant="caption"
          className="font-tajawal-medium text-xs flex-1 leading-5"
          style={{ color: isDark ? '#D4D4D8' : '#713F12' }}
        >
          معلومة مهمة: اعتماد الإدارة لا يعني ظهور العرض تلقائيًا؛ يتطلب النشر استيفاء شروط النشاط والاشتراك والتوافر.
        </AppText>
      </View>

      {/* 7. Footnote */}
      <View className="py-4 items-center">
        <AppText variant="caption" muted className="font-tajawal text-[11px] text-center">
          الأسماء والأرقام والأسعار في هذا التصميم توضيحية فقط
        </AppText>
      </View>
    </MerchantScaffold>
  );
}
