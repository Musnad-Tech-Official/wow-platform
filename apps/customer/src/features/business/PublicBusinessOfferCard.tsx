import { View } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import type { PublicBusinessOffer } from '@wow/api';
import { formatDiscoveryPrice } from './business-display';
import { OfferMediaImage } from '../home/OfferMediaImage';

export interface PublicBusinessOfferCardProps {
  offer: PublicBusinessOffer;
  isDark: boolean;
  onOfferPress: (offerId: string) => void;
}

export function PublicBusinessOfferCard({
  offer,
  isDark,
  onOfferPress,
}: PublicBusinessOfferCardProps) {
  const colors = useWowColors();

  const formattedFinalPrice = formatDiscoveryPrice(offer.final_price, offer.currency);
  const showOriginalPrice =
    offer.original_price != null &&
    offer.final_price != null &&
    Number(offer.original_price) > Number(offer.final_price);
  const formattedOriginalPrice = showOriginalPrice
    ? formatDiscoveryPrice(offer.original_price, offer.currency)
    : null;

  const discountVal =
    offer.discount_percent != null && Number(offer.discount_percent) > 0
      ? Number(offer.discount_percent)
      : null;

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
      {/* Landscape Content Row */}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
        {/* Offer Media / Watermark Fallback */}
        <View
          style={{
            width: 108,
            height: 108,
            borderRadius: 12,
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <OfferMediaImage
            offerId={offer.id}
            isDark={isDark}
            title={offer.title}
            height={108}
            width={108}
            borderRadius={12}
          />

          {/* Discount Badge on Image */}
          {discountVal ? (
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
                خصم {discountVal}%
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
          {/* Current offer title */}
          <View style={{ gap: 4 }}>
            <AppText
              variant="label"
              numberOfLines={2}
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.foreground,
                lineHeight: 22,
                textAlign: 'right',
              }}
            >
              {offer.title}
            </AppText>
          </View>

          {/* Pricing Row */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <AppText
              variant="label"
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: isDark ? '#FACC15' : '#854D0E',
              }}
            >
              {formattedFinalPrice}
            </AppText>
            {formattedOriginalPrice ? (
              <AppText
                variant="caption"
                style={{
                  fontSize: 12,
                  color: isDark ? '#94A3B8' : '#64748B',
                  textDecorationLine: 'line-through',
                }}
              >
                {formattedOriginalPrice}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.border }} />

      {/* Action Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
        <AppButton
          title="تفاصيل العرض"
          variant="secondary"
          size="sm"
          onPress={() => onOfferPress(offer.id)}
        />
      </View>
    </View>
  );
}
