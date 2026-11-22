import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ExternalLink, ShieldCheck } from 'lucide-react-native';
import { useSSO } from '@wow/auth';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppButton, AppText, Card } from '@wow/ui';
import { resolveAuthErrorMessage, validateInternalReturnPath } from './auth-display';
import { useGuestStore } from '../../state/guest-store';

export interface CustomerAccountRecoveryScreenProps {
  initialReturnTo?: string | null;
  initialOfferId?: string | null;
}

export function CustomerAccountRecoveryScreen({
  initialReturnTo,
  initialOfferId,
}: CustomerAccountRecoveryScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isDesktop } = useWowViewport();
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  const { startSSOFlow } = useSSO();
  const enterGuest = useGuestStore((state) => state.enterGuest);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  async function handleProviderRetry(provider: 'oauth_google' | 'oauth_facebook') {
    if (loadingProvider) return;
    setLoadingProvider(provider);

    try {
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
        const target = validateInternalReturnPath(initialReturnTo, initialOfferId);
        router.replace(target as any);
      } else {
        Alert.alert(
          'لم يكتمل تسجيل الدخول',
          'تعذر تفعيل الجلسة أو يتطلب الحساب خطوات إضافية من مزود الهوية.',
        );
      }
    } catch (error) {
      const message = resolveAuthErrorMessage(error, false);
      Alert.alert('تنبيه تسجيل الدخول', message);
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleOpenOfficialHelp(url: string, providerName: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('تعذر فتح الرابط', `يرجى زيارة مركز مساعدة ${providerName} عبر متصفحك.`);
      }
    } catch {
      Alert.alert('تعذر فتح الرابط', `يرجى زيارة مركز مساعدة ${providerName} عبر متصفحك.`);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/sign-in');
    }
  }

  function handleContinueAsGuest() {
    // Set the persisted guest access state before navigating through the root route gate.
    enterGuest();
    router.replace('/discover');
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
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isDesktop ? 520 : 440,
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
            مساعدة في استعادة الوصول
          </AppText>

          <View style={{ width: 48, height: 48 }} />
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Explanation Hero Card */}
          <Card
            {...rtlWebProps}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 20,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#1E293B' : '#FEF9C3',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={22} color="#EAB308" />
              </View>
              <AppText
                variant="heading"
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'right',
                  flex: 1,
                }}
              >
                كيف يعمل تسجيل الدخول في WOW؟
              </AppText>
            </View>

            <AppText
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: isDark ? '#CBD5E1' : '#475569',
                textAlign: 'right',
              }}
            >
              تعتمد منصة WOW المصادقة الآمنة والمباشرة عبر حسابك المعتمد لدى Google أو Facebook. نحن لا نخزن كلمات مرور لحسابك ولا نرسل رموز تحقق عبر الرسائل القصيرة (SMS)، وذلك لضمان أعلى معايير الخصوصية والأمان.
            </AppText>

            <AppText
              style={{
                fontSize: 13,
                lineHeight: 20,
                color: isDark ? '#94A3B8' : '#64748B',
                textAlign: 'right',
              }}
            >
              إذا واجهت صعوبة في تسجيل الدخول، يُرجى استعادة الوصول عبر صفحة استرداد الحساب الرسمية لمزود الخدمة، ثم إعادة تسجيل الدخول فور استعادة حسابك.
            </AppText>
          </Card>

          {/* Provider Section 1: Google */}
          <Card
            {...rtlWebProps}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 18,
              gap: 14,
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText
                variant="heading"
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                حساب Google
              </AppText>
              <AppText
                style={{
                  fontSize: 13,
                  color: isDark ? '#94A3B8' : '#64748B',
                  textAlign: 'right',
                  lineHeight: 19,
                }}
              >
                إذا كان حسابك في WOW مرتبطاً بحساب Google، يمكنك إعادة المحاولة مباشرة أو زيارة صفحة استرداد Google.
              </AppText>
            </View>

            <AppButton
              title="إعادة المحاولة عبر Google"
              variant="primary"
              disabled={loadingProvider !== null}
              onPress={() => void handleProviderRetry('oauth_google')}
              style={{ height: 48, borderRadius: 24 }}
            />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="فتح صفحة استرداد حساب Google الرسمية"
              onPress={() =>
                void handleOpenOfficialHelp(
                  'https://accounts.google.com/signin/recovery',
                  'Google',
                )
              }
              style={{
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 8,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ExternalLink size={16} color={isDark ? '#93C5FD' : '#2563EB'} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: isDark ? '#93C5FD' : '#2563EB',
                }}
              >
                صفحة استرداد حساب Google الرسمية
              </AppText>
            </Pressable>
          </Card>

          {/* Provider Section 2: Facebook */}
          <Card
            {...rtlWebProps}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 18,
              gap: 14,
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText
                variant="heading"
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                حساب Facebook
              </AppText>
              <AppText
                style={{
                  fontSize: 13,
                  color: isDark ? '#94A3B8' : '#64748B',
                  textAlign: 'right',
                  lineHeight: 19,
                }}
              >
                إذا كان حسابك مرتبطاً بـ Facebook، يمكنك المتابعة أو مراجعة إرشادات مساعدة Facebook.
              </AppText>
            </View>

            <AppButton
              title="إعادة المحاولة عبر Facebook"
              variant="outline"
              disabled={loadingProvider !== null}
              onPress={() => void handleProviderRetry('oauth_facebook')}
              style={{
                height: 48,
                borderRadius: 24,
                borderColor: isDark ? '#334155' : '#CBD5E1',
              }}
            />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="فتح صفحة مساعدة حساب Facebook الرسمية"
              onPress={() =>
                void handleOpenOfficialHelp(
                  'https://www.facebook.com/login/identify',
                  'Facebook',
                )
              }
              style={{
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 8,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ExternalLink size={16} color={isDark ? '#93C5FD' : '#2563EB'} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: isDark ? '#93C5FD' : '#2563EB',
                }}
              >
                صفحة مساعدة وتحديد حساب Facebook
              </AppText>
            </Pressable>
          </Card>

          {loadingProvider && (
            <ActivityIndicator style={{ marginVertical: 8 }} color="#FACC15" />
          )}

          {/* Discovery / Guest Fallback */}
          <View style={{ alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="المتابعة كزائر واستكشاف العروض"
              onPress={handleContinueAsGuest}
              style={{
                minHeight: 48,
                paddingVertical: 10,
                alignItems: 'center',
                justifyContent: 'center',
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
                المتابعة كزائر واستكشاف العروض ←
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
