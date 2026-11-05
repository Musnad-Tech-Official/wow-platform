import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react-native';
import {
  signPublicOfferMedia,
  usePublicOfferMedia,
  useWowPublicSupabaseClient,
} from '@wow/api';
import { AppText } from '@wow/ui';
import type { OfferAvailabilityStatus } from './offer-display';

export interface OfferImageGalleryProps {
  offerId: string;
  isDark: boolean;
  title: string;
  isAvailable: boolean;
  availabilityLabel: string;
  availabilityStatus?: OfferAvailabilityStatus;
}

export function OfferImageGallery({
  offerId,
  isDark,
  title,
  isAvailable,
  availabilityLabel,
  availabilityStatus = isAvailable ? 'active' : 'expired',
}: OfferImageGalleryProps) {
  const getClient = useWowPublicSupabaseClient();
  const { data: mediaList, isLoading } = usePublicOfferMedia(offerId);

  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSigning, setIsSigning] = useState(false);
  const [hasSigningError, setHasSigningError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    async function signAll() {
      if (!mediaList || mediaList.length === 0) {
        if (isMounted) {
          setSignedUrls([]);
          setIsSigning(false);
        }
        return;
      }

      const client = getClient();
      if (!client) {
        if (isMounted) setIsSigning(false);
        return;
      }

      try {
        if (isMounted) setIsSigning(true);
        // Sort cover first, then by sort_order
        const sorted = [...mediaList].sort((a, b) => {
          if (a.is_cover && !b.is_cover) return -1;
          if (!a.is_cover && b.is_cover) return 1;
          return a.sort_order - b.sort_order;
        });

        const urls = await Promise.all(
          sorted.map((item) => signPublicOfferMedia(client, item, 120)),
        );

        if (isMounted) {
          setSignedUrls(urls);
          setHasSigningError(false);
          setIsSigning(false);

          // Proactively refresh before 120s expiry (at 90 seconds)
          refreshTimer = setTimeout(() => {
            if (isMounted) signAll();
          }, 90_000);
        }
      } catch {
        if (isMounted) {
          setHasSigningError(true);
          setIsSigning(false);
        }
      }
    }

    void signAll();

    return () => {
      isMounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [mediaList, getClient]);

  const totalImages = signedUrls.length;
  const currentUrl = totalImages > 0 ? signedUrls[currentIndex] : null;

  // Only display a spinner while an active loading/signing operation is in progress
  const hasMediaItems = Boolean(mediaList && mediaList.length > 0);
  const isActivelyLoading = (isLoading && !mediaList) || (isSigning && hasMediaItems);

  function handleNext() {
    if (totalImages > 1) {
      setCurrentIndex((prev) => (prev + 1) % totalImages);
    }
  }

  function handlePrev() {
    if (totalImages > 1) {
      setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
    }
  }

  // Pill styling based on authentic 3-state availability
  const pillStyle = (() => {
    if (availabilityStatus === 'active') {
      return {
        bg: isDark ? 'rgba(6, 78, 59, 0.9)' : 'rgba(236, 253, 245, 0.95)',
        border: isDark ? '#047857' : '#A7F3D0',
        text: isDark ? '#A7F3D0' : '#065F46',
        dot: '#10B981',
      };
    }
    if (availabilityStatus === 'upcoming') {
      return {
        bg: isDark ? 'rgba(120, 53, 15, 0.9)' : 'rgba(254, 243, 199, 0.95)',
        border: isDark ? '#B45309' : '#FDE68A',
        text: isDark ? '#FDE68A' : '#92400E',
        dot: '#F59E0B',
      };
    }
    // Expired
    return {
      bg: isDark ? 'rgba(51, 65, 85, 0.9)' : 'rgba(241, 245, 249, 0.95)',
      border: isDark ? '#475569' : '#CBD5E1',
      text: isDark ? '#CBD5E1' : '#475569',
      dot: '#94A3B8',
    };
  })();

  return (
    <View
      style={{
        width: '100%',
        height: 320,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: isDark ? '#111827' : '#F8FAFC',
        borderWidth: 1,
        borderColor: isDark ? '#1F2937' : '#E2E8F0',
      }}
    >
      {/* 1. Main Visual Content */}
      {currentUrl && !hasSigningError ? (
        <Image
          source={{ uri: currentUrl }}
          accessibilityLabel={title}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      ) : isActivelyLoading ? (
        /* Spinner ONLY during active fetch or signing */
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#111827' : '#F8FAFC',
          }}
        >
          <ActivityIndicator size="large" color="#FACC15" />
        </View>
      ) : (
        /* Stable Branded Fallback Container with WOW Watermark */
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#111827' : '#F8FAFC',
            position: 'relative',
          }}
        >
          {/* Concentric subtle circular watermark */}
          <View
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: isDark ? 'rgba(250, 204, 21, 0.04)' : 'rgba(250, 204, 21, 0.1)',
            }}
          />
          <View style={{ alignItems: 'center', gap: 8 }}>
            <AppText
              style={{
                fontSize: 50,
                fontWeight: '900',
                color: isDark ? '#334155' : '#CBD5E1',
                letterSpacing: 6,
              }}
            >
              WOW
            </AppText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              }}
            >
              <Tag size={14} color={isDark ? '#94A3B8' : '#64748B'} />
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: isDark ? '#94A3B8' : '#64748B',
                }}
              >
                صورة العرض الترويجي
              </AppText>
            </View>
          </View>
        </View>
      )}

      {/* 2. Availability Pill (Top-Right in RTL) */}
      <View
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: pillStyle.bg,
          borderWidth: 1,
          borderColor: pillStyle.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: pillStyle.dot,
          }}
        />
        <AppText
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: pillStyle.text,
          }}
        >
          {availabilityLabel}
        </AppText>
      </View>

      {/* 3. Multi-Image Navigation Controls (Rendered only when >1 images exist) */}
      {totalImages > 1 && (
        <>
          {/* Previous Arrow (Right side in RTL) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الصورة السابقة"
            onPress={handlePrev}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: [{ translateY: -24 }],
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={22} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </Pressable>

          {/* Next Arrow (Left side in RTL) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الصورة التالية"
            onPress={handleNext}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: [{ translateY: -24 }],
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={22} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </Pressable>

          {/* Dots Indicator & Counter Pill */}
          <View
            style={{
              position: 'absolute',
              bottom: 14,
              left: 0,
              right: 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 16,
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              {signedUrls.map((_, idx) => (
                <View
                  key={idx}
                  style={{
                    width: idx === currentIndex ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      idx === currentIndex
                        ? '#FACC15'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.3)'
                          : 'rgba(0, 0, 0, 0.2)',
                  }}
                />
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}
