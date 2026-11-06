import { Image, View } from 'react-native';
import { wowIllustrations } from '@wow/assets';
import { AppText } from '@wow/ui';

export interface OnboardingHeroWelcomeProps {
  isDark?: boolean;
  isDesktop?: boolean;
}

export function OnboardingHeroWelcome({ isDark = false, isDesktop = false }: OnboardingHeroWelcomeProps) {
  const medallionSize = isDesktop ? 290 : 260;
  const outerRingSize = isDesktop ? 320 : 290;
  const couponWidth = isDesktop ? 190 : 170;
  const couponHeight = isDesktop ? 116 : 104;
  const notchTop = isDesktop ? 50 : 44;
  const notchBg = isDark ? '#262215' : '#FEF9C3';

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
      }}
    >
      {/* 1. Large Circular Medallion */}
      <View
        style={{
          width: medallionSize,
          height: medallionSize,
          borderRadius: medallionSize / 2,
          backgroundColor: isDark ? 'rgba(250, 204, 21, 0.16)' : '#FEF9C3',
          borderWidth: 2,
          borderColor: isDark ? 'rgba(250, 204, 21, 0.45)' : '#FDE047',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Subtle decorative outer ring */}
        <View
          style={{
            position: 'absolute',
            width: outerRingSize,
            height: outerRingSize,
            borderRadius: outerRingSize / 2,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: isDark ? 'rgba(250, 204, 21, 0.35)' : 'rgba(250, 204, 21, 0.4)',
          }}
        />

        {/* 2. Stylized Coupon Card inside medallion */}
        <View
          style={{
            width: couponWidth,
            height: couponHeight,
            borderRadius: 16,
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderWidth: 1.5,
            borderColor: isDark ? '#475569' : '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Coupon left cut-out notch */}
          <View
            style={{
              position: 'absolute',
              left: -8,
              top: notchTop,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: notchBg,
            }}
          />
          {/* Coupon right cut-out notch */}
          <View
            style={{
              position: 'absolute',
              right: -8,
              top: notchTop,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: notchBg,
            }}
          />

          {/* Yellow discount percentage */}
          <AppText
            style={{
              fontSize: 36,
              fontWeight: '900',
              color: '#FACC15',
              letterSpacing: 1,
            }}
          >
            %
          </AppText>

          {/* Mascot Ticket Badge / Cap */}
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              backgroundColor: '#0F172A',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#FACC15',
            }}
          >
            <View
              style={{
                width: 32,
                height: 16,
                borderRadius: 4,
                backgroundColor: '#FACC15',
                marginTop: -4,
              }}
            />
            <View
              style={{
                width: 24,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#FEF08A',
                marginTop: 4,
              }}
            />
          </View>
        </View>

        {/* 3. Small Mascot Beacon Avatar floating near top-right */}
        <View
          style={{
            position: 'absolute',
            top: 24,
            right: 28,
            width: 48,
            height: 48,
            zIndex: 2,
          }}
        >
          <Image
            source={wowIllustrations.customer.beaconHero}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            accessibilityLabel="مسكوت WOW"
          />
        </View>
      </View>
    </View>
  );
}