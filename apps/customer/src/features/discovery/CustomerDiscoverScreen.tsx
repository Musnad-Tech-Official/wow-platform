import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, ChevronDown, Check, RotateCcw } from 'lucide-react-native';
import {
  searchPublicBusinesses,
  usePublicCategories,
  usePublicOffer,
  usePublicSearchBusinesses,
  useWowPublicSupabaseClient,
} from '@wow/api';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppButton, AppText, BottomSheet, DataState, SearchField } from '@wow/ui';
import {
  SORT_OPTIONS,
  formatDiscoveryPrice,
  formatMerchantCount,
  mapPublicBusinessToDiscoveryCard,
  type DiscoveryMerchantCard,
  type DiscoverySortOption,
} from './discovery-data';
import { SearchMerchantCard } from './SearchMerchantCard';
import { createPaginationRequestGate } from './pagination-request';
import { OfferMediaImage } from '../home/OfferMediaImage';

export function CustomerDiscoverScreen() {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isCompact, isDesktop } = useWowViewport();
  const getClient = useWowPublicSupabaseClient();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<DiscoverySortOption>('recent');
  const [offset, setOffset] = useState<number>(0);
  const [accumulatedMerchants, setAccumulatedMerchants] = useState<DiscoveryMerchantCard[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [paginationGate] = useState(createPaginationRequestGate);
  useEffect(() => () => paginationGate.invalidate(), [paginationGate]);

  // Modals state
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [activeNotice, setActiveNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // 1. Live Categories Query (Public RPC)
  const categoriesQuery = usePublicCategories();

  // Transform categories with persistent "الكل" (id: null) at start
  const categoriesList = useMemo(() => {
    const list: { id: string | null; label: string }[] = [{ id: null, label: 'الكل' }];
    if (categoriesQuery.data && Array.isArray(categoriesQuery.data)) {
      const rootCategories = categoriesQuery.data.filter((c) => c.parent_id === null);
      const displayCategories = rootCategories.length > 0 ? rootCategories : categoriesQuery.data;
      for (const cat of displayCategories) {
        list.push({ id: cat.id, label: cat.name_ar });
      }
    }
    return list;
  }, [categoriesQuery.data]);

  // Active query trimmed
  const trimmedQuery = searchQuery.trim();

  // 2. Live Search Query for the first page (Public RPC)
  const searchQueryObj = usePublicSearchBusinesses({
    query: trimmedQuery.length > 0 ? trimmedQuery : null,
    categoryId: selectedCategoryId,
    sort: sortBy,
    limit: 20,
    offset: 0,
  });

  // 3. Live Selected Offer Details Query (Public RPC)
  const offerDetailQuery = usePublicOffer(selectedOfferId);

  // Active sort label
  const activeSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? 'الأحدث';

  // Total results count and filter state
  const total = searchQueryObj.data?.total ?? 0;
  const isFiltered = trimmedQuery.length > 0 || selectedCategoryId !== null || sortBy !== 'recent';
  const isInitialLoading = searchQueryObj.isLoading && !searchQueryObj.data;
  const hasError = searchQueryObj.isError && !searchQueryObj.data;

  // Displayed merchants: initial query items if offset === 0, else accumulated list
  const initialCards = useMemo(() => {
    return (searchQueryObj.data?.items ?? []).map(mapPublicBusinessToDiscoveryCard);
  }, [searchQueryObj.data?.items]);

  const displayedMerchants = offset === 0 ? initialCards : accumulatedMerchants;
  const hasMore = displayedMerchants.length < total;

  // Split into rows of 2 for tablet/desktop or 1 for mobile
  const merchantRows = useMemo(() => {
    const rows: DiscoveryMerchantCard[][] = [];
    const chunkSize = isCompact ? 1 : 2;
    for (let i = 0; i < displayedMerchants.length; i += chunkSize) {
      rows.push(displayedMerchants.slice(i, i + chunkSize));
    }
    return rows;
  }, [displayedMerchants, isCompact]);

  function resetPagination() {
    // Invalidate before React commits the next filter state.
    paginationGate.invalidate();
    setOffset(0);
    setAccumulatedMerchants([]);
    setIsFetchingMore(false);
  }

  // Search input handler
  function handleSearchChange(text: string) {
    setSearchQuery(text);
    resetPagination();
  }

  // Category select handler
  function handleSelectCategory(catId: string | null) {
    setSelectedCategoryId(catId);
    resetPagination();
  }

  // Sort select handler
  function handleSelectSort(newSort: DiscoverySortOption) {
    setSortBy(newSort);
    resetPagination();
  }

  // Reset all filters action
  function handleResetFilters() {
    setSearchQuery('');
    setSelectedCategoryId(null);
    setSortBy('recent');
    resetPagination();
  }

  // Incremental pagination: fetch next 20 items without duplicates
  async function handleLoadMore() {
    if (!hasMore || isFetchingMore) return;
    const client = getClient();
    if (!client) return;
    const request = paginationGate.begin();
    if (request === null) return;

    try {
      setIsFetchingMore(true);
      const nextOffset = offset + 20;
      const res = await searchPublicBusinesses(client, {
        query: trimmedQuery.length > 0 ? trimmedQuery : null,
        categoryId: selectedCategoryId,
        sort: sortBy,
        limit: 20,
        offset: nextOffset,
      });

      if (!paginationGate.isCurrent(request)) return;
      const newCards = res.items.map(mapPublicBusinessToDiscoveryCard);
      const baseList = offset === 0 ? initialCards : accumulatedMerchants;
      const existingIds = new Set(baseList.map((m) => m.id));
      const filtered = newCards.filter((m) => !existingIds.has(m.id));

      setAccumulatedMerchants([...baseList, ...filtered]);
      setOffset(nextOffset);
    } catch {
      // Error in loading more will leave current results intact
    } finally {
      if (paginationGate.finish(request)) setIsFetchingMore(false);
    }
  }

  // Detail actions
  function handleOfferPress(offerId: string) {
    router.push({ pathname: '/offer/[id]', params: { id: offerId } });
  }

  function handleMerchantPress(merchantId: string) {
    router.push({ pathname: '/business/[id]', params: { id: merchantId } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 01. Compact Header */}
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            maxWidth: 1200,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: isCompact ? 16 : 24,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* RTL Back Button + Screen Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={() => router.back()}
              style={{
                width: 48,
                height: 48,
                minWidth: 48,
                minHeight: 48,
                borderRadius: 14,
                backgroundColor: colors.neutralSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowRight size={20} color={colors.foreground} />
            </Pressable>

            <AppText
              variant="heading"
              accessibilityRole="header"
              style={{
                fontSize: isCompact ? 18 : 20,
                fontWeight: '800',
                color: colors.foreground,
              }}
            >
              البحث والاستكشاف
            </AppText>
          </View>

          {/* Reset Filters affordance in header if filtered */}
          {isFiltered && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إعادة ضبط التصفية"
              onPress={handleResetFilters}
              style={{
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: colors.neutralSurface,
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <RotateCcw size={16} color={colors.mutedForeground} />
              <AppText variant="caption" style={{ color: colors.foreground, fontWeight: '700' }}>
                إعادة ضبط
              </AppText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Responsive Body */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            maxWidth: 1200,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: isCompact ? 16 : 24,
            paddingTop: 16,
            gap: 16,
          }}
        >
          {/* 02. Search Field */}
          <SearchField
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="ابحث عن تاجر أو عرض..."
            maxLength={100}
            autoFocus={true}
          />

          {/* Layout Branch: Desktop Web vs Mobile/Tablet */}
          {isDesktop ? (
            /* DESKTOP LAYOUT (1024px+): RTL Row with Filter Sidebar on logical right and Results on left */
            <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start', marginTop: 8 }}>
              {/* FILTER SIDEBAR (Logical Right in RTL) */}
              <View
                style={{
                  width: 260,
                  flexShrink: 0,
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  gap: 20,
                }}
              >
                {/* Section 1: Categories */}
                <View style={{ gap: 10 }}>
                  <AppText variant="heading" style={{ fontSize: 16, fontWeight: '800' }}>
                    التصنيفات
                  </AppText>
                  <View style={{ gap: 6 }}>
                    {categoriesList.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <Pressable
                          key={cat.id ?? 'all'}
                          accessibilityRole="button"
                          accessibilityLabel={cat.label}
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => handleSelectCategory(cat.id)}
                          style={{
                            minHeight: 48,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(250, 204, 21, 0.18)' : '#FEF08A')
                              : colors.neutralSurface,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.focusRing : 'transparent',
                          }}
                        >
                          <AppText
                            variant="label"
                            style={{
                              fontWeight: isSelected ? '800' : '600',
                              color: isSelected
                                ? (isDark ? '#FACC15' : '#854D0E')
                                : colors.foreground,
                            }}
                          >
                            {cat.label}
                          </AppText>
                          {isSelected && (
                            <Check
                              size={16}
                              color={isDark ? '#FACC15' : '#854D0E'}
                              strokeWidth={2.5}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Section 2: Sorting */}
                <View style={{ gap: 10 }}>
                  <AppText variant="heading" style={{ fontSize: 16, fontWeight: '800' }}>
                    الترتيب
                  </AppText>
                  <View style={{ gap: 6 }}>
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortBy === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          accessibilityRole="radio"
                          accessibilityLabel={opt.label}
                          accessibilityState={{ checked: isSelected }}
                          onPress={() => handleSelectSort(opt.value)}
                          style={{
                            minHeight: 48,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(250, 204, 21, 0.18)' : '#FEF08A')
                              : colors.neutralSurface,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.focusRing : 'transparent',
                          }}
                        >
                          <AppText
                            variant="label"
                            style={{
                              fontWeight: isSelected ? '800' : '600',
                              color: isSelected
                                ? (isDark ? '#FACC15' : '#854D0E')
                                : colors.foreground,
                            }}
                          >
                            {opt.label}
                          </AppText>
                          {isSelected && (
                            <Check
                              size={16}
                              color={isDark ? '#FACC15' : '#854D0E'}
                              strokeWidth={2.5}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Section 3: Region Directory Status (Truthful honest note) */}
                <View style={{ gap: 4 }}>
                  <AppText variant="caption" style={{ color: isDark ? '#94A3B8' : colors.mutedForeground, fontWeight: '700' }}>
                    المنطقة
                  </AppText>
                  <AppText variant="caption" style={{ color: isDark ? '#94A3B8' : colors.mutedForeground, lineHeight: 18 }}>
                    غير متاحة حالياً حتى توفر دليل المناطق المعتمد في الواجهة الخلفية.
                  </AppText>
                </View>
              </View>

              {/* RESULTS AREA (Logical Left in RTL) */}
              <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
                {/* Heading + Count Badge */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <AppText variant="heading" style={{ fontSize: 20, fontWeight: '800' }}>
                      نتائج البحث
                    </AppText>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: colors.neutralSurface,
                      }}
                    >
                      <AppText variant="caption" style={{ fontWeight: '700', color: colors.foreground }}>
                        {formatMerchantCount(total)}
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Results Content */}
                {renderResults()}
              </View>
            </View>
          ) : (
            /* MOBILE / TABLET LAYOUT (<1024px) */
            <View style={{ gap: 16 }}>
              {/* 03. Category Rail (Horizontal Scrollable Chips) */}
              <View style={{ gap: 8 }}>
                <View style={{ paddingHorizontal: 2 }}>
                  <AppText variant="label" style={{ fontWeight: '700', color: isDark ? '#94A3B8' : colors.mutedForeground }}>
                    التصنيفات
                  </AppText>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: isCompact ? -16 : -24 }}
                  contentContainerStyle={{
                    gap: 8,
                    paddingHorizontal: isCompact ? 16 : 24,
                    alignItems: 'center',
                  }}
                >
                  {categoriesList.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <Pressable
                        key={cat.id ?? 'all'}
                        accessibilityRole="button"
                        accessibilityLabel={cat.label}
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => handleSelectCategory(cat.id)}
                        style={{
                          minHeight: 48,
                          minWidth: 56,
                          paddingHorizontal: 18,
                          paddingVertical: 10,
                          borderRadius: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected
                            ? '#FACC15'
                            : colors.surface,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? (isDark ? '#FDE047' : '#744A00')
                            : colors.border,
                        }}
                      >
                        <AppText
                          variant="label"
                          style={{
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? '#0F172D' : colors.foreground,
                          }}
                        >
                          {cat.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 04. Result Heading, Count and Sort selector */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="heading" style={{ fontSize: 18, fontWeight: '800' }}>
                    نتائج البحث
                  </AppText>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                      backgroundColor: colors.neutralSurface,
                    }}
                  >
                    <AppText variant="caption" style={{ fontWeight: '700', color: colors.foreground }}>
                      {formatMerchantCount(total)}
                    </AppText>
                  </View>
                </View>

                {/* Sort Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`الترتيب: ${activeSortLabel}`}
                  onPress={() => setShowSortSheet(true)}
                  style={{
                    minHeight: 48,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <AppText variant="caption" style={{ color: colors.foreground, fontWeight: '700' }}>
                    الترتيب: {activeSortLabel}
                  </AppText>
                  <ChevronDown size={14} color={isDark ? '#94A3B8' : colors.mutedForeground} />
                </Pressable>
              </View>

              {/* Results List */}
              {renderResults()}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sort BottomSheet for Mobile / Tablet */}
      <BottomSheet
        visible={showSortSheet}
        title="ترتيب النتائج"
        onClose={() => setShowSortSheet(false)}
      >
        <View style={{ gap: 8, paddingVertical: 8 }}>
          {SORT_OPTIONS.map((opt) => {
            const isSelected = sortBy === opt.value;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityState={{ checked: isSelected }}
                onPress={() => {
                  handleSelectSort(opt.value);
                  setShowSortSheet(false);
                }}
                style={{
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? (isDark ? 'rgba(250, 204, 21, 0.18)' : '#FEF08A')
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.focusRing : colors.border,
                }}
              >
                <AppText
                  variant="label"
                  style={{
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? (isDark ? '#FACC15' : '#854D0E') : colors.foreground,
                  }}
                >
                  {opt.label}
                </AppText>
                {isSelected && (
                  <Check size={18} color={isDark ? '#FACC15' : '#854D0E'} strokeWidth={2.5} />
                )}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      {/* Offer Detail BottomSheet (Reused public offer preview) */}
      {selectedOfferId && (
        <BottomSheet
          visible={!!selectedOfferId}
          title="تفاصيل العرض"
          onClose={() => setSelectedOfferId(null)}
        >
          {offerDetailQuery.isLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color="#FACC15" />
            </View>
          ) : offerDetailQuery.data ? (
            <View style={{ gap: 14 }}>
              <View style={{ borderRadius: 14, overflow: 'hidden' }}>
                <OfferMediaImage
                  offerId={selectedOfferId}
                  isDark={isDark}
                  title={offerDetailQuery.data.title}
                  height={140}
                  borderRadius={14}
                />
              </View>
              <View style={{ gap: 4 }}>
                <AppText variant="heading" style={{ fontSize: 18, fontWeight: '800' }}>
                  {offerDetailQuery.data.title}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <AppText
                    variant="title"
                    style={{ fontSize: 20, color: colors.foreground, fontWeight: '800' }}
                  >
                    {formatDiscoveryPrice(
                      offerDetailQuery.data.final_price,
                      offerDetailQuery.data.currency,
                    )}
                  </AppText>
                  {offerDetailQuery.data.original_price != null && (
                    <AppText
                      style={{
                        fontSize: 14,
                        color: isDark ? '#94A3B8' : '#64748B',
                        textDecorationLine: 'line-through',
                      }}
                    >
                      {formatDiscoveryPrice(
                        offerDetailQuery.data.original_price,
                        offerDetailQuery.data.currency,
                      )}
                    </AppText>
                  )}
                </View>

                {offerDetailQuery.data.benefit_details || offerDetailQuery.data.description ? (
                  <AppText
                    style={{
                      color: isDark ? '#CBD5E1' : colors.mutedForeground,
                      fontSize: 13,
                      lineHeight: 20,
                    }}
                  >
                    {offerDetailQuery.data.benefit_details ?? offerDetailQuery.data.description}
                  </AppText>
                ) : null}
              </View>

              {offerDetailQuery.data.terms ? (
                <View
                  style={{
                    backgroundColor: colors.neutralSurface,
                    borderRadius: 12,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <AppText variant="label" style={{ fontWeight: '700' }}>
                    شروط العرض:
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{
                      color: isDark ? '#CBD5E1' : colors.mutedForeground,
                      lineHeight: 18,
                    }}
                  >
                    {offerDetailQuery.data.terms}
                  </AppText>
                </View>
              ) : null}

              {offerDetailQuery.data.branches?.length > 0 && (
                <View
                  style={{
                    backgroundColor: colors.neutralSurface,
                    borderRadius: 12,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <AppText variant="label" style={{ fontWeight: '700' }}>
                    الفروع المتاحة:
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{ color: colors.mutedForeground, lineHeight: 18 }}
                  >
                    {offerDetailQuery.data.branches
                      .map((b) => `${b.name} (${b.city}${b.district ? ` - ${b.district}` : ''})`)
                      .join(' • ')}
                  </AppText>
                </View>
              )}

              <View style={{ marginTop: 8 }}>
                <AppButton
                  title="إغلاق"
                  variant="outline"
                  onPress={() => setSelectedOfferId(null)}
                />
              </View>
            </View>
          ) : (
            <View style={{ paddingVertical: 16, gap: 10 }}>
              <AppText style={{ textAlign: 'center', color: colors.mutedForeground }}>
                هذا العرض غير متاح حاليًا أو انتهت صلاحيته.
              </AppText>
              <AppButton
                title="إغلاق"
                variant="outline"
                onPress={() => setSelectedOfferId(null)}
              />
            </View>
          )}
        </BottomSheet>
      )}

      {/* Informative Dialog for Storefront / Notices */}
      {activeNotice && (
        <BottomSheet
          visible={!!activeNotice}
          title={activeNotice.title}
          onClose={() => setActiveNotice(null)}
        >
          <View style={{ gap: 16 }}>
            <AppText
              style={{
                fontSize: 14,
                color: colors.foreground,
                lineHeight: 22,
                textAlign: 'right',
              }}
            >
              {activeNotice.message}
            </AppText>

            <AppButton
              title="إغلاق"
              variant="outline"
              onPress={() => setActiveNotice(null)}
            />
          </View>
        </BottomSheet>
      )}
    </View>
  );

  // Helper to render results or state feedback
  function renderResults() {
    // 1. Initial Loading State
    if (isInitialLoading) {
      return (
        <DataState
          kind="loading"
          title="جاري البحث عن العروض..."
          description="لحظات ونجهّز قائمة المتاجر والعروض المتاحة."
        />
      );
    }

    // 2. Network / Query Failure State
    if (hasError) {
      return (
        <DataState
          kind="error"
          title="تعذّر تحميل نتائج البحث"
          description="تحقق من اتصالك بالإنترنت وحاول مرة أخرى."
          actionLabel="إعادة المحاولة"
          onAction={() => searchQueryObj.refetch()}
        />
      );
    }

    // 3. Filtered No Match State
    if (total === 0 && isFiltered) {
      return (
        <DataState
          kind="empty"
          title="لا توجد نتائج مطابقة"
          description="جرّب تغيير كلمات البحث أو التصنيف."
          actionLabel="إعادة ضبط التصفية"
          onAction={handleResetFilters}
        />
      );
    }

    // 4. Empty Database State (No merchants published)
    if (total === 0 && !isFiltered) {
      return (
        <DataState
          kind="empty"
          title="لا توجد عروض منشورة حاليًا"
          description="ستظهر هنا المتاجر والعروض المنشورة فور توفرها."
        />
      );
    }

    // 5. Merchant Results Grid (1-col on mobile, 2-col on tablet/desktop)
    return (
      <View style={{ gap: 16 }}>
        <View style={{ gap: 16 }}>
          {merchantRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={{ flexDirection: 'row', gap: 16 }}>
              {row.map((merchant) => (
                <View key={merchant.id} style={{ flex: 1, minWidth: 0 }}>
                  <SearchMerchantCard
                    merchant={merchant}
                    onOfferPress={handleOfferPress}
                    onMerchantPress={handleMerchantPress}
                  />
                </View>
              ))}
              {!isCompact && row.length === 1 && (
                <View style={{ flex: 1, minWidth: 0 }} />
              )}
            </View>
          ))}
        </View>

        {/* 06. Pagination Load More */}
        {hasMore && (
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <AppButton
              title={isFetchingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
              variant="outline"
              size="md"
              onPress={handleLoadMore}
              disabled={isFetchingMore}
            />
          </View>
        )}
      </View>
    );
  }
}
