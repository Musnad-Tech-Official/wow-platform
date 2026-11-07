import {
  ActivityIndicator,
  type DimensionValue,
  Image,
  Pressable,
  View,
} from 'react-native';
import { usePublicBusiness } from '@wow/api';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';
import { FavoriteButton } from './FavoriteButton';
import {
  formatOfferCount,
  isSafePublicImageUrl,
  type SavedBusinessItem,
} from './favorites-display';
import {
  FavoriteErrorRetryCard,
  UnavailableFavoriteCard,
} from './UnavailableFavoriteCard';

export interface FavoriteBusinessCardProps {
  item: SavedBusinessItem;
  cardWidth: DimensionValue;
  onPress: (businessId: string) => void;
  onRemove: (businessId: string) => void;
  isRemoving?: boolean;
}

export function FavoriteBusinessCard({
  item,
  cardWidth,
  onPress,
  onRemove,
  isRemoving = false,
}: FavoriteBusinessCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Live public discovery query for this business ID (automatically cached/deduplicated by TanStack Query)
  const {
    data: queryBusiness,
    isLoading: isQueryLoading,
    isError: isQueryError,
    refetch,
    isRefetching,
  } = usePublicBusiness(item.details ? null : item.businessId);
  const business = item.details ?? queryBusiness;
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

  // 2. Transient network/API failure: render retryable card, preserve favorite
  if (isError) {
    return (
      <FavoriteErrorRetryCard
        id={item.id}
        kind="business"
        cardWidth={cardWidth}
        onRetry={() => void refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  // 3. Confirmed missing/unpublished/deleted public item: allow user to remove it
  if (!business) {
    return (
      <UnavailableFavoriteCard
        id={item.id}
        kind="business"
        cardWidth={cardWidth}
        onRemove={() => onRemove(item.businessId)}
        isRemoving={isRemoving}
      />
    );
  }

  // 3. Render loaded business card
  const primaryCategory =
    business.categories?.find((c) => c.is_primary) ?? business.categories?.[0];
  const categoryName = primaryCategory?.name_ar ?? 'متجر معتمد';
  const offersCountText = formatOfferCount(business.offers?.length ?? 0);
  const trimmedName = business.name?.trim() ?? '';
  const initial = trimmedName.length > 0 ? trimmedName.charAt(0) : 'و';

  const hasSafeCover = isSafePublicImageUrl(business.cover_url);
  const hasSafeLogo = isSafePublicImageUrl(business.logo_url);

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
      {/* 1. Main Business Card Click Area */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`متجر ${business.name}`}
        onPress={() => onPress(item.businessId)}
        style={{ flex: 1 }}
      >
        {/* Cover Banner */}
        <View
          style={{
            height: 124,
            width: '100%',
            backgroundColor: isDark ? '#1C2433' : '#CBD5E1',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {hasSafeCover ? (
            <Image
              source={{ uri: business.cover_url! }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              accessibilityLabel={`غلاف ${business.name}`}
            />
          ) : (
            /* Approved WOW Watermark Gradient Fallback */
            <View
              style={{
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#172030' : '#B5C4D0',
              }}
            >
              <View
                aria-hidden={true}
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: 'rgba(250, 204, 21, 0.25)',
                }}
              />
              <AppText
                aria-hidden={true}
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: isDark ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.55)',
                  letterSpacing: 2,
                }}
              >
                WOW
              </AppText>
            </View>
          )}
        </View>

        {/* Card Content */}
        <View style={{ padding: 10, gap: 6, flex: 1, justifyContent: 'space-between' }}>
          <View style={{ gap: 4 }}>
            {/* Business Logo / Initial Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {hasSafeLogo ? (
                <Image
                  source={{ uri: business.logo_url! }}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  resizeMode="cover"
                  accessibilityLabel={`شعار ${business.name}`}
                />
              ) : (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FFF4D2',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(250, 204, 21, 0.35)' : '#FFECB5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: isDark ? '#FACC15' : '#B88900',
                    }}
                  >
                    {initial}
                  </AppText>
                </View>
              )}

              {/* Business Name */}
              <AppText
                numberOfLines={1}
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: colors.foreground,
                  flex: 1,
                  textAlign: 'right',
                }}
              >
                {business.name}
              </AppText>
            </View>

            {/* Category */}
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isDark ? '#94A3B8' : '#475569',
                textAlign: 'right',
              }}
            >
              {categoryName}
            </AppText>
          </View>

          {/* Active Offers Count */}
          <View style={{ paddingTop: 4 }}>
            <AppText
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: isDark ? '#CBD5E1' : '#334155',
                textAlign: 'right',
              }}
            >
              {offersCountText}
            </AppText>
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
          kind="business"
          targetId={item.businessId}
          isSaved={true}
          isPending={isRemoving}
          onToggle={() => onRemove(item.businessId)}
          accessibilityLabel={`إزالة ${business.name} من المفضلة`}
        />
      </View>
    </View>
  );
}
