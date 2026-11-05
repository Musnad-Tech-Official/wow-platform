import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { isSafePublicImageUrl } from './offer-display';

export interface OfferMerchantIdentityCardProps {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
  isDark: boolean;
}

export function OfferMerchantIdentityCard({
  businessId,
  businessName,
  logoUrl,
  isDark,
}: OfferMerchantIdentityCardProps) {
  const router = useRouter();
  const initialChar = businessName.trim().charAt(0) || 'م';
  const hasValidLogo = isSafePublicImageUrl(logoUrl);

  function handlePress() {
    router.push({
      pathname: '/business/[id]',
      params: { id: businessId },
    });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`الملف العام للتاجر ${businessName}`}
      accessibilityHint="ينقلك إلى صفحة المتجر التفصيلية"
      onPress={handlePress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
        backgroundColor: isDark ? '#111827' : '#FFFFFF',
        borderWidth: 1,
        borderColor: isDark ? '#1F2937' : '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.05,
        shadowRadius: 3,
        elevation: 2,
        opacity: pressed ? 0.85 : 1,
      })}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {/* 1. Merchant Identity Row (Right in RTL) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Logo Container / Initial Fallback */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FFFBEB',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(250, 204, 21, 0.35)' : '#FDE68A',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {hasValidLogo ? (
            <Image
              source={{ uri: logoUrl! }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <AppText
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: isDark ? '#FACC15' : '#B45309',
                textAlign: 'center',
              }}
            >
              {initialChar}
            </AppText>
          )}
        </View>

        {/* Text Metadata */}
        <View style={{ flex: 1, gap: 2 }}>
          <AppText
            variant="heading"
            numberOfLines={1}
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: isDark ? '#F8FAFC' : '#0F172A',
              textAlign: 'right',
            }}
          >
            {businessName}
          </AppText>
          <AppText
            variant="caption"
            numberOfLines={1}
            style={{
              fontSize: 13,
              color: isDark ? '#94A3B8' : '#64748B',
              textAlign: 'right',
            }}
          >
            الملف العام للتاجر
          </AppText>
        </View>
      </View>

      {/* 2. Navigation Arrow (Left in RTL points forward) */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 8,
        }}
      >
        <ArrowLeft size={18} color={isDark ? '#94A3B8' : '#64748B'} />
      </View>
    </Pressable>
  );
}
