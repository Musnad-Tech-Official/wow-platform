import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wowBrand } from '@wow/assets';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import { useGuestStore } from '../../state/guest-store';
import { OnboardingHeader } from '../onboarding/OnboardingHeader';

export function AccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isDesktop } = useWowViewport();

  const enterGuest = useGuestStore((s) => s.enterGuest);

  function handleSignIn() {
    router.push({ pathname: '/sign-in', params: { mode: 'sign-in' } });
  }

  function handleSignUp() {
    router.push({ pathname: '/sign-in', params: { mode: 'sign-up' } });
  }

  function handleContinueAsGuest() {
    enterGuest();
    router.replace('/');
  }

  function handleBackToOnboarding() {
    router.replace('/welcome');
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Math.max(insets.top, 12),
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      {/* Responsive Wrapper (max-width 520px on desktop) */}
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isDesktop ? 520 : 480,
          alignSelf: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* 1. Header with title "ابدأ مع WOW" and Back button */}
        <OnboardingHeader
          title="ابدأ مع WOW"
          onBack={handleBackToOnboarding}
          isDark={isDark}
        />

        {/* 2. Main Scrollable Content */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 16,
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', width: '100%', gap: 20 }}>
            {/* Official WOW App Icon from @wow/assets */}
            <Image
              source={wowBrand.appIcon}
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              }}
              resizeMode="contain"
              accessibilityLabel="أيقونة تطبيق WOW"
            />

            {/* Title & Subtitle */}
            <View style={{ alignItems: 'center', gap: 8, marginTop: 4 }}>
              <AppText
                style={{
                  fontSize: isDesktop ? 26 : 24,
                  fontWeight: '900',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                كيف تحب تكمّل؟
              </AppText>

              <AppText
                style={{
                  fontSize: isDesktop ? 15 : 14,
                  color: isDark ? '#CBD5E1' : '#475569',
                  textAlign: 'center',
                  maxWidth: isDesktop ? 360 : 320,
                  lineHeight: 22,
                }}
              >
                اختر الطريقة المناسبة لك للانتقال إلى تطبيق WOW.
              </AppText>
            </View>

            {/* Action Buttons */}
            <View style={{ width: '100%', gap: 12, marginTop: 12 }}>
              {/* Primary: Sign In */}
              <AppButton
                title="تسجيل الدخول"
                variant="primary"
                onPress={handleSignIn}
                style={{
                  height: 52,
                  borderRadius: 26,
                }}
              />

              {/* Secondary: Sign Up */}
              <AppButton
                title="إنشاء حساب"
                variant="outline"
                onPress={handleSignUp}
                style={{
                  height: 52,
                  borderRadius: 26,
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                }}
              />

              {/* Tertiary: Continue as Guest */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="المتابعة كضيف"
                onPress={handleContinueAsGuest}
                style={{
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: colors.foreground,
                    textAlign: 'center',
                  }}
                >
                  المتابعة كضيف ←
                </AppText>
              </Pressable>

              {/* Guest Caution Note */}
              <AppText
                style={{
                  fontSize: 12,
                  color: isDark ? '#94A3B8' : '#475569',
                  textAlign: 'center',
                  lineHeight: 18,
                  paddingHorizontal: 8,
                }}
              >
                يمكنك استكشاف العروض كضيف، لحفظ العروض والتجار في المفضلة تحتاج إلى تسجيل الدخول.
              </AppText>
            </View>
          </View>
        </ScrollView>

        {/* 3. Bottom Footnote */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
          <AppText
            style={{
              fontSize: 11,
              color: isDark ? '#94A3B8' : '#64748B',
              textAlign: 'center',
            }}
          >
            لا يُنشأ حساب عند اختيار المتابعة كضيف
          </AppText>
        </View>
      </View>
    </View>
  );
}