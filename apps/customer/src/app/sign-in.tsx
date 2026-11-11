import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, HelpCircle, Info } from 'lucide-react-native';
import { useSSO } from '@wow/auth';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppButton, AppText, Card } from '@wow/ui';
import { resolveAuthErrorMessage, validateInternalReturnPath } from '../features/auth/auth-display';

type Provider = 'oauth_google' | 'oauth_facebook';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isDesktop } = useWowViewport();
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  const params = useLocalSearchParams<{
    mode?: string;
    returnTo?: string;
    offerId?: string;
    action?: string;
    preview?: string;
  }>();

  // Mode: sign-up vs sign-in
  const isInitialSignUp = params.mode === 'sign-up' || params.preview === 'sign-up';
  const [isSignUp, setIsSignUp] = useState(isInitialSignUp);

  // Return navigation intent
  const validatedReturnTarget = validateInternalReturnPath(params.returnTo, params.offerId);
  const hasGatedReturnIntent =
    Boolean(params.returnTo || params.action || params.offerId || params.preview === 'return-intent') &&
    validatedReturnTarget !== '/';

  const isRateAction = params.action === 'rate' || params.returnTo?.includes('/rate') || params.preview === 'return-intent';

  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    params.preview === 'error' ? 'تم إلغاء عملية المصادقة من قبلك.' : null,
  );

  async function signIn(provider: Provider) {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

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

        // Safe continuable return destination: strictly validated against internal routes
        const destination = validateInternalReturnPath(params.returnTo, params.offerId);
        router.replace(destination as any);
      } else {
        const errorMsg = 'تعذر تفعيل الجلسة أو يتطلب الحساب خطوات إضافية من مزود الهوية.';
        setErrorMessage(errorMsg);
        Alert.alert(
          isSignUp ? 'لم يكتمل إنشاء الحساب' : 'لم يكتمل تسجيل الدخول',
          errorMsg,
        );
      }
    } catch (error) {
      const friendlyMessage = resolveAuthErrorMessage(error, isSignUp);
      setErrorMessage(friendlyMessage);
      Alert.alert(
        isSignUp ? 'تنبيه إنشاء الحساب' : 'تنبيه تسجيل الدخول',
        friendlyMessage,
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

  function handleNavigateRecovery() {
    router.push({
      pathname: '/recovery',
      params: {
        returnTo: params.returnTo,
        offerId: params.offerId,
      },
    });
  }

  return (
    <View
      {...rtlWebProps}
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
            paddingVertical: 20,
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', alignItems: 'center', gap: 18 }}>
            {/* Gated Intent Banner (if redirected from a gated action) */}
            {hasGatedReturnIntent && (
              <Card
                {...rtlWebProps}
                style={{
                  width: '100%',
                  backgroundColor: isDark ? '#1E293B' : '#FEF9C3',
                  borderColor: isDark ? '#334155' : '#FDE047',
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Info size={18} color="#CA8A04" />
                <AppText
                  style={{
                    fontSize: 13,
                    color: isDark ? '#F1F5F9' : '#854D0E',
                    textAlign: 'right',
                    flex: 1,
                    lineHeight: 18,
                  }}
                >
                  {isRateAction
                    ? 'سجّل دخولك أولاً لإتمام تقييم مطابقة العرض والمتابعة مباشرة.'
                    : 'سجّل دخولك لمتابعة الإجراء المطلوب والعودة تلقائياً.'}
                </AppText>
              </Card>
            )}

            {/* Error Message Notice if any */}
            {errorMessage && (
              <Card
                {...rtlWebProps}
                style={{
                  width: '100%',
                  backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                  borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <AppText
                  style={{
                    fontSize: 13,
                    color: isDark ? '#FCA5A5' : '#991B1B',
                    textAlign: 'right',
                    lineHeight: 18,
                  }}
                >
                  {errorMessage}
                </AppText>
              </Card>
            )}

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
            <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
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
              onPress={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage(null);
              }}
              style={{
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
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

            {/* CUS-05-03: Recovery Help Link */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مساعدة في استعادة الوصول إلى الحساب"
              onPress={handleNavigateRecovery}
              style={{
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 6,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <HelpCircle size={15} color={isDark ? '#94A3B8' : '#64748B'} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isDark ? '#94A3B8' : '#64748B',
                  textAlign: 'center',
                }}
              >
                مساعدة في استعادة الوصول إلى الحساب
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
