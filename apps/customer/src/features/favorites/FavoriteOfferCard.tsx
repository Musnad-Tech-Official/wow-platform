import { ActivityIndicator, type DimensionValue, Pressable, View } from 'react-native';
import { usePublicOffer } from '@wow/api';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText, StatusBadge } from '@wow/ui';
import { OfferMediaImage } from '../home/OfferMediaImage';
import { FavoriteButton } from './FavoriteButton';
import {
  formatDiscoveryPrice,
  getOfferStatus,
  type SavedOfferItem,
} from './favorites-display';
import { UnavailableFavoriteCard } from './UnavailableFavoriteCard';

export interface FavoriteOfferCardProps {
  item: SavedOfferItem;
  cardWidth: DimensionValue;
  onPress: (offerId: string) => void;
  onRemove: (offerId: string) => void;
  isRemoving?: boolean;
}

export function FavoriteOfferCard({
  item,
  cardWidth,
  onPress,
  onRemove,
  isRemoving = false,
}: FavoriteOfferCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Live public discovery query for this offer ID (automatically cached/deduplicated by TanStack Query)
  const { data: queryOffer, isLoading: isQueryLoading, isError: isQueryError } = usePublicOffer(item.details ? null : item.offerId);
  const offer = item.details ?? queryOffer;
  const isLoading = !item.details && isQueryLoading;
  const isError = !item.details && isQueryError;

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <View
        style={{
          width: cardWidth,
          borderRadius: 16,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          minHeight: 200,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          gap: 12,
        }}
      >
        <ActivityIndicator size="small" color="#FACC15" />
        <AppText style={{ fontSize: 12, color: colors.mutedForeground }}>
          جارٍ التحميل...
        </AppText>
      </View>
    );
  }

  // 2. Handle removed or unavailable public items gracefully
  if (isError || !offer) {
    return (
      <UnavailableFavoriteCard
        id={item.id}
        kind="offer"
        cardWidth={cardWidth}
        onRemove={() => onRemove(item.offerId)}
        isRemoving={isRemoving}
      />
    );
  }

  // 3. Render loaded offer card
  const status = getOfferStatus(offer.starts_at, offer.ends_at);
  const formattedPrice = formatDiscoveryPrice(offer.final_price, offer.currency);
  const formattedOriginalPrice =
    offer.original_price != null
      ? formatDiscoveryPrice(offer.original_price, offer.currency)
      : null;

  return (
    <View
      style={{
        width: cardWidth,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. Main Card Click Area */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`عرض ${offer.title} من ${offer.business?.name ?? ''}`}
        onPress={() => onPress(item.offerId)}
        style={{ flex: 1 }}
      >
        {/* Top Image Container */}
        <View style={{ height: 124, width: '100%' }}>
          <OfferMediaImage
            offerId={item.offerId}
            isDark={isDark}
            title={offer.title}
            height={124}
            width="100%"
          />
        </View>

        {/* Card Content */}
        <View style={{ padding: 10, gap: 6, flex: 1, justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            {/* Offer Title */}
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: colors.foreground,
                textAlign: 'right',
              }}
            >
              {offer.title}
            </AppText>

            {/* Merchant Name */}
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isDark ? '#94A3B8' : '#475569',
                textAlign: 'right',
              }}
            >
              {offer.business?.name ?? 'تاجر في واو'}
            </AppText>
          </View>

          {/* Pricing & Commercial Status */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              paddingTop: 4,
            }}
          >
            {/* Final Price & Strikethrough */}
            <View style={{ alignItems: 'flex-start', gap: 1 }}>
              <AppText
                style={{
                  fontSize: 16,
                  fontWeight: '900',
                  color: colors.foreground,
                }}
              >
                {formattedPrice}
              </AppText>

              {formattedOriginalPrice && formattedOriginalPrice !== formattedPrice && (
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: isDark ? '#94A3B8' : '#64748B',
                    textDecorationLine: 'line-through',
                  }}
                >
                  {formattedOriginalPrice}
                </AppText>
              )}
            </View>

            {/* Status Badge */}
            <StatusBadge label={status.label} tone={status.tone} />
          </View>
        </View>
      </Pressable>

      {/* 2. Floating Favorite Button (SIBLING to the card Pressable, never nested inside a button) */}
      <View
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
        }}
      >
        <FavoriteButton
          kind="offer"
          targetId={item.offerId}
          isSaved={true}
          isPending={isRemoving}
          onToggle={() => onRemove(item.offerId)}
          accessibilityLabel={`إزالة ${offer.title} من المفضلة`}
        />
      </View>
    </View>
  );
}
