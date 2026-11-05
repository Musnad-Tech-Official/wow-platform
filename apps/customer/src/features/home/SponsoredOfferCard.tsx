import { Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppText } from '@wow/ui';
import type { HomeOffer } from './home-data';

export interface SponsoredOfferCardProps {
  offer: HomeOffer;
  merchantName: string;
  onPress: (offerId: string) => void;
}

export function SponsoredOfferCard({
  offer,
  merchantName,
  onPress,
}: SponsoredOfferCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <View style={{ gap: 8 }}>
      {/* Section Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText variant="heading" style={{ fontSize: 17, fontWeight: '800' }}>
          عروض ممولة
        </AppText>
        <AppText
          variant="caption"
          style={{
            fontSize: 11,
            color: isDark ? colors.neutral : colors.mutedForeground,
          }}
        >
          محتوى ترويجي معلن
        </AppText>
      </View>

      {/* Refined Featured Card: Reduced empty space, prominent price, balanced layout */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`عرض ممول: ${offer.title} من ${merchantName} بسعر ${offer.price}`}
        onPress={() => onPress(offer.id)}
        style={{
          height: 154,
          borderRadius: 20,
          backgroundColor: '#131A29',
          overflow: 'hidden',
          position: 'relative',
          justifyContent: 'space-between',
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Subtle Background Gradient Overlay */}
        <View
          aria-hidden={true}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: '#0F172A',
            opacity: 0.95,
          }}
        />

        {/* Subtle Warm Highlight in corner */}
        <View
          aria-hidden={true}
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: 'rgba(251, 188, 14, 0.14)',
          }}
        />

        {/* Centered WOW Watermark */}
        <View
          aria-hidden={true}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText
            aria-hidden={true}
            style={{
              fontSize: 34,
              fontWeight: '900',
              color: 'rgba(255, 255, 255, 0.10)',
              letterSpacing: 4,
            }}
          >
            WOW
          </AppText>
        </View>

        {/* Top row: Sponsored tag & Merchant name */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
          }}
        >
          <View
            style={{
              backgroundColor: wowBrandColors.yellow,
              paddingHorizontal: 10,
              paddingVertical: 3.5,
              borderRadius: 8,
            }}
          >
            <AppText
              style={{
                color: '#0F172D',
                fontSize: 11,
                fontWeight: '800',
              }}
            >
              ممول
            </AppText>
          </View>

          <AppText
            variant="caption"
            style={{
              color: '#FDE047',
              fontSize: 12,
              fontWeight: '700',
              textAlign: 'left',
            }}
          >
            {merchantName}
          </AppText>
        </View>

        {/* Bottom row: Details & Prominent Price & Forward Button */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            zIndex: 2,
          }}
        >
          {/* Offer title & Noticeable Price */}
          <View style={{ flex: 1, paddingEnd: 12, gap: 4 }}>
            <AppText
              style={{
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '800',
                lineHeight: 24,
                textAlign: 'right',
              }}
            >
              {offer.title}
            </AppText>

            {/* High-visibility price highlight */}
            <AppText
              style={{
                color: wowBrandColors.yellow,
                fontSize: 16,
                fontWeight: '900',
                textAlign: 'right',
              }}
            >
              {offer.price}
            </AppText>
          </View>

          {/* Yellow action button */}
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: wowBrandColors.yellow,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color="#0F172D" strokeWidth={2.4} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
