import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowRight,
  Heart,
  MapPin,
  PhoneCall,
  Share2,
  Tag,
} from 'lucide-react-native';
import { useAuth } from '@wow/auth';
import {
  usePublicBusiness,
  usePublicOffer,
  useSavedBusinesses,
  useSetSavedBusiness,
} from '@wow/api';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppButton, AppText, BottomSheet, DataState, ToastBanner } from '@wow/ui';
import {
  FIXTURE_PUBLIC_BUSINESS,
  FIXTURE_PUBLIC_BUSINESS_LONG_CONTENT,
  FIXTURE_PUBLIC_BUSINESS_MISSING_MEDIA,
  FIXTURE_PUBLIC_BUSINESS_NO_BRANCHES,
  FIXTURE_PUBLIC_BUSINESS_NO_OFFERS,
  formatBranchCount,
  formatDiscoveryPrice,
  formatOfferCount,
  isValidUuid,
} from './business-display';
import { BusinessHero } from './BusinessHero';
import { PublicBusinessOfferCard } from './PublicBusinessOfferCard';
import { BusinessBranchCard } from './BusinessBranchCard';
import { OfferMediaImage } from '../home/OfferMediaImage';

export type BusinessDetailsPreviewMode =
  | 'live'
  | 'auth_unsaved'
  | 'auth_saved'
  | 'guest_viewing'
  | 'guest_save_prompt'
  | 'saving_pending'
  | 'no_offers'
  | 'no_branches'
  | 'missing_media'
  | 'long_content'
  | 'restricted';

export interface CustomerBusinessDetailsScreenProps {
  businessId: string;
  previewMode?: BusinessDetailsPreviewMode;
}

export function CustomerBusinessDetailsScreen({
  businessId,
  previewMode: explicitPreviewMode,
}: CustomerBusinessDetailsScreenProps) {
  const searchParams = useLocalSearchParams<{ preview?: string }>();
  const previewMode =
    explicitPreviewMode ??
    (__DEV__ ? (searchParams.preview as BusinessDetailsPreviewMode) : undefined) ??
    'live';

  const { userId, isSignedIn: rawIsSignedIn } = useAuth();
  const isPreview = __DEV__ && previewMode !== 'live';

  // Auth resolution
  const isSignedIn = isPreview
    ? previewMode === 'guest_viewing' || previewMode === 'guest_save_prompt'
      ? false
      : previewMode === 'auth_unsaved' || previewMode === 'auth_saved' || previewMode === 'saving_pending'
      ? true
      : Boolean(rawIsSignedIn)
    : Boolean(rawIsSignedIn);

  // Session-keyed component identity: resets all UI state, feedback, and in-flight tracking on account switch or logout
  const effectiveUserId = isSignedIn ? userId ?? null : null;
  const sessionKey = `${effectiveUserId ?? 'guest'}:${businessId}:${previewMode}`;

  return (
    <CustomerBusinessDetailsContent
      key={sessionKey}
      businessId={businessId}
      previewMode={previewMode}
      userId={effectiveUserId}
      isSignedIn={isSignedIn}
    />
  );
}

interface CustomerBusinessDetailsContentProps {
  businessId: string;
  previewMode: BusinessDetailsPreviewMode;
  userId: string | null;
  isSignedIn: boolean;
}

