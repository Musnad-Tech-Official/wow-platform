import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight, Store } from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import type { DiscoveryMerchantCard } from './discovery-data';
import { OfferMediaImage } from '../home/OfferMediaImage';

export interface SearchMerchantCardProps {
  merchant: DiscoveryMerchantCard;
  onOfferPress: (offerId: string) => void;
  onMerchantPress: (merchantId: string) => void;
}

export function SearchMerchantCard({
  merchant,
  onOfferPress,
  onMerchantPress,
}: SearchMerchantCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [offerIndex, setOfferIndex] = useState(0);

  const offers = merchant.offers;
  const hasOffers = offers.length > 0;
  const safeIndex = hasOffers ? Math.min(offerIndex, offers.length - 1) : 0;
  const currentOffer = hasOffers ? offers[safeIndex] : null;

  function handlePrev() {
    if (offers.length <= 1) return;
    setOfferIndex((prev) => (prev - 1 + offers.length) % offers.length);
  }

  function handleNext() {
    if (offers.length <= 1) return;
    setOfferIndex((prev) => (prev + 1) % offers.length);
  }

  // Explicit LTR string with directional marks to prevent Arabic BiDi reversal
  const pageStr = `\u200E${String(safeIndex + 1).padStart(2, '0')} / ${String(Math.max(1, offers.length)).padStart(2, '0')}\u200E`;

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        padding: 14,
        gap: 12,
      }}
    >
      {/* 1. Merchant Header Row */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`متجر ${merchant.name}${merchant.categoryName ? ` - ${merchant.categoryName}` : ''}`}
        onPress={() => onMerchantPress(merchant.id)}
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Avatar initial badge */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FFF4D2',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(250, 204, 21, 0.35)' : '#FFECB5',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AppText
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: isDark ? '#FACC15' : '#B88900',
                textAlign: 'center',
              }}
            >
              {merchant.initial}
            </AppText>
          </View>

          {/* Merchant Name */}
          <AppText
            variant="heading"
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontWeight: '800',
              color: colors.foreground,
              flex: 1,
            }}
          >
            {merchant.name}
          </AppText>
        </View>

        {/* Store storefront affordance */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: colors.neutralSurface,
          }}
        >
          <Store size={14} color={isDark ? '#94A3B8' : colors.mutedForeground} />
          <AppText
            variant="caption"
            style={{
              color: isDark ? '#94A3B8' : colors.mutedForeground,
              fontWeight: '600',
            }}
          >
            المتجر
          </AppText>
        </View>
      </Pressable>

      {/* 2. Main Content Row: Image + Offer Info (Horizontal landscape composition) */}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
        {/* Offer Media / Watermark Fallback */}
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 12,
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {currentOffer ? (
            <OfferMediaImage
              offerId={currentOffer.id}
              isDark={isDark}
              title={currentOffer.title}
              height={112}
              width={112}
              borderRadius={12}
            />
          ) : (
            <View
              style={{
                width: 112,
                height: 112,
                borderRadius: 12,
                backgroundColor: isDark ? '#1C2433' : '#CBD5E1',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText
                style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.6)',
                  letterSpacing: 2,
                }}
              >
                WOW
              </AppText>
            </View>
          )}

          {/* Discount Badge on Image */}
          {currentOffer?.discountPercent ? (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                backgroundColor: '#FACC15',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: '#0F172D',
                }}
              >
                خصم {currentOffer.discountPercent}%
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Offer details & pricing */}
        <View
          style={{
            flex: 1,
            minWidth: 0,
            justifyContent: 'space-between',
            paddingVertical: 2,
          }}
        >
          {/* Metadata badges: Category + Offer count */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {merchant.categoryName ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: colors.neutralSurface,
                }}
              >
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    color: isDark ? '#94A3B8' : colors.mutedForeground,
                    fontWeight: '700',
                  }}
                >
                  {merchant.categoryName}
                </AppText>
              </View>
            ) : null}

            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: isDark ? 'rgba(250, 204, 21, 0.12)' : '#FEF9C3',
              }}
            >
              <AppText
                variant="caption"
                style={{
                  fontSize: 11,
                  color: isDark ? '#FACC15' : '#854D0E',
                  fontWeight: '700',
                }}
              >
                {merchant.offerCount > 1
                  ? `${merchant.offerCount} عروض`
                  : `${merchant.offerCount} عرض`}
              </AppText>
            </View>
          </View>

          {/* Current offer title */}
          <View style={{ gap: 4, marginVertical: 4 }}>
            <AppText
              variant="label"
              numberOfLines={2}
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.foreground,
                lineHeight: 20,
              }}
            >
              {currentOffer ? currentOffer.title : 'لا توجد عروض متاحة حالياً'}
            </AppText>
          </View>

          {/* Pricing Row */}
          {currentOffer ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <AppText
                variant="label"
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: isDark ? '#FACC15' : '#854D0E',
                }}
              >
                {currentOffer.price}
              </AppText>
              {currentOffer.originalPrice ? (
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 12,
                    color: isDark ? '#94A3B8' : '#64748B',
                    textDecorationLine: 'line-through',
                  }}
                >
                  {currentOffer.originalPrice}
                </AppText>
              ) : null}
            </View>
          ) : (
            <AppText variant="caption" style={{ color: isDark ? '#94A3B8' : colors.mutedForeground }}>
              تصفح المتجر للتفاصيل
            </AppText>
          )}
        </View>
      </View>

      {/* 3. Divider */}
      <View style={{ height: 1, backgroundColor: colors.border }} />

      {/* 4. Bottom Action Bar: View Details + Offer Preview Carousel */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Action Button */}
        {currentOffer ? (
          <AppButton
            title="عرض التفاصيل"
            variant="secondary"
            size="sm"
            onPress={() => onOfferPress(currentOffer.id)}
          />
        ) : (
          <AppButton
            title="عرض المتجر"
            variant="secondary"
            size="sm"
            onPress={() => onMerchantPress(merchant.id)}
          />
        )}

        {/* Carousel Controls (if multiple preview offers available) */}
        {offers.length > 1 ? (
          <View
            accessibilityRole="none"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: colors.neutralSurface,
              paddingHorizontal: 4,
              paddingVertical: 0,
              borderRadius: 12,
              minHeight: 48,
            }}
          >
            {/* Prev (Right in RTL moves back) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="العرض السابق"
              onPress={handlePrev}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRight size={18} color={colors.foreground} />
            </Pressable>

            {/* LTR Page Counter: "01 / 02" */}
            <AppText
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.foreground,
                paddingHorizontal: 2,
              }}
            >
              {pageStr}
            </AppText>

            {/* Next (Left in RTL moves forward) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="العرض التالي"
              onPress={handleNext}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={18} color={colors.foreground} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

