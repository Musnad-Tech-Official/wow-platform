import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wowIllustrations } from '@wow/assets';
import { useTheme, useWowColors, useWowViewport, wowBrandColors } from '@wow/theme';
import { AppButton, AppText, DataState } from '@wow/ui';
import { FavoriteBusinessCard } from './FavoriteBusinessCard';
import { FavoriteOfferCard } from './FavoriteOfferCard';
import type { SavedBusinessItem, SavedOfferItem } from './favorites-display';
import { useFavoritesDetails } from './use-favorites-details';

export type FavoritesTabId = 'offers' | 'businesses';

export interface CustomerFavoritesTabScreenProps {
  initialTab?: FavoritesTabId;
  previewState?: 'live' | 'guest' | 'offers' | 'businesses' | 'empty-offers' | 'empty-businesses';
}

const SAMPLE_PREVIEW_OFFERS: SavedOfferItem[] = [
  {
    id: 'fav-offer-1',
    offerId: 'e0000000-0000-4000-8000-000000000001',
    createdAt: new Date().toISOString(),
    details: {
      id: 'e0000000-0000-4000-8000-000000000001',
      business_id: 'b0000000-0000-4000-8000-000000000001',
      business: {
        id: 'b0000000-0000-4000-8000-000000000001',
        name: 'ركن المذاق',
        contact_phone: '+967770000001',
        logo_url: null,
      },
      title: 'وجبة غداء متكاملة',
      description: 'وجبة فاخرة ومميزة تشمل الأصناف الرئيسية والمشروب.',
      offer_kind: 'percentage_discount',
      original_price: '4200',
      final_price: '3500',
      currency: 'YER',
      discount_percent: '16.7',
      benefit_details: 'وجبة تشمل الأصناف المحددة',
      mandatory_fees: null,
      terms: 'يسري العرض في الفرع الرئيسي',
      stock_or_condition_notice: null,
      starts_at: '2026-01-01T00:00:00Z',
      ends_at: '2026-12-31T23:59:59Z',
      items: [],
      branches: [],
    },
  },
  {
    id: 'fav-offer-2',
    offerId: 'e0000000-0000-4000-8000-000000000002',
    createdAt: new Date().toISOString(),
    details: {
      id: 'e0000000-0000-4000-8000-000000000002',
      business_id: 'b0000000-0000-4000-8000-000000000001',
      business: {
        id: 'b0000000-0000-4000-8000-000000000001',
        name: 'ركن المذاق',
        contact_phone: '+967770000001',
        logo_url: null,
      },
      title: 'عرض المساء',
      description: 'عرض خاص على الوجبات المسائية.',
      offer_kind: 'fixed_price',
      original_price: null,
      final_price: '2800',
      currency: 'YER',
      discount_percent: '0',
      benefit_details: null,
      mandatory_fees: null,
      terms: null,
      stock_or_condition_notice: null,
      starts_at: '2026-01-01T00:00:00Z',
      ends_at: '2026-02-01T00:00:00Z',
      items: [],
      branches: [],
    },
  },
  {
    id: 'fav-offer-3',
    offerId: 'e0000000-0000-4000-8000-000000000003',
    createdAt: new Date().toISOString(),
    details: {
      id: 'e0000000-0000-4000-8000-000000000003',
      business_id: 'b0000000-0000-4000-8000-000000000002',
      business: {
        id: 'b0000000-0000-4000-8000-000000000002',
        name: 'أزياء المدينة',
        contact_phone: '+967770000002',
        logo_url: null,
      },
      title: 'تشكيلة الموسم',
      description: 'أحدث صيحات الموضة للأزياء النسائية والرجالية.',
      offer_kind: 'percentage_discount',
      original_price: '11000',
      final_price: '8900',
      currency: 'YER',
      discount_percent: '19.1',
      benefit_details: null,
      mandatory_fees: null,
      terms: null,
      stock_or_condition_notice: null,
      starts_at: '2026-01-01T00:00:00Z',
      ends_at: '2026-12-31T23:59:59Z',
      items: [],
      branches: [],
    },
  },
];

