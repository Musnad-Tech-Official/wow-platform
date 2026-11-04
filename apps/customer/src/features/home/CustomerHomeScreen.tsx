import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import {
  usePublicCategories,
  usePublicOffer,
  usePublicSearchBusinesses,
} from '@wow/api';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText, BottomSheet } from '@wow/ui';
import {
  APPROVED_AREAS,
  formatDiscoveryPrice,
  mapPublicBusinessToCard,
  type AreaId,
  type CategoryFilterItem,
  type LiveMerchantCard,
} from './home-data';
import { HomeHeader } from './HomeHeader';
import { WelcomeBanner } from './WelcomeBanner';
import { CategoryFilters } from './CategoryFilters';
import { MerchantGridCard } from './MerchantGridCard';
import { OfferMediaImage } from './OfferMediaImage';
import { RegionSelectorSheet } from './RegionSelectorSheet';
import { BottomNavBar, type BottomNavTabId } from './BottomNavBar';

export function CustomerHomeScreen() {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isSignedIn } = useAuth();

  // Navigation & Filter state
  const [activeTab, setActiveTab] = useState<BottomNavTabId>('explore');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaId>('all');
  const [activeSearchFilter, setActiveSearchFilter] = useState('');

  // Modals state
  const [showRegionSheet, setShowRegionSheet] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [activeNotice, setActiveNotice] = useState<{
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Selected area item for header label & API query (all areas active by default)
  const selectedAreaItem = APPROVED_AREAS.find((a) => a.id === selectedArea);
  const selectedAreaName = selectedAreaItem?.label ?? 'كل المناطق';
  const activeCity = null;

  // 1. Live Categories Query (Public RPC)
  const categoriesQuery = usePublicCategories();

  // Transform live categories for the rail (Root categories + "الكل" always present)
  const categoryRailItems: CategoryFilterItem[] = useMemo(() => {
    const list: CategoryFilterItem[] = [{ id: null, label: 'الكل' }];
    if (categoriesQuery.data && Array.isArray(categoriesQuery.data)) {
      const rootCategories = categoriesQuery.data.filter((c) => c.parent_id === null);
      const displayCategories = rootCategories.length > 0 ? rootCategories : categoriesQuery.data;
      for (const cat of displayCategories) {
        list.push({ id: cat.id, label: cat.name_ar });
      }
    }
    return list;
  }, [categoriesQuery.data]);

  // Active category display name for active filter pill
  const activeCategoryLabel = useMemo(() => {
    if (!selectedCategoryId || !categoriesQuery.data) return null;
    return categoriesQuery.data.find((c) => c.id === selectedCategoryId)?.name_ar ?? null;
  }, [selectedCategoryId, categoriesQuery.data]);

  // 2. Live Search Businesses Query (Public RPC)
  const searchQueryObj = usePublicSearchBusinesses({
    query: activeSearchFilter.trim() || null,
    categoryId: selectedCategoryId,
    city: activeCity,
    sort: 'recent',
    limit: 20,
    offset: 0,
  });

  // Map public businesses to typed presentation card models
  const searchItems = searchQueryObj.data?.items;
  const merchantCards: LiveMerchantCard[] = useMemo(() => {
    if (!searchItems) return [];
    return searchItems.map(mapPublicBusinessToCard);
  }, [searchItems]);

  // Split merchants into rows of 2 for grid layout
  const merchantRows = useMemo(() => {
    const rows: LiveMerchantCard[][] = [];
    for (let i = 0; i < merchantCards.length; i += 2) {
      rows.push(merchantCards.slice(i, i + 2));
    }
    return rows;
  }, [merchantCards]);

  // 3. Live Selected Offer Details Query (Public RPC)
  const offerDetailQuery = usePublicOffer(selectedOfferId);

  // Reset all filters action
  function handleResetFilters() {
    setActiveSearchFilter('');
    setSelectedCategoryId(null);
    setSelectedArea('all');
  }

  // Handle Tab navigation
  function handleSelectTab(tabId: BottomNavTabId) {
    if (tabId === 'explore') {
      setActiveTab('explore');
      return;
    }

    if (tabId === 'favorites') {
      if (!isSignedIn) {
        setActiveNotice({
          title: 'المفضلة',
          message: 'سجل الدخول لحفظ عروضك المفضلة والوصول إليها بسرعة في أي وقت.',
          actionLabel: 'تسجيل الدخول',
          onAction: () => {
            setActiveNotice(null);
            router.push('/sign-in');
          },
        });
      } else {
        setActiveNotice({
          title: 'المفضلة',
          message: 'ميزة المفضلة قيد التطوير وستتوفر في التحديث القادم.',
        });
      }
      return;
    }

    if (tabId === 'account') {
      if (!isSignedIn) {
        setActiveNotice({
          title: 'حسابي',
          message: 'سجل الدخول للاستفادة من كامل ميزات واو ومتابعة عروضك المحفوظة.',
          actionLabel: 'تسجيل الدخول',
          onAction: () => {
            setActiveNotice(null);
            router.push('/sign-in');
          },
        });
      } else {
        router.push('/sign-in');
      }
    }
  }

  function handleOfferPress(offerId: string) {
    setSelectedOfferId(offerId);
  }

  function handleMerchantPress(merchantId: string) {
    router.push({ pathname: '/business/[id]', params: { id: merchantId } });
  }

  const isInitialLoading =
    (searchQueryObj.isLoading || categoriesQuery.isLoading) && !searchQueryObj.data;
  const hasError = (searchQueryObj.isError || categoriesQuery.isError) && !searchQueryObj.data;
  const isFiltered =
    Boolean(activeSearchFilter) || selectedArea !== 'all' || selectedCategoryId !== null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
      }}
    >
      {/* 1. Header with original transparent WOW logo & compact search + location buttons */}
      <HomeHeader
        onOpenSearch={() => router.push('/discover')}
        onOpenLocation={() => setShowRegionSheet(true)}
        selectedAreaName={selectedAreaName}
        isLocationFiltered={selectedArea !== 'all'}
        isSearchActive={activeSearchFilter.trim().length > 0}
      />

      {/* Main scrollable body */}
      <ScrollView
        contentContainerStyle={{
          paddingTop: 4,
          paddingBottom: 24,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Yellow welcome banner with mascot */}
        <View style={{ paddingHorizontal: 16 }}>
          <WelcomeBanner />
        </View>

        {/* 3. Category filters (Live categories from usePublicCategories with "الكل") */}
        <CategoryFilters
          categories={categoryRailItems}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          isLoading={categoriesQuery.isLoading}
        />

        {/* Active search, area, or category filter badge if applied */}
        {isFiltered && (
          <View style={{ paddingHorizontal: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: colors.neutralSurface,
              }}
            >
              <AppText variant="caption" style={{ color: colors.foreground, fontWeight: '700' }}>
                تصفية مفعلة:{' '}
                {selectedArea !== 'all' && `المنطقة (${selectedAreaName})`}
                {selectedArea !== 'all' && (activeSearchFilter || activeCategoryLabel) && ' • '}
                {activeCategoryLabel && `القسم (${activeCategoryLabel})`}
                {activeCategoryLabel && activeSearchFilter && ' • '}
                {activeSearchFilter && `البحث: "${activeSearchFilter}"`}
              </AppText>

              <AppButton
                title="إلغاء التصفية"
                variant="quiet"
                size="sm"
                onPress={handleResetFilters}
              />
            </View>
          </View>
        )}

        {/* 4. Merchants Section Header */}
        <View style={{ paddingHorizontal: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <View style={{ gap: 2 }}>
              <AppText variant="heading" style={{ fontSize: 17, fontWeight: '800' }}>
                استكشف التجار
              </AppText>
              <AppText
                variant="caption"
                style={{
                  fontSize: 11,
                  color: isDark ? colors.neutral : colors.mutedForeground,
                }}
              >
                تصفح العروض لدى التجار المشاركين
              </AppText>
            </View>

            {/* Live Count Badge: theme-aware contrast */}
            <View
              style={{
                backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FFF5D9',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(250, 204, 21, 0.35)' : '#F8E9BC',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <AppText
                style={{
                  color: isDark ? '#FACC15' : '#A27D11',
                  fontSize: 11,
                  fontWeight: '800',
                }}
              >
                {searchQueryObj.data?.total ?? merchantCards.length} تجار
              </AppText>
            </View>
          </View>
        </View>

        {/* 5. Main Content Area: Loading, Error, Empty, or 2-Column Grid */}
        <View style={{ paddingHorizontal: 16 }}>
          {isInitialLoading ? (
            /* Loading State */
            <View
              style={{
                paddingVertical: 48,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <ActivityIndicator size="large" color="#FACC15" />
              <AppText
                variant="caption"
                style={{
                  color: isDark ? colors.neutral : colors.mutedForeground,
                  fontSize: 12,
                }}
              >
                جاري استكشاف العروض المتاحة...
              </AppText>
            </View>
          ) : hasError ? (
            /* Error State with retry action */
            <View
              style={{
                paddingVertical: 40,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                backgroundColor: colors.neutralSurface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <AlertCircle size={32} color={colors.warning} />
              <AppText variant="heading" style={{ fontSize: 16, textAlign: 'center' }}>
                تعذر الاتصال بالخادم
              </AppText>
              <AppText
                variant="caption"
                style={{
                  color: isDark ? colors.neutral : colors.mutedForeground,
                  textAlign: 'center',
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                حدث خطأ أثناء تحميل بيانات العروض. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.
              </AppText>
              <AppButton
                title="إعادة المحاولة"
                variant="primary"
                size="sm"
                onPress={() => {
                  void categoriesQuery.refetch();
                  void searchQueryObj.refetch();
                }}
              />
            </View>
          ) : merchantRows.length === 0 ? (
            /* Empty State: Differentiates filtered search from an empty database */
            <View
              style={{
                paddingVertical: 40,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: colors.neutralSurface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {isFiltered ? (
                <>
                  <AppText variant="heading" style={{ fontSize: 16, textAlign: 'center' }}>
                    لا توجد عروض مطابقة
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{
                      textAlign: 'center',
                      color: isDark ? colors.neutral : colors.mutedForeground,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    لم نجد أي عروض تطابق خيارات التصفية الحالية. جرّب تغيير الفئة أو كلمات البحث.
                  </AppText>
                  <View style={{ marginTop: 6 }}>
                    <AppButton
                      title="عرض جميع العروض"
                      variant="secondary"
                      size="sm"
                      onPress={handleResetFilters}
                    />
                  </View>
                </>
              ) : (
                /* Honest Empty Database State without mock fallback */
                <>
                  <AppText variant="heading" style={{ fontSize: 16, textAlign: 'center' }}>
                    لا توجد عروض منشورة حالياً
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{
                      textAlign: 'center',
                      color: isDark ? colors.neutral : colors.mutedForeground,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    يتم تحديث العروض وإضافة متاجر جديدة باستمرار. ترقبوا انطلاق العروض قريباً!
                  </AppText>
                  <View style={{ marginTop: 6 }}>
                    <AppButton
                      title="تحديث الصفحة"
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        void searchQueryObj.refetch();
                        void categoriesQuery.refetch();
                      }}
                    />
                  </View>
                </>
              )}
            </View>
          ) : (
            /* 2-Column Grid of Live Merchant Cards */
            <View style={{ gap: 12 }}>
              {merchantRows.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'stretch',
                  }}
                >
                  {row.map((merchant) => (
                    <MerchantGridCard
                      key={merchant.id}
                      merchant={merchant}
                      onOfferPress={handleOfferPress}
                      onMerchantPress={handleMerchantPress}
                    />
                  ))}
                  {/* Balance empty slot if odd number of cards */}
                  {row.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 6. Footnote Disclaimer */}
        <View style={{ paddingHorizontal: 16 }}>
          <AppText
            variant="caption"
            style={{
              textAlign: 'center',
              fontSize: 10,
              marginTop: 10,
              marginBottom: 8,
              color: isDark ? colors.neutral : colors.mutedForeground,
            }}
          >
            العروض والأسعار والصور المعروضة بيانات توضيحية
          </AppText>
        </View>
      </ScrollView>

      {/* 7. Bottom Navigation with small yellow underline and NO background highlight */}
      <BottomNavBar activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Modals & Sheets */}
      <RegionSelectorSheet
        visible={showRegionSheet}
        selectedArea={selectedArea}
        onSelectArea={setSelectedArea}
        onClose={() => setShowRegionSheet(false)}
      />

      {/* Live Offer Detail BottomSheet */}
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
                        color: colors.mutedForeground,
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
                  <AppText style={{ color: colors.mutedForeground, fontSize: 13 }}>
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
                    style={{ color: colors.mutedForeground, lineHeight: 18 }}
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

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="حفظ في المفضلة"
                    variant="primary"
                    onPress={() => {
                      if (!isSignedIn) {
                        setSelectedOfferId(null);
                        router.push('/sign-in');
                      } else {
                        setActiveNotice({
                          title: 'المفضلة',
                          message:
                            'ميزة المفضلة المباشرة قيد الإطلاق وسيتم حفظ عروضك تلقائياً بمجرد اكتمالها.',
                        });
                      }
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="إغلاق"
                    variant="outline"
                    onPress={() => setSelectedOfferId(null)}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={{ paddingVertical: 16, gap: 10 }}>
              <AppText style={{ textAlign: 'center', color: colors.mutedForeground }}>
                تعذر تحميل تفاصيل العرض أو أن العرض لم يعد متاحاً.
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

      {/* Informative Dialog / Sheet */}
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

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {activeNotice.actionLabel && activeNotice.onAction && (
                <View style={{ flex: 1 }}>
                  <AppButton
                    title={activeNotice.actionLabel}
                    variant="primary"
                    onPress={activeNotice.onAction}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <AppButton
                  title="إغلاق"
                  variant="outline"
                  onPress={() => setActiveNotice(null)}
                />
              </View>
            </View>
          </View>
        </BottomSheet>
      )}
    </View>
  );
}
