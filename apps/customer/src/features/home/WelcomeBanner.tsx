import { Image } from 'expo-image';
import { View } from 'react-native';
import { wowIllustrations } from '@wow/assets';
import { wowBrandColors } from '@wow/theme';
import { AppText } from '@wow/ui';

export function WelcomeBanner() {
  return (
    <View
      style={{
        backgroundColor: wowBrandColors.yellow,
        borderRadius: 24,
        paddingVertical: 18,
        paddingHorizontal: 20,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 140,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Decorative subtle background rings */}
      <View
        aria-hidden={true}
        style={{
          position: 'absolute',
          left: -20,
          top: -20,
          width: 180,
          height: 180,
          borderRadius: 90,
          borderWidth: 24,
          borderColor: 'rgba(255, 255, 255, 0.18)',
        }}
      />
      <View
        aria-hidden={true}
        style={{
          position: 'absolute',
          left: -40,
          top: -40,
          width: 220,
          height: 220,
          borderRadius: 110,
          borderWidth: 20,
          borderColor: 'rgba(255, 255, 255, 0.10)',
        }}
      />

      {/* Text Copy on the right in RTL */}
      <View style={{ flex: 1, paddingEnd: 12, gap: 4, zIndex: 1 }}>
        <AppText
          variant="caption"
          style={{
            color: '#111A2F',
            fontWeight: '700',
            fontSize: 12,
            textAlign: 'right',
          }}
        >
          أهلاً بك في WOW
        </AppText>

        <AppText
          variant="title"
          style={{
            color: '#111A2F',
            fontSize: 20,
            lineHeight: 28,
            fontWeight: '800',
            textAlign: 'right',
          }}
        >
          كل عرض يستحق نظرة.
        </AppText>

        <AppText
          variant="caption"
          style={{
            color: '#111A2F',
            opacity: 0.88,
            fontSize: 11,
            lineHeight: 17,
            textAlign: 'right',
          }}
        >
          اكتشف العروض، قارن التفاصيل، واختر ما يناسبك.
        </AppText>
      </View>

      {/* Mascot illustration on the left in RTL */}
      <View style={{ width: 100, height: 115, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <Image
          source={wowIllustrations.customer.beaconHero}
          contentFit="contain"
          alt="شخصية واو الترحيبية"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    </View>
  );
}
