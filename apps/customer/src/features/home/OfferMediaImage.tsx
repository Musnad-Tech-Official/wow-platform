import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import {
  signPublicOfferMedia,
  usePublicOfferMedia,
  useWowPublicSupabaseClient,
} from '@wow/api';
import { AppText } from '@wow/ui';

export interface OfferMediaImageProps {
  offerId: string;
  isDark: boolean;
  title: string;
}

export function OfferMediaImage({ offerId, isDark, title }: OfferMediaImageProps) {
  const getClient = useWowPublicSupabaseClient();
  const { data: mediaList, isLoading: isMediaLoading } = usePublicOfferMedia(offerId);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    async function signCover() {
      if (!mediaList || mediaList.length === 0) {
        if (isMounted) {
          setSignedUrl(null);
          setIsSigning(false);
        }
        return;
      }

      const client = getClient();
      if (!client) {
        if (isMounted) setIsSigning(false);
        return;
      }

      const cover = mediaList.find((m) => m.is_cover) ?? mediaList[0];
      if (!cover) return;

      try {
        if (isMounted) setIsSigning(true);
        // Valid for 120 seconds (maximum permitted by signPublicOfferMedia)
        const url = await signPublicOfferMedia(client, cover, 120);
        if (isMounted) {
          setSignedUrl(url);
          setHasError(false);
          setIsSigning(false);

          // Proactively refresh before 120s expiry
          refreshTimer = setTimeout(() => {
            if (isMounted) signCover();
          }, 90_000);
        }
      } catch {
        if (isMounted) {
          setHasError(true);
          setIsSigning(false);
        }
      }
    }

    void signCover();

    return () => {
      isMounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [mediaList, getClient]);

  // If a valid signed URL is ready and no error occurred, display the authorized image
  if (signedUrl && !hasError) {
    return (
      <View
        style={{
          height: 108,
          width: '100%',
          backgroundColor: isDark ? '#1C2433' : '#CBD5E1',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: signedUrl }}
          style={{ width: '100%', height: 108 }}
          resizeMode="cover"
          accessibilityLabel={title}
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  // Approved WOW watermark fallback placeholder
  return (
    <View
      style={{
        height: 108,
        width: '100%',
        backgroundColor: isDark ? '#1C2433' : '#CBD5E1',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Soft gradient tone */}
      <View
        aria-hidden={true}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: isDark ? '#172030' : '#B5C4D0',
          opacity: 0.85,
        }}
      />
      <View
        aria-hidden={true}
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: 'rgba(251, 188, 14, 0.28)',
        }}
      />

      {/* Loading indicator while signing or fetching media */}
      {(isMediaLoading || isSigning) ? (
        <ActivityIndicator size="small" color="#FACC15" />
      ) : (
        /* WOW Watermark */
        <AppText
          aria-hidden={true}
          style={{
            fontSize: 24,
            fontWeight: '900',
            color: isDark ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.55)',
            letterSpacing: 2,
          }}
        >
          WOW
        </AppText>
      )}
    </View>
  );
}
