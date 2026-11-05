import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppText } from '@wow/ui';
import type { LiveMerchantCard } from './home-data';
import { OfferMediaImage } from './OfferMediaImage';

export interface MerchantGridCardProps {
  merchant: LiveMerchantCard;
  onOfferPress: (offerId: string) => void;
  onMerchantPress: (merchantId: string) => void;
}

export function MerchantGridCard({
  merchant,
  onOfferPress,
  onMerchantPress,
}: MerchantGridCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [offerIndex, setOfferIndex] = useState(0);

  const offers = merchant.offers;
  const safeIndex = Math.min(offerIndex, Math.max(0, offers.length - 1));
  const currentOffer = offers[safeIndex] ?? {
    id: merchant.id,
    title: merchant.name,
    price: '',
    benefit: '',
    areaName: null,
  };

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
        flex: 1,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        minWidth: 0,
        justifyContent: 'space-between',
      }}
    >
      {/* Merchant Header */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`متجر ${merchant.name}${merchant.categoryName ? ` - ${merchant.categoryName}` : ''}`}
        onPress={() => onMerchantPress(merchant.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Avatar initial badge - theme-aware contrast */}
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
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

          {/* Names */}
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: colors.foreground,
                textAlign: 'right',
              }}
            >
              {merchant.name}
            </AppText>
            {merchant.categoryName ? (
              <AppText
                numberOfLines={1}
                style={{
                  fontSize: 11,
                  color: isDark ? colors.neutral : colors.mutedForeground,
                  textAlign: 'right',
                }}
              >
                {merchant.categoryName}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Arrow to view merchant */}
        <ChevronLeft size={16} color={isDark ? colors.neutral : colors.mutedForeground} />
      </Pressable>

      {/* Offer Image & Details Container */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`عرض ${currentOffer.title}${currentOffer.price ? ` بسعر ${currentOffer.price}` : ''}`}
        onPress={() => onOfferPress(currentOffer.id)}
        style={{ flex: 1 }}
      >
        {/* Offer Visual / Watermark Area with live signed image support */}
        <View style={{ position: 'relative' }}>
          <OfferMediaImage
            offerId={currentOffer.id}
            isDark={isDark}
            title={currentOffer.title}
          />

          {/* Page Counter Badge: 01 / 02 - Explicit LTR */}
          {offers.length > 1 && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: isDark ? 'rgba(32, 32, 36, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: colors.foreground,
                  writingDirection: 'ltr',
                }}
              >
                {pageStr}
              </AppText>
            </View>
          )}
        </View>

        {/* Offer Info with clear visual hierarchy */}
        <View style={{ padding: 10, gap: 5, flex: 1, justifyContent: 'space-between' }}>
          <View style={{ gap: 3 }}>
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: colors.foreground,
                lineHeight: 18,
                textAlign: 'right',
              }}
            >
              {currentOffer.title}
            </AppText>

            {currentOffer.price ? (
              <AppText
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: isDark ? '#FACC15' : colors.foreground,
                  textAlign: 'right',
                }}
              >
                {currentOffer.price}
              </AppText>
            ) : null}

            {currentOffer.benefit ? (
              <AppText
                numberOfLines={1}
                style={{
                  fontSize: 11,
                  color: isDark ? colors.neutral : colors.mutedForeground,
                  textAlign: 'right',
                  lineHeight: 16,
                }}
              >
                {currentOffer.benefit}
              </AppText>
            ) : null}
          </View>

          {/* Area / Branch tag - only rendered when authentic branch is present */}
          {currentOffer.areaName ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: 4,
              }}
            >
              <MapPin size={11} color={isDark ? colors.neutral : colors.mutedForeground} />
              <AppText
                style={{
                  fontSize: 11,
                  color: isDark ? colors.neutral : colors.mutedForeground,
                  textAlign: 'right',
                }}
              >
                {currentOffer.areaName}
              </AppText>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Carousel Controls */}
      {offers.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            paddingVertical: 7,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          {/* RTL Previous Button (ChevronRight points right/back in RTL) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="العرض السابق"
            onPress={handlePrev}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronRight size={14} color={colors.foreground} />
          </Pressable>

          {/* Carousel Dots */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {offers.map((_, idx) => (
              <View
                key={idx}
                style={{
                  height: 4,
                  borderRadius: 2,
                  width: idx === safeIndex ? 14 : 5,
                  backgroundColor:
                    idx === safeIndex ? wowBrandColors.yellow : (isDark ? '#52525B' : colors.controlBorder),
                }}
              />
            ))}
          </View>

          {/* RTL Next Button (ChevronLeft points left/forward in RTL) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="العرض التالي"
            onPress={handleNext}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={14} color={colors.foreground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
