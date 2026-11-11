import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, ChevronLeft, Lock, Star } from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import {
  useMyRatings,
  usePublicOffer,
  type CustomerOfferRating,
} from '@wow/api';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText, Card, DataState } from '@wow/ui';

import { isValidUuid } from '../offer/offer-display';
import {
  FIXTURE_MY_RATINGS,
  FIXTURE_OFFERS_BY_ID,
  STAR_RATING_LABELS,
  formatRatingArabicDate,
  getConformityBadgeProps,
  getModerationStatusBadgeProps,
} from './rating-display';

export interface CustomerMyRatingsScreenProps {
  previewMode?: 'live' | 'populated' | 'empty' | 'guest' | 'loading' | 'error';
}

interface CustomerRatingCardItemProps {
  item: CustomerOfferRating;
  isFixtureMode: boolean;
}

function CustomerRatingCardItem({ item, isFixtureMode }: CustomerRatingCardItemProps) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const badgeProps = getConformityBadgeProps(item.conformity);
  const moderationProps = getModerationStatusBadgeProps(item.moderation_status);

  // Authorized public API query for the offer title and merchant
  const isUuid = isValidUuid(item.offer_id);
  const { data: publicOffer, isLoading: isOfferLoading } = usePublicOffer(
    !isFixtureMode && isUuid ? item.offer_id : null,
  );

  // In fixture mode, resolve from FIXTURE_OFFERS_BY_ID; in live mode, resolve from public API
  const fixtureMatch = isFixtureMode ? FIXTURE_OFFERS_BY_ID[item.offer_id] : null;
  const resolvedOffer = publicOffer
    ? { title: publicOffer.title, merchantName: publicOffer.business?.name }
    : fixtureMatch ?? null;

  const offerTitle = resolvedOffer?.title ?? (isOfferLoading ? 'جارٍ تحميل تفاصيل العرض...' : 'العرض غير متاح حالياً');
  const merchantName = resolvedOffer?.merchantName;
  const isUnavailable = !resolvedOffer && !isOfferLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`تقييم عرض: ${resolvedOffer?.title ?? badgeProps.label}`}
      accessibilityHint="ينتقل إلى صفحة تقييم العرض"
      onPress={() => router.push(`/offer/${item.offer_id}/rate`)}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        gap: 12,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {/* Top Row: Conformity Badge & Moderation Badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View
          style={{
            backgroundColor: isDark ? badgeProps.bgDark : badgeProps.bgLight,
            borderColor: isDark ? badgeProps.borderColorDark : badgeProps.borderColorLight,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
          }}
        >
          <AppText
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: isDark ? badgeProps.textDark : badgeProps.textLight,
            }}
          >
            {badgeProps.label}
          </AppText>
        </View>

        <View
          style={{
            backgroundColor: isDark ? moderationProps.bgDark : moderationProps.bgLight,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
          }}
        >
          <AppText
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: isDark ? moderationProps.textDark : moderationProps.textLight,
            }}
          >
            {moderationProps.label}
          </AppText>
        </View>
      </View>

      {/* Identifiable Offer Title and Merchant or Clear Fallback */}
      <View style={{ gap: 3 }}>
        <AppText
          variant="heading"
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: isUnavailable ? (isDark ? '#94A3B8' : '#64748B') : colors.foreground,
            textAlign: 'right',
          }}
          numberOfLines={2}
        >
          {offerTitle}
        </AppText>
        {merchantName ? (
          <AppText
            variant="caption"
            muted
            style={{ fontSize: 12, textAlign: 'right' }}
          >
            {merchantName}
          </AppText>
        ) : isUnavailable ? (
          <AppText
            variant="caption"
            style={{
              fontSize: 11,
              textAlign: 'right',
              color: isDark ? '#64748B' : '#94A3B8',
            }}
          >
            {`معرّف العرض: ${item.offer_id.slice(0, 8)}...`}
          </AppText>
        ) : null}
      </View>

      {/* Middle Row: Star Rating (if present) */}
      {item.experience_stars !== null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                color="#EAB308"
                fill={s <= item.experience_stars! ? '#FACC15' : 'transparent'}
              />
            ))}
          </View>
          <AppText variant="caption" muted>
            ({STAR_RATING_LABELS[item.experience_stars] ?? item.experience_stars})
          </AppText>
        </View>
      )}

      {/* Bottom Row: Date & Action Link */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <AppText variant="caption" muted style={{ fontSize: 12 }}>
          {formatRatingArabicDate(item.updated_at || item.created_at)}
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppText
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: isDark ? '#FACC15' : '#854D0E',
            }}
          >
            عرض العرض أو تعديل التقييم
          </AppText>
          <ChevronLeft size={16} color={isDark ? '#FACC15' : '#854D0E'} />
        </View>
      </View>
    </Pressable>
  );
}

