import { useState } from 'react';
import { Image, View } from 'react-native';
import { Tag } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';
import { FavoriteButton } from '../favorites/FavoriteButton';
import { formatOfferCount } from './business-display';
import { usePublicBusinessImage } from './use-public-business-image';

export interface BusinessHeroProps {
  name: string;
  initial: string;
  categoryName?: string | null;
  otherCategories?: string[];
  offerCount: number;
  coverUrl?: string | null;
  logoUrl?: string | null;
  isDark: boolean;
  isCompact: boolean;
  isDesktop: boolean;
  businessId?: string;
  isSaved?: boolean;
  isFavoritePending?: boolean;
  isFavoriteDisabled?: boolean;
  onFavoriteToggle?: () => void;
  onFavoriteGuestPress?: () => void;
}

export function BusinessHero({
  name,
  initial,
  categoryName,
  otherCategories = [],
  offerCount,
  coverUrl,
  logoUrl,
  isDark,
  isCompact,
  isDesktop,
  businessId,
  isSaved = false,
  isFavoritePending = false,
  isFavoriteDisabled = false,
  onFavoriteToggle,
  onFavoriteGuestPress,
}: BusinessHeroProps) {
  const colors = useWowColors();
  const signedCover = usePublicBusinessImage(businessId,coverUrl);
  const signedLogo = usePublicBusinessImage(businessId,logoUrl);
  const [coverFailed, setCoverFailed] = useState<string|null>(null);
  const [logoFailed, setLogoFailed] = useState<string|null>(null);

  const canShowCover = !!signedCover && coverFailed !== signedCover;
  const canShowLogo = !!signedLogo && logoFailed !== signedLogo;

  const coverHeight = isCompact ? 190 : isDesktop ? 260 : 220;
  const logoSize = isDesktop ? 80 : 64;

  return (
    <View style={{ gap: 12 }}>
      {/* 1. Cover Banner */}
      <View
        style={{
          height: coverHeight,
          width: '100%',
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: isDark ? '#131B2E' : '#E2E8F0',
          position: 'relative',
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {canShowCover ? (
          <Image
            source={{ uri: signedCover ?? undefined }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            accessibilityLabel={`غلاف ${name}`}
            onError={() => setCoverFailed(signedCover)}
          />
        ) : (
          /* Branded WOW Pattern Fallback */
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: isDark ? '#101726' : '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: isDark
                  ? 'rgba(250, 204, 21, 0.05)'
                  : 'rgba(250, 204, 21, 0.12)',
              }}
            />
            <AppText
              style={{
                fontSize: isDesktop ? 48 : 36,
                fontWeight: '900',
                color: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 45, 0.16)',
                letterSpacing: 4,
              }}
            >
              WOW
            </AppText>
          </View>
        )}

        {/* Favorite Button on Cover (Top-Left in RTL) */}
        {onFavoriteToggle ? (
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 10,
            }}
          >
            <FavoriteButton
              kind="business"
              targetId={businessId ?? ''}
              isSaved={isSaved}
              isPending={isFavoritePending}
              disabled={isFavoriteDisabled}
              onToggle={onFavoriteToggle}
              onGuestPress={onFavoriteGuestPress}
              size={44}
              accessibilityLabel={
                isSaved
                  ? `إزالة ${name} من المفضلة`
                  : `حفظ ${name} في المفضلة`
              }
            />
          </View>
        ) : null}
      </View>

      {/* 2. Identity Overlap Row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 14,
          paddingHorizontal: 4,
          marginTop: -28,
        }}
      >
        {/* Logo / Monogram Avatar (Right side in RTL) */}
        <View
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 3,
            borderColor: colors.surface,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isDark ? 0.35 : 0.1,
            shadowRadius: 6,
            elevation: 4,
            flexShrink: 0,
          }}
        >
          {canShowLogo ? (
            <Image
              source={{ uri: signedLogo ?? undefined }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              accessibilityLabel={`شعار ${name}`}
              onError={() => setLogoFailed(signedLogo)}
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: isDark ? 'rgba(250, 204, 21, 0.18)' : '#FFF4D2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText
                style={{
                  fontSize: isDesktop ? 28 : 22,
                  fontWeight: '800',
                  color: isDark ? '#FACC15' : '#B88900',
                  textAlign: 'center',
                }}
              >
                {initial}
              </AppText>
            </View>
          )}
        </View>

        {/* Business Name, Category & Badges */}
        <View style={{ flex: 1, minWidth: 0, paddingTop: 32, gap: 6 }}>
          <AppText
            variant="heading"
            numberOfLines={2}
            accessibilityRole="header"
            style={{
              fontSize: isCompact ? 20 : isDesktop ? 26 : 22,
              fontWeight: '800',
              color: colors.foreground,
              lineHeight: isCompact ? 28 : 34,
              textAlign: 'right',
            }}
          >
            {name}
          </AppText>

          {/* Categorization & Offer Count row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {categoryName ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: colors.neutralSurface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 12,
                    color: isDark ? '#94A3B8' : colors.mutedForeground,
                    fontWeight: '700',
                  }}
                >
                  {categoryName}
                </AppText>
              </View>
            ) : null}

            {otherCategories.map((cat) => (
              <View
                key={cat}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: colors.neutralSurface,
                }}
              >
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 11,
                    color: isDark ? '#94A3B8' : colors.mutedForeground,
                    fontWeight: '600',
                  }}
                >
                  {cat}
                </AppText>
              </View>
            ))}

            {offerCount > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FEF9C3',
                }}
              >
                <Tag size={12} color={isDark ? '#FACC15' : '#854D0E'} />
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 12,
                    color: isDark ? '#FACC15' : '#854D0E',
                    fontWeight: '800',
                  }}
                >
                  {formatOfferCount(offerCount)}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
