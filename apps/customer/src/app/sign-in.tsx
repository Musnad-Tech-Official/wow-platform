import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { useSSO } from '@wow/auth';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';

type Provider = 'oauth_google' | 'oauth_facebook';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isDesktop } = useWowViewport();

  const params = useLocalSearchParams<{ mode?: string }>();
  const [isSignUp, setIsSignUp] = useState(params.mode === 'sign-up');

  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);

  async function signIn(provider: Provider) {
    if (loading) return;
    setLoading(true);

    try {
      // Use the same callback route that Expo Router registers for the web
      // popup. On native this resolves to the app's configured "customer" scheme.
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'customer',
        path: 'sso-callback',
      });

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: provider,
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
      } else {
        Alert.alert(
          isSignUp ? 'لم يكتمل إنشاء الحساب' : 'لم يكتمل تسجيل الدخول',
          'تعذر تفعيل الجلسة أو يتطلب الحساب خطوات إضافية من مزود الهوية.',
        );
      }
    } catch (error) {
      Alert.alert(
        'حدث خطأ',
        error instanceof Error ? error.message : 'تعذر إتمام العملية',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/access');
    }
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
      {/* Container */}
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isDesktop ? 480 : 420,
          alignSelf: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 12,
            minHeight: 56,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={handleBack}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={22} color={colors.foreground} />
          </Pressable>

          <AppText
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.foreground,
              textAlign: 'center',
            }}
          >
            {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </AppText>

          <View style={{ width: 48, height: 48 }} />
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 24,
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', alignItems: 'center', gap: 20 }}>
            {/* Title & Subtitle */}
            <View style={{ alignItems: 'center', gap: 8 }}>
              <AppText
                style={{
                  fontSize: isDesktop ? 26 : 24,
                  fontWeight: '900',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                {isSignUp ? 'انضم إلى عائلة WOW' : 'أهلاً بعودتك!'}
              </AppText>

              <AppText
                style={{
                  fontSize: 14,
                  color: isDark ? '#CBD5E1' : '#475569',
                  textAlign: 'center',
                  lineHeight: 22,
                  maxWidth: 340,
                }}
              >
                {isSignUp
                  ? 'أنشئ حسابك للاستفادة من كامل المزايا، وحفظ عروضك وتجارك المفضلين ومزامنتها عبر جميع أجهزتك.'
                  : 'سجّل دخولك لمتابعة استكشاف أفضل العروض وتخصيص تجربتك ومزامنة مفضلتك.'}
              </AppText>
            </View>

            {/* Provider Buttons */}
            <View style={{ width: '100%', gap: 12, marginTop: 12 }}>
              <AppButton
                title={isSignUp ? 'التسجيل بواسطة Google' : 'المتابعة باستخدام Google'}
                variant="primary"
                disabled={loading}
                onPress={() => void signIn('oauth_google')}
                style={{ height: 52, borderRadius: 26 }}
              />

              <AppButton
                title={isSignUp ? 'التسجيل بواسطة Facebook' : 'المتابعة باستخدام Facebook'}
                variant="outline"
                disabled={loading}
                onPress={() => void signIn('oauth_facebook')}
                style={{
                  height: 52,
                  borderRadius: 26,
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                }}
              />

              {loading && <ActivityIndicator style={{ marginTop: 8 }} color="#FACC15" />}
            </View>

            {/* Mode Switcher */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSignUp ? 'الانتقال لتسجيل الدخول' : 'الانتقال لإنشاء حساب'}
              onPress={() => setIsSignUp(!isSignUp)}
              style={{
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                marginTop: 8,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                {isSignUp
                  ? 'لديك حساب بالفعل؟ تسجيل الدخول ←'
                  : 'ليس لديك حساب؟ إنشاء حساب جديد ←'}
              </AppText>
            </Pressable>
          </View>
        </ScrollView>

        {/* Footnote */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
          <AppText
            style={{
              fontSize: 11,
              color: isDark ? '#94A3B8' : '#64748B',
              textAlign: 'center',
              lineHeight: 16,
            }}
          >
            بتسجيلك فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بمنصة WOW
          </AppText>
        </View>
      </View>
    </View>
  );
}