export function CustomerMyRatingsScreen({
  previewMode = 'live',
}: CustomerMyRatingsScreenProps = {}) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  // 1. Auth check
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const effectiveIsSignedIn =
    previewMode === 'guest'
      ? false
      : previewMode !== 'live'
      ? true
      : Boolean(isSignedIn);

  // 2. Fetch user's ratings
  const ratingsQuery = useMyRatings({ limit: 50, offset: 0 });

  const ratings: CustomerOfferRating[] = useMemo(() => {
    if (previewMode === 'populated') return FIXTURE_MY_RATINGS;
    if (previewMode === 'empty') return [];
    return ratingsQuery.data ?? [];
  }, [previewMode, ratingsQuery.data]);

  const isLoading =
    previewMode === 'loading'
      ? true
      : previewMode === 'live' && (ratingsQuery.isLoading || !isAuthLoaded);

  const isError =
    previewMode === 'error'
      ? true
      : previewMode === 'live' && ratingsQuery.isError;

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account');
    }
  }

  function handleSignInRedirect() {
    router.push({
      pathname: '/sign-in',
      params: {
        returnTo: '/ratings',
      },
    });
  }

  // Header Component
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
          maxWidth: 600,
          marginHorizontal: 'auto',
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
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

        <AppText
          variant="heading"
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.foreground,
            textAlign: 'center',
          }}
        >
          تقييماتي للعروض
        </AppText>

        <View style={{ width: 48, height: 48 }} />
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Unauthenticated / Guest State
  // ---------------------------------------------------------------------------
  if (!effectiveIsSignedIn) {
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            maxWidth: 600,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <Card
            {...rtlWebProps}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              gap: 16,
              width: '100%',
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: isDark ? '#1F2937' : '#FEF9C3',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={26} color="#EAB308" />
            </View>

            <View style={{ alignItems: 'center', gap: 6 }}>
              <AppText
                variant="heading"
                style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'center' }}
              >
                سجّل الدخول لعرض تقييماتك
              </AppText>
              <AppText
                style={{
                  fontSize: 14,
                  color: isDark ? '#94A3B8' : '#64748B',
                  textAlign: 'center',
                  lineHeight: 21,
                  maxWidth: 320,
                }}
              >
                سجل التقييمات خاص بحسابك الشخصي. سجّل الدخول للاطلاع على العروض التي قيّمتها وتحديثها.
              </AppText>
            </View>

            <AppButton
              title="تسجيل الدخول"
              variant="primary"
              onPress={handleSignInRedirect}
              style={{ width: '100%', height: 50, borderRadius: 25, marginTop: 8 }}
            />
          </Card>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }}>
          <ActivityIndicator size="large" color="#FACC15" />
          <AppText
            variant="caption"
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: isDark ? '#94A3B8' : colors.mutedForeground,
            }}
          >
            جاري تحميل سجل تقييماتك...
          </AppText>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Error State
  // ---------------------------------------------------------------------------
  if (isError) {
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
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
            title="تعذّر تحميل التقييمات"
            description="حدث خطأ في الاتصال أثناء جلب سجل تقييماتك من الخادم."
            actionLabel="إعادة المحاولة"
            onAction={() => void ratingsQuery.refetch()}
          />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty State
  // ---------------------------------------------------------------------------
  if (ratings.length === 0) {
    return (
      <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
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
            kind="empty"
            title="لا توجد تقييمات مسجلة"
            description="لم تقم بتقييم أي عروض بعد. يمكنك زيارة الفروع وتقييم مطابقة العروض التي تستفيد منها."
            actionLabel="استكشاف العروض"
            onAction={() => router.replace('/discover')}
          />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Populated List State
  // ---------------------------------------------------------------------------
  return (
    <View {...rtlWebProps} style={{ flex: 1, backgroundColor: colors.background }}>
      {renderHeader()}

      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          maxWidth: 600,
          marginHorizontal: 'auto',
          width: '100%',
          padding: 16,
          gap: 14,
          paddingBottom: 48,
        }}
        renderItem={({ item }) => (
          <CustomerRatingCardItem
            item={item}
            isFixtureMode={previewMode === 'populated'}
          />
        )}
      />
    </View>
  );
}