function CustomerBusinessDetailsContent({
  businessId,
  previewMode,
  userId,
  isSignedIn,
}: CustomerBusinessDetailsContentProps) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isCompact, isDesktop } = useWowViewport();

  const isPreview = __DEV__ && previewMode !== 'live';

  const scrollRef = useRef<ScrollViewInstance>(null);
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

  // 4. Saved businesses queries and mutations for persistent merchant favorites
  const savedBusinessesQuery = useSavedBusinesses();
  const setSavedBusinessMutation = useSetSavedBusiness();

  // Resolve business details: live query backed with dev fixtures only when explicitly requested
  let business = businessQuery.data;
  if (__DEV__ && isPreview) {
    if (previewMode === 'no_offers') {
      business = FIXTURE_PUBLIC_BUSINESS_NO_OFFERS;
    } else if (previewMode === 'no_branches') {
      business = FIXTURE_PUBLIC_BUSINESS_NO_BRANCHES;
    } else if (previewMode === 'missing_media') {
      business = FIXTURE_PUBLIC_BUSINESS_MISSING_MEDIA;
    } else if (previewMode === 'long_content') {
      business = FIXTURE_PUBLIC_BUSINESS_LONG_CONTENT;
    } else if (previewMode === 'restricted') {
      business = null;
    } else if (!business) {
      business = FIXTURE_PUBLIC_BUSINESS;
    }
  }

  // Resolve persistent saved state
  const isSavedInQuery = Boolean(
    isSignedIn &&
      savedBusinessesQuery.data?.some(
        (b) => b && b.business_id && b.business_id.toLowerCase() === businessId.toLowerCase(),
      ),
  );

  // Honest loading indicator: do not infer "unsaved" before query resolves
  const isFavoriteLoading = Boolean(
    isSignedIn && savedBusinessesQuery.isLoading && !savedBusinessesQuery.data && !isPreview,
  );
  // The server-side saved state is unknown when this owner-scoped query fails.
  // Never present an actionable "not saved" toggle without knowing the current state.
  const isFavoriteUnavailable = Boolean(
    isSignedIn && !isPreview && savedBusinessesQuery.isError && !savedBusinessesQuery.data,
  );

  let isSaved = isSavedInQuery;
  if (__DEV__ && isPreview) {
    if (previewMode === 'auth_saved') {
      isSaved = true;
    } else if (previewMode === 'auth_unsaved' || previewMode === 'saving_pending') {
      isSaved = false;
    }
  }

  // Mutation and feedback states - clean and fresh per session-keyed instance
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);
  const [showGuestPrompt, setShowGuestPrompt] = useState(
    Boolean(__DEV__ && previewMode === 'guest_save_prompt'),
  );
  const isMutatingRef = useRef(false);
  const [isMutating, setIsMutating] = useState(
    Boolean(__DEV__ && previewMode === 'saving_pending'),
  );

  // Active identity tracking refs to discard late asynchronous mutation results if session changes in flight
  const activeUserIdRef = useRef(userId);
  const activeBusinessIdRef = useRef(businessId);
  useEffect(() => {
    activeUserIdRef.current = userId;
    activeBusinessIdRef.current = businessId;
    isMutatingRef.current = false;
  }, [userId, businessId]);

  // Synchronous race-safe favorite toggle handler
  const handleFavoriteToggle = useCallback(async () => {
    // Guest: open explicit sign-in path
    if (!isSignedIn) {
      setShowGuestPrompt(true);
      return;
    }

    // Guard duplicate mutations or toggle while favorite query is still resolving
    if (isMutatingRef.current || isFavoriteLoading || isFavoriteUnavailable) {
      return;
    }

    const mutationUserId = userId;
    const mutationBusinessId = businessId;

    isMutatingRef.current = true;
    setIsMutating(true);
    setFeedback(null);

    const nextSave = !isSaved;

    try {
      await setSavedBusinessMutation.mutateAsync({
        businessId,
        save: nextSave,
      });

      // Discard late results if user or merchant switched while mutation was in flight
      if (
        activeUserIdRef.current !== mutationUserId ||
        activeBusinessIdRef.current !== mutationBusinessId
      ) {
        return;
      }

      setFeedback({
        message: nextSave
          ? 'تمت إضافة المتجر إلى المفضلة بنجاح'
          : 'تمت إزالة المتجر من المفضلة بنجاح',
        tone: 'success',
      });
    } catch {
      if (
        activeUserIdRef.current !== mutationUserId ||
        activeBusinessIdRef.current !== mutationBusinessId
      ) {
        return;
      }

      setFeedback({
        message: nextSave
          ? 'تعذر إضافة المتجر إلى المفضلة. يرجى التحقق من اتصالك والمحاولة مجدداً.'
          : 'تعذر إزالة المتجر من المفضلة. يرجى التحقق من اتصالك والمحاولة مجدداً.',
        tone: 'danger',
      });
    } finally {
      if (
        activeUserIdRef.current === mutationUserId &&
        activeBusinessIdRef.current === mutationBusinessId
      ) {
        isMutatingRef.current = false;
        setIsMutating(false);
      }
    }
  }, [
    isSignedIn,
    isFavoriteLoading,
    isFavoriteUnavailable,
    isSaved,
    businessId,
    userId,
    setSavedBusinessMutation,
    setShowGuestPrompt,
  ]);

  const handleGuestPress = useCallback(() => {
    setShowGuestPrompt(true);
  }, [setShowGuestPrompt]);

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

      {/* Favorite Action CTA */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isFavoriteUnavailable
            ? 'تعذّر معرفة حالة المفضلة، أعد المحاولة'
            : isSaved
            ? `إزالة ${business.name} من المفضلة`
            : `حفظ ${business.name} في المفضلة`
        }
        accessibilityState={{
          selected: isSaved,
          disabled: isMutating || isFavoriteLoading || isFavoriteUnavailable,
        }}
        disabled={isMutating || isFavoriteLoading || isFavoriteUnavailable}
        onPress={handleFavoriteToggle}
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 14,
          backgroundColor: isSaved
            ? isDark
              ? 'rgba(250, 204, 21, 0.15)'
              : '#FEF9C3'
            : colors.surface,
          borderWidth: 1,
          borderColor: isSaved
            ? isDark
              ? '#FDE047'
              : '#EAB308'
            : colors.border,
        }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {isMutating || isFavoriteLoading ? (
          <ActivityIndicator size="small" color="#FACC15" />
        ) : (
          <Heart
            size={16}
            color={
              isSaved
                ? isDark
                  ? '#FACC15'
                  : '#854D0E'
                : isDark
                ? '#94A3B8'
                : colors.foreground
            }
            fill={isSaved ? (isDark ? '#FACC15' : '#FACC15') : 'none'}
            strokeWidth={2}
          />
        )}
        <AppText
          style={{
            fontSize: 14,
            fontWeight: isSaved ? '800' : '700',
            color: isSaved
              ? isDark
                ? '#FACC15'
                : '#854D0E'
              : colors.foreground,
          }}
        >
          {isMutating
            ? (isSaved ? 'جارٍ الإزالة...' : 'جارٍ الحفظ...')
            : isFavoriteLoading
            ? 'جارٍ التحميل...'
            : isFavoriteUnavailable
            ? 'تعذّر تحميل المفضلة'
            : isSaved
            ? 'محفوظ'
            : 'حفظ التاجر'}
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

      {feedback && (
        <View
          style={{
            maxWidth: 1200,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: isCompact ? 16 : 24,
            paddingTop: 12,
          }}
        >
          <ToastBanner
            visible={Boolean(feedback)}
            message={feedback.message}
            tone={feedback.tone}
            onDismiss={() => setFeedback(null)}
          />
        </View>
      )}

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
            businessId={business.id}
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
            isSaved={isSaved}
            isFavoritePending={isMutating || isFavoriteLoading}
            isFavoriteDisabled={isFavoriteUnavailable}
            onFavoriteToggle={handleFavoriteToggle}
            onFavoriteGuestPress={handleGuestPress}
          />

          {/* Quick Actions Row */}
          {renderQuickActions()}

          {isFavoriteUnavailable && (
            <View style={{ gap: 8, alignItems: 'flex-start' }}>
              <AppText style={{ color: colors.mutedForeground, textAlign: 'right' }}>
                تعذّر التحقق من حالة حفظ المتجر. أعد تحميل المفضلة قبل الحفظ أو الإزالة.
              </AppText>
              <AppButton
                title="إعادة تحميل المفضلة"
                variant="outline"
                onPress={() => { void savedBusinessesQuery.refetch(); }}
                style={{ minHeight: 48 }}
              />
            </View>
          )}

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

              <View style={{ marginTop: 8, gap: 10 }}>
                <AppButton
                  title="عرض صفحة العرض الكاملة"
                  variant="primary"
                  onPress={() => {
                    const targetId = selectedOfferId;
                    setSelectedOfferId(null);
                    if (targetId) {
                      router.push({ pathname: '/offer/[id]', params: { id: targetId } });
                    }
                  }}
                />
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

      {/* Guest Sign-In Prompt BottomSheet */}
      <BottomSheet
        visible={showGuestPrompt}
        title="حفظ التاجر في المفضلة"
        onClose={() => setShowGuestPrompt(false)}
      >
        <View style={{ gap: 16, paddingVertical: 8 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FEF9C3',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
            }}
          >
            <Heart size={28} color="#FACC15" fill={isDark ? '#FACC15' : '#FACC15'} />
          </View>

          <View style={{ gap: 6, alignItems: 'center' }}>
            <AppText
              variant="heading"
              style={{ fontSize: 18, fontWeight: '800', textAlign: 'center', color: colors.foreground }}
            >
              حفظ التاجر يتطلب تسجيل الدخول
            </AppText>
            <AppText
              variant="caption"
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: isDark ? '#94A3B8' : colors.mutedForeground,
                textAlign: 'center',
                maxWidth: 360,
              }}
            >
              سجّل الدخول إلى حسابك لإضافة هذا المتجر إلى متاجرك المفضلة ومتابعة عروضه الجديدة في أي وقت.
            </AppText>
          </View>

          <View style={{ gap: 10, marginTop: 8 }}>
            <AppButton
              title="تسجيل الدخول"
              variant="primary"
              onPress={() => {
                setShowGuestPrompt(false);
                router.push('/sign-in');
              }}
            />
            <AppButton
              title="متابعة التصفح"
              variant="outline"
              onPress={() => setShowGuestPrompt(false)}
            />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
