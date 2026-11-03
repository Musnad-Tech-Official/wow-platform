import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@wow/auth';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText, BottomSheet } from '@wow/ui';
import {
  APPROVED_AREAS,
  APPROVED_CATEGORIES,
  APPROVED_MERCHANTS,
  DEFAULT_SPONSORED_OFFER,
  type AreaId,
  type CategoryId,
  type HomeMerchant,
  type HomeOffer,
} from './home-data';
import { HomeHeader } from './HomeHeader';
import { WelcomeBanner } from './WelcomeBanner';
import { CategoryFilters } from './CategoryFilters';
import { SponsoredOfferCard } from './SponsoredOfferCard';
import { MerchantGridCard } from './MerchantGridCard';
import { RegionSelectorSheet } from './RegionSelectorSheet';
import { SearchSheet } from './SearchSheet';
import { BottomNavBar, type BottomNavTabId } from './BottomNavBar';

export function CustomerHomeScreen() {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isSignedIn } = useAuth();

  // Local navigation and filter state
  const [activeTab, setActiveTab] = useState<BottomNavTabId>('explore');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedArea, setSelectedArea] = useState<AreaId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchFilter, setActiveSearchFilter] = useState('');

  // Modals state
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [showRegionSheet, setShowRegionSheet] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<HomeOffer | null>(null);
  const [activeNotice, setActiveNotice] = useState<{
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Selected area label for header location pill
  const selectedAreaItem = APPROVED_AREAS.find((a) => a.id === selectedArea);
  const selectedAreaName = selectedAreaItem?.label ?? 'كل المناطق';

  // Filter merchants based on category, area, and search query
  const filteredMerchants = useMemo(() => {
    const q = activeSearchFilter.trim().toLowerCase();
    return APPROVED_MERCHANTS.map((merchant) => {
      // Filter offers
      const matchedOffers = merchant.offers.filter((offer) => {
        const matchesCategory =
          selectedCategory === 'all' || offer.category === selectedCategory;
        const matchesArea =
          selectedArea === 'all' || offer.areaId === selectedArea;
        const matchesQuery =
          !q ||
          merchant.name.toLowerCase().includes(q) ||
          merchant.categoryName.toLowerCase().includes(q) ||
          offer.title.toLowerCase().includes(q) ||
          offer.benefit.toLowerCase().includes(q);

        return matchesCategory && matchesArea && matchesQuery;
      });

      return {
        ...merchant,
        offers: matchedOffers,
      };
    }).filter((merchant) => merchant.offers.length > 0);
  }, [selectedCategory, selectedArea, activeSearchFilter]);

  // Featured sponsored offer
  const sponsoredOffer = DEFAULT_SPONSORED_OFFER;

  // Split merchants into rows of 2 for grid layout
  const merchantRows = useMemo(() => {
    const rows: HomeMerchant[][] = [];
    for (let i = 0; i < filteredMerchants.length; i += 2) {
      rows.push(filteredMerchants.slice(i, i + 2));
    }
    return rows;
  }, [filteredMerchants]);

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
          message: 'شاشة المفضلة قيد التطوير وستتوفر قريباً.',
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

  // Handle Offer details
  function handleOfferPress(offerId: string) {
    for (const m of APPROVED_MERCHANTS) {
      const found = m.offers.find((o) => o.id === offerId);
      if (found) {
        setSelectedOffer(found);
        return;
      }
    }
  }

  function handleMerchantPress(merchantId: string) {
    const merchant = APPROVED_MERCHANTS.find((m) => m.id === merchantId);
    if (merchant) {
      setActiveNotice({
        title: merchant.name,
        message: `تصفح عروض ${merchant.name} ضمن قسم ${merchant.categoryName}. يتم تحديث تفاصيل المتجر باستمرار.`,
      });
    }
  }

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
        onOpenSearch={() => setShowSearchSheet(true)}
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

        {/* 3. Category filters (natural full-width horizontal scrolling, no clipping or negative margins) */}
        <CategoryFilters
          categories={APPROVED_CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Active search or area filter badge if applied */}
        {(activeSearchFilter.length > 0 || selectedArea !== 'all') && (
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
                {selectedArea !== 'all' && `المنطقة (${selectedArea === 'center' ? 'وسط المدينة' : 'المنطقة الشرقية'})`}
                {selectedArea !== 'all' && activeSearchFilter && ' • '}
                {activeSearchFilter && `البحث: "${activeSearchFilter}"`}
              </AppText>

              <AppButton
                title="إلغاء التصفية"
                variant="quiet"
                size="sm"
                onPress={() => {
                  setActiveSearchFilter('');
                  setSearchQuery('');
                  setSelectedArea('all');
                }}
              />
            </View>
          </View>
        )}

        {/* 4. Sponsored offers */}
        <View style={{ paddingHorizontal: 16 }}>
          <SponsoredOfferCard
            offer={sponsoredOffer.offer}
            merchantName={sponsoredOffer.merchantName}
            onPress={handleOfferPress}
          />
        </View>

        {/* 5. Merchants Section Header */}
        <View style={{ paddingHorizontal: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
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

            {/* Count Badge: theme-aware contrast */}
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
                {filteredMerchants.length} تجار
              </AppText>
            </View>
          </View>
        </View>

        {/* 6. 2-Column Grid of Merchant Cards */}
        <View style={{ paddingHorizontal: 16 }}>
          {merchantRows.length === 0 ? (
            <View
              style={{
                paddingVertical: 32,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <AppText variant="heading">لا توجد عروض مطابقة</AppText>
              <AppText
                variant="caption"
                style={{
                  textAlign: 'center',
                  color: isDark ? colors.neutral : colors.mutedForeground,
                }}
              >
                جرّب تغيير الفئة أو المنطقة أو كلمات البحث لعرض العروض المتاحة.
              </AppText>
              <View style={{ marginTop: 8 }}>
                <AppButton
                  title="عرض جميع العروض"
                  variant="secondary"
                  onPress={() => {
                    setSelectedCategory('all');
                    setSelectedArea('all');
                    setActiveSearchFilter('');
                    setSearchQuery('');
                  }}
                />
              </View>
            </View>
          ) : (
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

        {/* 7. Footnote Disclaimer */}
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

      {/* 8. Bottom Navigation with small yellow underline and NO background highlight */}
      <BottomNavBar activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Modals & Sheets */}
      <SearchSheet
        visible={showSearchSheet}
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        onApplySearch={() => setActiveSearchFilter(searchQuery)}
        onClearSearch={() => {
          setSearchQuery('');
          setActiveSearchFilter('');
        }}
        onClose={() => setShowSearchSheet(false)}
      />

      <RegionSelectorSheet
        visible={showRegionSheet}
        selectedArea={selectedArea}
        onSelectArea={setSelectedArea}
        onClose={() => setShowRegionSheet(false)}
      />

      {/* Offer Detail Preview BottomSheet */}
      {selectedOffer && (
        <BottomSheet
          visible={!!selectedOffer}
          title="تفاصيل العرض"
          onClose={() => setSelectedOffer(null)}
        >
          <View style={{ gap: 14 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="heading" style={{ fontSize: 18, fontWeight: '800' }}>
                {selectedOffer.title}
              </AppText>
              <AppText variant="title" style={{ fontSize: 20, color: colors.foreground, fontWeight: '800' }}>
                {selectedOffer.price}
              </AppText>
              <AppText style={{ color: colors.mutedForeground, fontSize: 13 }}>
                {selectedOffer.benefit}
              </AppText>
            </View>

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
              <AppText variant="caption" style={{ color: colors.mutedForeground, lineHeight: 18 }}>
                {selectedOffer.conditions}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="حفظ في المفضلة"
                  variant="primary"
                  onPress={() => {
                    setSelectedOffer(null);
                    if (!isSignedIn) {
                      router.push('/sign-in');
                    } else {
                      setActiveNotice({
                        title: 'تم الحفظ',
                        message: 'تمت إضافة العرض إلى قائمتك المفضلة بنجاح.',
                      });
                    }
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="إغلاق"
                  variant="outline"
                  onPress={() => setSelectedOffer(null)}
                />
              </View>
            </View>
          </View>
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
            <AppText style={{ fontSize: 14, color: colors.foreground, lineHeight: 22, textAlign: 'right' }}>
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
