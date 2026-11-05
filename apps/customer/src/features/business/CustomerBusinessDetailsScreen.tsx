import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  MapPin,
  PhoneCall,
  Share2,
  Tag,
} from 'lucide-react-native';
import { usePublicBusiness, usePublicOffer } from '@wow/api';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppButton, AppText, BottomSheet, DataState } from '@wow/ui';
import {
  formatBranchCount,
  formatDiscoveryPrice,
  formatOfferCount,
  isValidUuid,
} from './business-display';
import { BusinessHero } from './BusinessHero';
import { PublicBusinessOfferCard } from './PublicBusinessOfferCard';
import { BusinessBranchCard } from './BusinessBranchCard';
import { OfferMediaImage } from '../home/OfferMediaImage';

export interface CustomerBusinessDetailsScreenProps {
  businessId: string;
}

export function CustomerBusinessDetailsScreen({ businessId }: CustomerBusinessDetailsScreenProps) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isCompact, isDesktop } = useWowViewport();

  const scrollRef = useRef<ScrollView>(null);
  const [offersY, setOffersY] = useState(0);
  const [branchesY, setBranchesY] = useState(0);

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // 1. Validate ID strictly before calling Supabase RPC
  const isUuidValid = isValidUuid(businessId);

  // 2. Live Supabase Business Query
  const businessQuery = usePublicBusiness(isUuidValid ? businessId : null);

  // 3. Live Selected Offer Details Query (for BottomSheet preview)
  const offerDetailQuery = usePublicOffer(selectedOfferId);

  const business = businessQuery.data;

  // Navigation handlers
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/discover');
    }
  }

  function handleShare() {
    try {
      if (typeof navigator !== 'undefined' && navigator.share && business) {
        navigator.share({
          title: business.name,
          text: `اكتشف عروض ${business.name} على منصة WOW`,
          url: window.location.href,
        }).catch(() => {});
      }
    } catch {}
  }

  function handleCallMerchant() {
    if (business?.contact_phone) {
      Linking.openURL(`tel:${business.contact_phone.trim()}`).catch(() => {});
    }
  }

  function scrollToOffers() {
    scrollRef.current?.scrollTo({ y: Math.max(0, offersY - 20), animated: true });
  }

  function scrollToBranches() {
    scrollRef.current?.scrollTo({ y: Math.max(0, branchesY - 20), animated: true });
  }

  // -------------------------------------------------------------------------
  // Header Component (Shared across all states)
  // -------------------------------------------------------------------------
  const renderHeader = () => (
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
        {/* RTL Back Button + Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={handleBack}
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
            الملف العام للتاجر
          </AppText>
        </View>

        {/* Optional Share affordance */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="مشاركة صفحة المتجر"
          onPress={handleShare}
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
          <Share2 size={18} color={isDark ? '#94A3B8' : colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );

  // -------------------------------------------------------------------------
  // Invalid UUID State
  // -------------------------------------------------------------------------
  if (!isUuidValid) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
          <DataState
            kind="error"
            title="معرّف المتجر غير صالح"
            description="الرابط المطلوب غير صحيح أو لا يحتوي على معرّف متجر معتمد."
            actionLabel="استكشاف المتاجر"
            onAction={() => router.replace('/discover')}
          />
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------
  if (businessQuery.isLoading && !business) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
          <DataState
            kind="loading"
            title="جاري تحميل بيانات المتجر..."
            description="لحظات ونجهّز معلومات المتجر وعروضه المتاحة."
          />
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Error State
  // -------------------------------------------------------------------------
  if (businessQuery.isError && !business) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
          <DataState
            kind="error"
            title="تعذّر تحميل بيانات المتجر"
            description="تحقق من اتصالك بالإنترنت وحاول مرة أخرى."
            actionLabel="إعادة المحاولة"
            onAction={() => businessQuery.refetch()}
          />
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Not Found / Unavailable State
  // -------------------------------------------------------------------------
  if (!business) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
          <DataState
            kind="empty"
            title="هذا المتجر غير متاح حاليًا"
            description="قد يكون المتجر غير مفعل حاليًا أو تمت إزالته من العرض العام."
            actionLabel="استكشاف المتاجر"
            onAction={() => router.replace('/discover')}
          />
        </View>
      </View>
    );
  }

  // Derived presentation values
  const primaryCat = business.categories?.find((c) => c.is_primary) ?? business.categories?.[0];
  const otherCats = (business.categories ?? [])
    .filter((c) => c.id !== primaryCat?.id)
    .map((c) => c.name_ar);

  const initialChar = business.name.trim().charAt(0) || 'و';
  const offers = business.offers ?? [];
  const branches = business.branches ?? [];
  const hasPhone = !!business.contact_phone && business.contact_phone.trim().length > 0;

  const descriptionText = business.description?.trim() ?? '';
  const isLongDescription = descriptionText.length > 220;
  const displayedDescription =
    isLongDescription && !isDescriptionExpanded
      ? `${descriptionText.slice(0, 200)}...`
      : descriptionText;

  // -------------------------------------------------------------------------
  // Quick Actions Bar
  // -------------------------------------------------------------------------
  const renderQuickActions = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      {/* Primary Action: استعراض العروض */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="استعراض العروض"
        onPress={scrollToOffers}
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 14,
          backgroundColor: '#FACC15',
          borderWidth: 1,
          borderColor: isDark ? '#FDE047' : '#744A00',
        }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Tag size={16} color="#0F172D" />
        <AppText style={{ fontSize: 14, fontWeight: '800', color: '#0F172D' }}>
          استعراض العروض
        </AppText>
      </Pressable>

      {/* Secondary Action: الفروع (Only if branches exist) */}
      {branches.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الفروع المتاحة"
          onPress={scrollToBranches}
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MapPin size={16} color={isDark ? '#94A3B8' : colors.foreground} />
          <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
            الفروع ({branches.length})
          </AppText>
        </Pressable>
      ) : null}

      {/* Contact Action: اتصال (Only if genuine contact_phone exists) */}
      {hasPhone ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`اتصال بالمتجر ${business.contact_phone}`}
          onPress={handleCallMerchant}
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <PhoneCall size={16} color={isDark ? '#94A3B8' : colors.foreground} />
          <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
            اتصال
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );

  // -------------------------------------------------------------------------
  // Offers Section ("عروض التاجر")
  // -------------------------------------------------------------------------
  const renderOffersSection = () => (
    <View
      onLayout={(e) => setOffersY(e.nativeEvent.layout.y)}
      style={{ gap: 14 }}
    >
      {/* Section Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AppText
            variant="heading"
            accessibilityRole="header"
            style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}
          >
            عروض التاجر
          </AppText>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 10,
              backgroundColor: colors.neutralSurface,
            }}
          >
            <AppText
              variant="caption"
              style={{ fontWeight: '700', color: isDark ? '#FACC15' : '#854D0E' }}
            >
              {formatOfferCount(offers.length)}
            </AppText>
          </View>
        </View>
      </View>

      {/* Offers Cards or Empty State */}
      {offers.length === 0 ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <AppText variant="heading" style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>
            لا توجد عروض متاحة حاليًا
          </AppText>
          <AppText variant="caption" style={{ color: isDark ? '#94A3B8' : colors.mutedForeground, textAlign: 'center' }}>
            سيتم نشر العروض والتخفيضات فور توفرها من قِبل المتجر.
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {offers.map((offer) => (
            <PublicBusinessOfferCard
              key={offer.id}
              offer={offer}
              isDark={isDark}
              onOfferPress={setSelectedOfferId}
            />
          ))}
        </View>
      )}
    </View>
  );

  // -------------------------------------------------------------------------
  // About Section ("نبذة عن المتجر")
  // -------------------------------------------------------------------------
  const renderAboutSection = () => {
    if (!descriptionText) return null;
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 18,
          gap: 10,
        }}
      >
        <AppText
          variant="heading"
          accessibilityRole="header"
          style={{ fontSize: 16, fontWeight: '800', color: colors.foreground, textAlign: 'right' }}
        >
          نبذة عن المتجر
        </AppText>
        <AppText
          style={{
            fontSize: 14,
            lineHeight: 24,
            color: isDark ? '#CBD5E1' : colors.foreground,
            textAlign: 'right',
          }}
        >
          {displayedDescription}
        </AppText>

        {isLongDescription ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isDescriptionExpanded ? 'عرض أقل' : 'عرض المزيد'}
            onPress={() => setIsDescriptionExpanded((prev) => !prev)}
            style={{ minHeight: 48, justifyContent: 'center' }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <AppText
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: isDark ? '#FACC15' : '#854D0E',
                textAlign: 'right',
              }}
            >
              {isDescriptionExpanded ? 'عرض أقل' : 'عرض المزيد'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    );
  };

  // -------------------------------------------------------------------------
  // Branches Section ("الفروع المتاحة")
  // -------------------------------------------------------------------------
  const renderBranchesSection = () => (
    <View
      onLayout={(e) => setBranchesY(e.nativeEvent.layout.y)}
      style={{ gap: 12 }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AppText
            variant="heading"
            accessibilityRole="header"
            style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}
          >
            الفروع المتاحة
          </AppText>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 10,
              backgroundColor: colors.neutralSurface,
            }}
          >
            <AppText
              variant="caption"
              style={{ fontWeight: '700', color: isDark ? '#94A3B8' : colors.mutedForeground }}
            >
              {formatBranchCount(branches.length)}
            </AppText>
          </View>
        </View>
      </View>

      {branches.length === 0 ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 18,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <AppText variant="caption" style={{ color: isDark ? '#94A3B8' : colors.mutedForeground }}>
            لا توجد فروع مسجلة حاليًا لهذا المتجر.
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {branches.map((branch) => (
            <BusinessBranchCard
              key={branch.id}
              branch={branch}
              isDark={isDark}
            />
          ))}
        </View>
      )}
    </View>
  );

  // -------------------------------------------------------------------------
  // Main Content
  // -------------------------------------------------------------------------
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {renderHeader()}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            maxWidth: 1200,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: isCompact ? 16 : 24,
            paddingTop: 16,
            gap: 20,
          }}
        >
          {/* Business Hero (Cover + Overlapping Identity) */}
          <BusinessHero
            name={business.name}
            initial={initialChar}
            categoryName={primaryCat?.name_ar}
            otherCategories={otherCats}
            offerCount={offers.length}
            coverUrl={business.cover_url}
            logoUrl={business.logo_url}
            isDark={isDark}
            isCompact={isCompact}
            isDesktop={isDesktop}
          />

          {/* Quick Actions Row */}
          {renderQuickActions()}

          {/* Layout Branch: Desktop vs Mobile/Tablet */}
          {isDesktop ? (
            /* DESKTOP LAYOUT (>= 1024px): 2-Column Split
               In RTL:
               - Logical RIGHT (Physical Right): Secondary Panel (About + Branches)
               - Logical LEFT (Physical Left): Primary Region (Offers)
            */
            <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
              {/* Secondary Information Column (Logical Right) */}
              <View style={{ width: 380, flexShrink: 0, gap: 20 }}>
                {renderAboutSection()}
                {renderBranchesSection()}
              </View>

              {/* Primary Offers Column (Logical Left) */}
              <View style={{ flex: 1, minWidth: 0, gap: 20 }}>
                {renderOffersSection()}
              </View>
            </View>
          ) : (
            /* MOBILE / TABLET LAYOUT (< 1024px): Semantic Vertical Flow */
            <View style={{ gap: 24 }}>
              {renderOffersSection()}
              {renderAboutSection()}
              {renderBranchesSection()}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Offer Detail BottomSheet Preview */}
      {selectedOfferId ? (
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
                <AppText variant="heading" style={{ fontSize: 18, fontWeight: '800', textAlign: 'right' }}>
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
                      textAlign: 'right',
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
                  <AppText variant="label" style={{ fontWeight: '700', textAlign: 'right' }}>
                    شروط العرض:
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{
                      color: isDark ? '#CBD5E1' : colors.mutedForeground,
                      lineHeight: 18,
                      textAlign: 'right',
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
                  <AppText variant="label" style={{ fontWeight: '700', textAlign: 'right' }}>
                    الفروع المتاحة:
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{ color: isDark ? '#CBD5E1' : colors.mutedForeground, lineHeight: 18, textAlign: 'right' }}
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
              <AppText style={{ textAlign: 'center', color: isDark ? '#94A3B8' : colors.mutedForeground }}>
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
      ) : null}
    </View>
  );
}
