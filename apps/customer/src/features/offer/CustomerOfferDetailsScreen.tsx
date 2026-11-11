import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Info,
  Package,
  Share2,
  Star,
} from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import { usePublicOffer } from '@wow/api';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppText, DataState } from '@wow/ui';
import {
  formatDiscountBadge,
  formatDiscoveryPrice,
  formatOfferExpiry,
  getOfferAvailability,
  isValidUuid,
} from './offer-display';
import { OfferImageGallery } from './OfferImageGallery';
import { OfferMerchantIdentityCard } from './OfferMerchantIdentityCard';
import { OfferParticipatingBranches } from './OfferParticipatingBranches';

export interface CustomerOfferDetailsScreenProps {
  offerId: string;
  mockOffer?: import('@wow/api').PublicOfferDetails;
}

export function CustomerOfferDetailsScreen({ offerId, mockOffer }: CustomerOfferDetailsScreenProps) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isDesktop } = useWowViewport();

  // 1. Strict UUID validation
  const isUuidValid = isValidUuid(offerId);

  // 2. Auth session check for gated actions
  const { isSignedIn } = useAuth();

  // 3. Fetch live public offer data
  const offerQuery = usePublicOffer(isUuidValid ? offerId : null);
  const offer = mockOffer ?? offerQuery.data;

  // Navigation handlers
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/discover');
    }
  }

  function handleRateOffer() {
    if (!offer) return;
    if (isSignedIn) {
      router.push(`/offer/${offer.id}/rate`);
    } else {
      router.push({
        pathname: '/sign-in',
        params: {
          returnTo: `/offer/${offer.id}/rate`,
          offerId: offer.id,
          action: 'rate',
        },
      });
    }
  }

  async function handleShare() {
    try {
      if (!offer) return;
      const shareTitle = offer.title;
      const shareText = `اكتشف عرض "${offer.title}" من ${offer.business?.name ?? 'WOW'} بسعر ${formatDiscoveryPrice(offer.final_price, offer.currency)}`;

      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        }).catch(() => {});
      } else {
        await Share.share({
          title: shareTitle,
          message: `${shareText}\n${typeof window !== 'undefined' ? window.location.href : ''}`,
        });
      }
    } catch {}
  }

  // -------------------------------------------------------------------------
  // Header Component
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
          height: 60,
          maxWidth: 1200,
          marginHorizontal: 'auto',
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        {/* Back Button (Right side in RTL) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الرجوع"
          accessibilityHint="يعود إلى الصفحة السابقة"
          onPress={handleBack}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <ArrowRight size={22} color={colors.foreground} />
        </Pressable>

        {/* Title */}
        <AppText
          variant="heading"
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: colors.foreground,
            textAlign: 'center',
          }}
        >
          تفاصيل العرض
        </AppText>

        {/* Share Button (Left side in RTL) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="مشاركة العرض"
          accessibilityHint="يشارك رابط هذا العرض"
          onPress={handleShare}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Share2 size={20} color={colors.foreground} />
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
        <View
          style={{
            flex: 1,
            paddingTop: 56,
            paddingHorizontal: 24,
            maxWidth: 600,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <DataState
            kind="error"
            title="معرّف العرض غير صالح"
            description="الرابط المطلوب غير صحيح أو لا يحتوي على معرّف عرض معتمد."
            actionLabel="استكشاف العروض"
            onAction={() => router.replace('/discover')}
          />
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------
  if (offerQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
          }}
        >
          <ActivityIndicator size="large" color="#FACC15" />
          <AppText
            variant="caption"
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: isDark ? '#94A3B8' : colors.mutedForeground,
            }}
          >
            جاري تحميل تفاصيل العرض...
          </AppText>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Error State with Retry
  // -------------------------------------------------------------------------
  if (offerQuery.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 24,
            maxWidth: 600,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <DataState
            kind="error"
            title="تعذّر تحميل تفاصيل العرض"
            description="حدث خطأ في الاتصال أثناء جلب بيانات العرض من الخادم."
            actionLabel="إعادة المحاولة"
            onAction={() => void offerQuery.refetch()}
          />
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Not Found / Unavailable State
  // -------------------------------------------------------------------------
  if (!offer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View
          style={{
            flex: 1,
            paddingTop: 56,
            paddingHorizontal: 24,
            maxWidth: 600,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <DataState
            kind="empty"
            title="هذا العرض غير متاح حاليًا"
            description="قد يكون هذا العرض منتهي الصلاحية أو غير معتمد في الوقت الحالي."
            actionLabel="استكشاف العروض"
            onAction={() => router.replace('/discover')}
          />
        </View>
      </View>
    );
  }

  // Derived presentation values - considering both starts_at and ends_at
  const availability = getOfferAvailability(offer.starts_at, offer.ends_at);
  const expiryProse = formatOfferExpiry(offer.ends_at);
  const discountBadge = formatDiscountBadge(offer.discount_percent);
  const finalPriceNum =
    typeof offer.final_price === 'number'
      ? offer.final_price
      : parseFloat(String(offer.final_price));
  const origPriceNum =
    offer.original_price != null
      ? typeof offer.original_price === 'number'
        ? offer.original_price
        : parseFloat(String(offer.original_price))
      : null;
  const hasOriginalPrice =
    origPriceNum != null && !isNaN(origPriceNum) && origPriceNum > finalPriceNum;

  // -------------------------------------------------------------------------
  // Offer Main Content Sections
  // -------------------------------------------------------------------------
  const renderHeroGallery = () => (
    <OfferImageGallery
      offerId={offer.id}
      isDark={isDark}
      title={offer.title}
      isAvailable={availability.isAvailable}
      availabilityLabel={availability.label}
      availabilityStatus={availability.status}
    />
  );

  const renderMerchantCard = () => (
    <OfferMerchantIdentityCard
      businessId={offer.business_id}
      businessName={offer.business?.name ?? 'متجر معتمد'}
      logoUrl={offer.business?.logo_url}
      isDark={isDark}
    />
  );

  const renderTitleAndPricing = () => (
    <View style={{ gap: 8 }}>
      {/* Title */}
      <AppText
        variant="heading"
        style={{
          fontSize: 24,
          fontWeight: '900',
          color: colors.foreground,
          lineHeight: 34,
          textAlign: 'right',
        }}
      >
        {offer.title}
      </AppText>

      {/* Pricing Group */}
      <View style={{ gap: 4, alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <AppText
            style={{
              fontSize: 32,
              fontWeight: '900',
              color: isDark ? '#FACC15' : '#0F172A',
            }}
          >
            {formatDiscoveryPrice(offer.final_price, offer.currency)}
          </AppText>

          {hasOriginalPrice && (
            <AppText
              style={{
                fontSize: 18,
                color: isDark ? '#94A3B8' : '#64748B',
                textDecorationLine: 'line-through',
                fontWeight: '600',
              }}
            >
              {formatDiscoveryPrice(offer.original_price!, offer.currency)}
            </AppText>
          )}

          {discountBadge && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FEF08A',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(250, 204, 21, 0.35)' : '#FDE047',
              }}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: isDark ? '#FACC15' : '#854D0E',
                }}
              >
                {discountBadge}
              </AppText>
            </View>
          )}
        </View>

        {/* Label directly underneath price */}
        <AppText
          variant="caption"
          style={{
            fontSize: 13,
            color: isDark ? '#94A3B8' : '#64748B',
            fontWeight: '600',
            textAlign: 'right',
          }}
        >
          السعر النهائي للعرض
        </AppText>
      </View>
    </View>
  );

  const renderBenefitAndValidity = () => (
    <View style={{ gap: 8, marginTop: 4 }}>
      {/* Benefit indicator */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} color="#10B981" strokeWidth={3} />
        </View>
        <AppText
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isDark ? '#34D399' : '#047857',
            textAlign: 'right',
            flex: 1,
          }}
        >
          {offer.benefit_details || 'عرض شامل للأصناف المحددة'}
        </AppText>
      </View>

      {/* Validity row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Clock size={14} color={isDark ? '#94A3B8' : '#64748B'} />
        <AppText
          variant="caption"
          style={{
            fontSize: 13,
            color: isDark ? '#94A3B8' : '#64748B',
            textAlign: 'right',
          }}
        >
          صلاحية العرض: {expiryProse}
        </AppText>
      </View>
    </View>
  );

  const renderEssentialTerms = () => {
    const hasTerms = Boolean(offer.terms);
    const hasNotice = Boolean(offer.stock_or_condition_notice);
    const hasFees = Boolean(offer.mandatory_fees);

    if (!hasTerms && !hasNotice && !hasFees) {
      return null;
    }

    return (
      <View
        style={{
          paddingVertical: 18,
          paddingHorizontal: 18,
          borderRadius: 18,
          backgroundColor: isDark ? '#111827' : '#FFFDF5',
          borderWidth: 1,
          borderColor: isDark ? '#1F2937' : '#FEF08A',
          borderRightWidth: 5,
          borderRightColor: '#FACC15',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Info size={18} color="#FACC15" />
          <AppText
            variant="heading"
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: isDark ? '#F8FAFC' : '#0F172A',
              textAlign: 'right',
            }}
          >
            شروط أساسية قبل الزيارة
          </AppText>
        </View>

        {hasTerms && (
          <AppText
            style={{
              fontSize: 14,
              color: isDark ? '#CBD5E1' : '#334155',
              lineHeight: 24,
              textAlign: 'right',
            }}
          >
            {offer.terms}
          </AppText>
        )}

        {hasNotice && (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: isDark ? 'rgba(250, 204, 21, 0.08)' : '#FEFCE8',
            }}
          >
            <AppText
              variant="caption"
              style={{
                fontSize: 13,
                color: isDark ? '#FDE047' : '#854D0E',
                lineHeight: 20,
                textAlign: 'right',
              }}
            >
              ملاحظة: {offer.stock_or_condition_notice}
            </AppText>
          </View>
        )}

        {hasFees && (
          <AppText
            variant="caption"
            style={{
              fontSize: 13,
              color: isDark ? '#94A3B8' : '#64748B',
              lineHeight: 20,
              textAlign: 'right',
            }}
          >
            الرسوم الإلزامية: {offer.mandatory_fees}
          </AppText>
        )}
      </View>
    );
  };

  const renderIncludedItems = () => {
    if (!offer.items || offer.items.length === 0) {
      return null;
    }

    return (
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Package size={18} color="#FACC15" />
          <AppText
            variant="heading"
            style={{
              fontSize: 17,
              fontWeight: '800',
              color: colors.foreground,
              textAlign: 'right',
            }}
          >
            الأصناف المشمولة بالعرض
          </AppText>
        </View>

        <View style={{ gap: 8 }}>
          {offer.items.map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                borderRadius: 14,
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    textAlign: 'right',
                  }}
                >
                  {item.name}
                </AppText>
                {item.description ? (
                  <AppText
                    variant="caption"
                    style={{
                      fontSize: 12,
                      color: isDark ? '#94A3B8' : '#64748B',
                      textAlign: 'right',
                    }}
                  >
                    {item.description}
                  </AppText>
                ) : null}
              </View>

              {item.quantity != null && (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isDark ? '#FACC15' : '#0F172A',
                    }}
                  >
                    {`${item.quantity} ${item.unit || ''}`}
                  </AppText>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderBranchesSection = () => (
    <OfferParticipatingBranches
      branches={offer.branches ?? []}
      isDark={isDark}
    />
  );

  const renderOfferAssessmentSection = () => {
    if (!offer) return null;

    return (
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Star size={18} color="#FACC15" fill="#FACC15" />
          <AppText
            variant="heading"
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.foreground,
              textAlign: 'right',
            }}
          >
            تقييم مطابقة العرض
          </AppText>
        </View>

        <AppText
          variant="caption"
          muted
          style={{
            fontSize: 13,
            lineHeight: 20,
            color: colors.mutedForeground,
            textAlign: 'right',
          }}
        >
          هل استفدت من هذا العرض؟ شاركنا تقييم مدى التزام الفرع ومطابقة الخدمة لما هو معلن للمساعدة في قياس الجودة.
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تقييم مطابقة هذا العرض"
          accessibilityHint="ينقلك إلى صفحة تقييم العرض والتجربة"
          onPress={handleRateOffer}
          style={({ pressed }) => ({
            minHeight: 48,
            borderRadius: 12,
            backgroundColor: isDark ? '#1F2937' : '#FEF9C3',
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#FDE047',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 16,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Star size={16} color={isDark ? '#FACC15' : '#854D0E'} fill="#FACC15" />
          <AppText
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: isDark ? '#FACC15' : '#854D0E',
            }}
          >
            تقييم مطابقة العرض
          </AppText>
        </Pressable>
      </View>
    );
  };

  const renderReportIssueSection = () => (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: isDark ? '#111827' : '#F8FAFC',
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AlertCircle size={18} color={isDark ? '#FACC15' : '#B45309'} />
        <AppText
          variant="heading"
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.foreground,
            textAlign: 'right',
          }}
        >
          الإبلاغ عن مشكلة
        </AppText>
      </View>

      <AppText
        variant="caption"
        muted
        style={{
          fontSize: 13,
          lineHeight: 20,
          color: colors.mutedForeground,
          textAlign: 'right',
        }}
      >
        إذا واجهت اختلافاً في السعر، أو عدم توفر العرض في الفرع، أو شروطاً غير مطابقة، يمكنك تقديم بلاغ رسمي لإدارة المنصة.
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="تقديم شكوى بشأن هذا العرض"
        accessibilityHint="ينقلك إلى صفحة تقديم شكوى رسمية"
        onPress={() => router.push(`/offer/${offer.id}/complaint`)}
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: 12,
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 16,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <AlertCircle size={16} color={isDark ? '#FACC15' : '#854D0E'} />
        <AppText
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isDark ? '#FACC15' : '#854D0E',
          }}
        >
          الإبلاغ عن مشكلة في العرض
        </AppText>
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 1. Shared Header */}
      {renderHeader()}

      {/* 2. Main Content View */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
        }}
      >
        <View
          style={{
            maxWidth: 1200,
            marginHorizontal: 'auto',
            width: '100%',
            padding: 16,
          }}
        >
          {isDesktop ? (
            /* Desktop (>=1024px) Responsive Split Layout */
            <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
              {/* Primary Region (Right in RTL): Gallery, Title, Price, Details, Terms */}
              <View style={{ flex: 2, gap: 14 }}>
                {renderHeroGallery()}
                {renderTitleAndPricing()}
                {renderBenefitAndValidity()}
                {renderEssentialTerms()}
                {renderIncludedItems()}
              </View>

              {/* Secondary Sidebar (Left in RTL): Merchant, Branches, Actions */}
              <View style={{ width: 380, gap: 16 }}>
                {renderMerchantCard()}
                {renderBranchesSection()}
                {renderOfferAssessmentSection()}
                {renderReportIssueSection()}
              </View>
            </View>
          ) : (
            /* Mobile & Tablet (<1024px) Single Column Natural Reading Order */
            <View
              style={{
                maxWidth: 600,
                marginHorizontal: 'auto',
                width: '100%',
                gap: 16,
              }}
            >
              {renderHeroGallery()}
              {renderMerchantCard()}
              {renderTitleAndPricing()}
              {renderBenefitAndValidity()}
              {renderEssentialTerms()}
              {renderIncludedItems()}
              {renderBranchesSection()}
              {renderOfferAssessmentSection()}
              {renderReportIssueSection()}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