const SAMPLE_PREVIEW_BUSINESSES: SavedBusinessItem[] = [
  {
    id: 'fav-biz-1',
    businessId: 'b0000000-0000-4000-8000-000000000001',
    createdAt: new Date().toISOString(),
    details: {
      id: 'b0000000-0000-4000-8000-000000000001',
      name: 'ركن المذاق',
      description: 'أشهى المأكولات والمشروبات المحلية والعالمية.',
      contact_phone: '+967770000001',
      logo_url: null,
      cover_url: null,
      categories: [{ id: 'cat-1', name_ar: 'مطاعم ومقاهٍ', name_en: 'Restaurants & Cafes', slug: 'restaurants', is_primary: true }],
      branches: [],
      offers: [
        { id: 'e0000000-0000-4000-8000-000000000001', offer_kind: 'percentage_discount', title: 'وجبة غداء متكاملة', original_price: '4200', final_price: '3500', currency: 'YER', discount_percent: '16.7', starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-12-31T23:59:59Z' },
        { id: 'e0000000-0000-4000-8000-000000000002', offer_kind: 'fixed_price', title: 'عرض المساء', original_price: null, final_price: '2800', currency: 'YER', discount_percent: '0', starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-02-01T00:00:00Z' },
      ],
    },
  },
  {
    id: 'fav-biz-2',
    businessId: 'b0000000-0000-4000-8000-000000000002',
    createdAt: new Date().toISOString(),
    details: {
      id: 'b0000000-0000-4000-8000-000000000002',
      name: 'خدمات البيت',
      description: 'خدمات متكاملة للمنازل والصيانة.',
      contact_phone: '+967770000002',
      logo_url: null,
      cover_url: null,
      categories: [{ id: 'cat-2', name_ar: 'خدمات', name_en: 'Services', slug: 'services', is_primary: true }],
      branches: [],
      offers: [
        { id: 'e0000000-0000-4000-8000-000000000004', offer_kind: 'fixed_price', title: 'صيانة دورية', original_price: null, final_price: '5000', currency: 'YER', discount_percent: '0', starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-12-31T23:59:59Z' },
      ],
    },
  },
];

export function CustomerFavoritesTabScreen({
  initialTab = 'offers',
  previewState = 'live',
}: CustomerFavoritesTabScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { width: viewportWidth, isCompact, isDesktop, size } = useWowViewport();
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  const [activeTab, setActiveTab] = useState<FavoritesTabId>(
    previewState === 'businesses' ? 'businesses' : initialTab,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Connect to live saved items and public discovery resolution hook
  const liveDetails = useFavoritesDetails();

  // Handle preview overrides for visual review
  const isSignedIn =
    previewState === 'guest'
      ? false
      : previewState !== 'live'
        ? true
        : liveDetails.isSignedIn;

  const savedOffers =
    previewState === 'offers'
      ? SAMPLE_PREVIEW_OFFERS
      : previewState === 'empty-offers'
        ? []
        : liveDetails.savedOffers;

  const savedBusinesses =
    previewState === 'businesses'
      ? SAMPLE_PREVIEW_BUSINESSES
      : previewState === 'empty-businesses'
        ? []
        : liveDetails.savedBusinesses;

  const offersCount = savedOffers.length;
  const businessesCount = savedBusinesses.length;
  const isLoading = previewState !== 'live' ? false : liveDetails.isLoading;
  const isError = previewState !== 'live' ? false : liveDetails.isError;
  const pendingOfferIds = liveDetails.pendingOfferIds;
  const pendingBusinessIds = liveDetails.pendingBusinessIds;
  const removeOffer = liveDetails.removeOffer;
  const removeBusiness = liveDetails.removeBusiness;
  const refetch = liveDetails.refetch;

  // Responsive column calculation
  // Mobile (< 768px): 2 columns
  // Tablet (768px - 1023px): 3 columns
  // Desktop standard (1024px - 1279px): 3 columns
  // Wide Desktop (>= 1280px): 3 columns in centered width-constrained container
  const numColumns = isCompact ? 2 : size === 'medium' ? 3 : viewportWidth >= 1280 ? 3 : 3;
  const gridGap = isCompact ? 12 : 16;
  const horizontalPadding = isCompact ? 16 : 24;
  const contentMaxWidth = Math.min(
    viewportWidth - horizontalPadding * 2,
    isDesktop ? 960 : 1200,
  );

  // Exact card width calculation to maintain pixel-perfect gap and alignment
  const totalGapsWidth = gridGap * (numColumns - 1);
  const cardWidth = Math.floor((contentMaxWidth - totalGapsWidth) / numColumns);

  // Pull to refresh handler
  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  // Navigation handlers
  function handleOfferPress(offerId: string) {
    router.push(`/offer/${offerId}`);
  }

  function handleBusinessPress(businessId: string) {
    router.push(`/business/${businessId}`);
  }

  // ==========================================
  // RENDER: Signed-Out (Guest) Screen
  // ==========================================
  if (!isSignedIn) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, 16),
        }}
      >
        {/* Header */}
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            alignItems: 'center',
            width: '100%',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: isDesktop ? 960 : 1200,
              paddingHorizontal: horizontalPadding,
              paddingBottom: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ gap: 2 }}>
              <AppText
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                المفضلة
              </AppText>
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isDark ? '#94A3B8' : '#475569',
                  textAlign: 'right',
                }}
              >
                عروضك، وتجارك المحفوظون
              </AppText>
            </View>

            {/* Yellow WOW Logo Badge */}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: wowBrandColors.yellow,
              }}
            >
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: '900',
                  color: wowBrandColors.navy,
                  letterSpacing: 1,
                }}
              >
                WOW
              </AppText>
            </View>
          </View>
        </View>

        {/* Guest Body Content */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: horizontalPadding,
            paddingVertical: 36,
          }}
        >
          <View style={{ alignItems: 'center', maxWidth: 380, width: '100%', gap: 18 }}>
            <View style={{ width: 180, height: 180 }}>
              <Image
                source={wowIllustrations.customer.favoritesGuide}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                accessibilityLabel="احتفظ بالعروض التي تهمك"
              />
            </View>

            <View style={{ gap: 8, alignItems: 'center' }}>
              <AppText
                style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                احتفظ بالعروض التي تهمك
              </AppText>

              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: isDark ? '#94A3B8' : '#475569',
                  textAlign: 'center',
                  lineHeight: 22,
                  paddingHorizontal: 8,
                }}
              >
                عرض المفضلة يتطلب تسجيل الدخول. يمكنك دائماً استكشاف العروض دون حساب.
              </AppText>
            </View>

            <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
              <AppButton
                title="تسجيل الدخول"
                variant="primary"
                onPress={() => router.push('/sign-in')}
                style={{
                  height: 48,
                  borderRadius: 14,
                  width: '100%',
                }}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="متابعة الاستكشاف"
                onPress={() => router.replace('/(tabs)')}
                style={{
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.actionForeground,
                    textAlign: 'center',
                  }}
                >
                  متابعة الاستكشاف
                </AppText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // RENDER: Signed-In Favorites Experience
  // ==========================================
  const activeItemsCount = activeTab === 'offers' ? offersCount : businessesCount;
  const isTabEmpty = activeItemsCount === 0;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Math.max(insets.top, 16),
      }}
    >
      {/* 1. Header Row */}
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          alignItems: 'center',
          width: '100%',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: isDesktop ? 960 : 1200,
            paddingHorizontal: horizontalPadding,
            paddingBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ gap: 2 }}>
            <AppText
              style={{
                fontSize: 22,
                fontWeight: '900',
                color: colors.foreground,
                textAlign: 'right',
              }}
            >
              المفضلة
            </AppText>
            <AppText
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isDark ? '#94A3B8' : '#475569',
                textAlign: 'right',
              }}
            >
              عروضك، وتجارك المحفوظون
            </AppText>
          </View>

          {/* Yellow WOW Logo Badge */}
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: wowBrandColors.yellow,
            }}
          >
            <AppText
              style={{
                fontSize: 13,
                fontWeight: '900',
                color: wowBrandColors.navy,
                letterSpacing: 1,
              }}
            >
              WOW
            </AppText>
          </View>
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 16,
          paddingBottom: 32,
          alignItems: 'center',
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View
          {...rtlWebProps}
          style={{
            width: '100%',
            maxWidth: isDesktop ? 960 : 1200,
            gap: 18,
            alignSelf: 'center',
          }}
        >
          {/* 3. Segmented Tabs: Saved Offers vs Saved Businesses */}
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: 'row',
              gap: 10,
              width: '100%',
              maxWidth: 480,
              alignSelf: isDesktop ? 'flex-start' : 'center',
            }}
          >
            {/* Tab: Saved Offers */}
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={`العروض المحفوظة، ${offersCount.toLocaleString('ar-YE')} عنصر`}
              accessibilityState={{ selected: activeTab === 'offers' }}
              onPress={() => setActiveTab('offers')}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 14,
                backgroundColor: activeTab === 'offers' ? wowBrandColors.yellow : colors.surface,
                borderWidth: 1.5,
                borderColor:
                  activeTab === 'offers' ? colors.focusRing : colors.controlBorder,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 12,
              }}
            >
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: activeTab === 'offers' ? '900' : '700',
                  color: activeTab === 'offers' ? wowBrandColors.navy : colors.foreground,
                }}
              >
                العروض المحفوظة {offersCount > 0 ? `(${offersCount.toLocaleString('ar-YE')})` : ''}
              </AppText>
            </Pressable>

            {/* Tab: Saved Businesses */}
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={`التجار المحفوظون، ${businessesCount.toLocaleString('ar-YE')} عنصر`}
              accessibilityState={{ selected: activeTab === 'businesses' }}
              onPress={() => setActiveTab('businesses')}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 14,
                backgroundColor:
                  activeTab === 'businesses' ? wowBrandColors.yellow : colors.surface,
                borderWidth: 1.5,
                borderColor:
                  activeTab === 'businesses' ? colors.focusRing : colors.controlBorder,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 12,
              }}
            >
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: activeTab === 'businesses' ? '900' : '700',
                  color: activeTab === 'businesses' ? wowBrandColors.navy : colors.foreground,
                }}
              >
                التجار المحفوظون {businessesCount > 0 ? `(${businessesCount.toLocaleString('ar-YE')})` : ''}
              </AppText>
            </Pressable>
          </View>

          {/* 4. Sub-header Section Title */}
          <View
            style={{
              paddingVertical: 4,
            }}
          >
            <AppText
              style={{
                fontSize: 16,
                fontWeight: '900',
                color: colors.foreground,
                textAlign: 'right',
              }}
            >
              {activeTab === 'offers' ? 'العروض المحفوظة' : 'التجار المحفوظون'}
            </AppText>
          </View>

          {/* 5. Main Content Area: Loading / Error / Empty / Grid */}
          {isLoading && activeItemsCount === 0 ? (
            /* Loading State */
            <View
              style={{
                paddingVertical: 56,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <ActivityIndicator size="large" color="#FACC15" />
              <AppText style={{ fontSize: 14, color: colors.mutedForeground }}>
                جارٍ تحميل العناصر المحفوظة...
              </AppText>
            </View>
          ) : isError ? (
            /* Error State */
            <DataState
              kind="error"
              title="تعذر تحميل المفضلة"
              description="حدث خطأ أثناء تحميل عناصرك المحفوظة. يرجى التحقق من اتصالك والمحاولة مجدداً."
              actionLabel="إعادة المحاولة"
              onAction={() => void refetch()}
            />
          ) : isTabEmpty ? (
            /* Tab-Specific Empty States */
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 48,
                gap: 16,
                maxWidth: 380,
                alignSelf: 'center',
              }}
            >
              <View style={{ width: 160, height: 160 }}>
                <Image
                  source={
                    activeTab === 'offers'
                      ? wowIllustrations.customer.savedOffersEmpty
                      : wowIllustrations.customer.savedMerchantsEmpty
                  }
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  accessibilityLabel={
                    activeTab === 'offers' ? 'لا توجد عروض محفوظة' : 'لا يوجد تجار محفوظون'
                  }
                />
              </View>

              <View style={{ gap: 6, alignItems: 'center' }}>
                <AppText
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: colors.foreground,
                    textAlign: 'center',
                  }}
                >
                  {activeTab === 'offers' ? 'لا توجد عروض محفوظة' : 'لا يوجد تجار محفوظون'}
                </AppText>

                <AppText
                  style={{
                    fontSize: 14,
                    color: isDark ? '#94A3B8' : '#475569',
                    textAlign: 'center',
                    lineHeight: 22,
                    paddingHorizontal: 8,
                  }}
                >
                  {activeTab === 'offers'
                    ? 'احفظ العروض المفضلة لديك بالضغط على رمز القلب لتصل إليها بسرعة في أي وقت.'
                    : 'تابع متاجرك المفضلة بالضغط على رمز القلب لتطّلع على أحدث عروضها أولاً بأول.'}
                </AppText>
              </View>

              <AppButton
                title={activeTab === 'offers' ? 'استكشف العروض الآن' : 'استكشف المتاجر الآن'}
                variant="primary"
                onPress={() => router.replace('/(tabs)')}
                style={{
                  minWidth: 190,
                  height: 48,
                  borderRadius: 14,
                  marginTop: 8,
                }}
              />
            </View>
          ) : (
            /* Responsive Grid of Saved Items */
            <View
              {...rtlWebProps}
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: gridGap,
                justifyContent: 'flex-start',
                width: '100%',
              }}
            >
              {activeTab === 'offers'
                ? savedOffers.map((item) => (
                    <FavoriteOfferCard
                      key={item.id}
                      item={item}
                      cardWidth={cardWidth}
                      onPress={handleOfferPress}
                      onRemove={removeOffer}
                      isRemoving={pendingOfferIds.has(item.offerId)}
                    />
                  ))
                : savedBusinesses.map((item) => (
                    <FavoriteBusinessCard
                      key={item.id}
                      item={item}
                      cardWidth={cardWidth}
                      onPress={handleBusinessPress}
                      onRemove={removeBusiness}
                      isRemoving={pendingBusinessIds.has(item.businessId)}
                    />
                  ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
