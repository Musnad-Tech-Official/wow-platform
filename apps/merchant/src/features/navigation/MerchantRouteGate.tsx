import { useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { wowBrand, wowIllustrations } from '@wow/assets';
import { useWowColors, useWowViewport } from '@wow/theme';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router, useGlobalSearchParams } from 'expo-router';
import { useAuth, useSSO } from '@wow/auth';
import { AppButton, AppText, LegalDocumentLinks, ThemeSwitcher } from '@wow/ui';
import { resolveMerchantRouteAccess } from './merchant-route-access';

// Use a stable loading frame for static HTML and the first hydration render.
const noChangeSubscribe = () => () => {};

// Web OAuth popups must be completed on the client, never during Expo's static prerender.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  void WebBrowser.maybeCompleteAuthSession();
}

/** Route-only authentication boundary; Supabase RLS remains authoritative. */
export function MerchantRouteGate({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  const colors=useWowColors();
  const viewport=useWowViewport();
  const isClient = useSyncExternalStore(noChangeSubscribe, () => true, () => false);
  const { startSSOFlow } = useSSO();
  const { preview } = useGlobalSearchParams<{ preview?: string }>();
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const access = resolveMerchantRouteAccess(
    isLoaded, isSignedIn ?? false,
    __DEV__ === true, preview,
  );

  const signIn = async (strategy: 'oauth_google' | 'oauth_facebook') => {
    if (signInBusy) return;
    setSignInBusy(true);
    setSignInError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'merchant', path: 'oauth-callback' }),
      });
      if (!createdSessionId || !setActive) {
        throw new Error('لم تكتمل المصادقة. أعد المحاولة بعد إكمال خطوات تسجيل الدخول.');
      }
      await setActive({ session: createdSessionId });
    } catch {
      // Never display raw provider/Clerk error details or transient credentials.
      setSignInError('تعذر إكمال تسجيل الدخول عبر مزود الهوية. يرجى إعادة المحاولة.');
    } finally {
      setSignInBusy(false);
    }
  };

  if (isClient && access === 'allow') return <>{children}</>;

  if (!isClient || access === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator accessibilityLabel="جارٍ التحقق من تسجيل الدخول" />
        <AppText muted>جارٍ التحقق من تسجيل الدخول...</AppText>
      </View>
    );
  }

  return (
    <ScrollView testID="wow-merchant-login-canvas" className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow:1,justifyContent:'center',alignItems:'center',padding:16,gap:16 }}
      keyboardShouldPersistTaps="handled">
      <View className="w-full max-w-4xl items-end"><ThemeSwitcher /></View>
      <View style={{width:'100%',maxWidth:900,flexDirection:viewport.isDesktop?'row':'column',borderRadius:24,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface}}>
        <View style={{flex:viewport.isDesktop?1:undefined,backgroundColor:colors.primary,padding:24,alignItems:'center',justifyContent:'center',gap:12}}>
          <Image source={wowBrand.logoNavy} contentFit="contain" alt="شعار واو" style={{width:130,height:60}} />
          <Image source={wowIllustrations.merchant.beaconWelcome} contentFit="contain" alt="" style={{width:'100%',maxWidth:220,height:140}} />
          <AppText variant="heading" style={{color:colors.primaryForeground,textAlign:'center'}}>مساحة التاجر</AppText>
          <AppText style={{color:colors.primaryForeground,textAlign:'center'}}>إدارة نشاطك وعروضك وفروعك من مكان واحد.</AppText>
        </View>
        <View style={{flex:viewport.isDesktop?1:undefined,padding:24,gap:16}}>
          <AppText variant="heading" className="text-right">تسجيل الدخول مطلوب</AppText>
          <AppText muted className="text-right">يرجى تسجيل الدخول بحساب تاجر للوصول إلى مساحة التاجر.</AppText>
          {signInError ? <AppText tone="danger" accessibilityLiveRegion="polite">{signInError}</AppText> : null}
          <View className="w-full gap-3">
            <AppButton title="تسجيل الدخول عبر Google" disabled={signInBusy} onPress={() => void signIn('oauth_google')} />
            <AppButton title="تسجيل الدخول عبر Facebook" variant="secondary" disabled={signInBusy} onPress={() => void signIn('oauth_facebook')} />
            <AppButton title="استعادة الوصول إلى الحساب" variant="outline" disabled={signInBusy} onPress={() => router.push('/auth/recovery')} />
            {signInBusy && <ActivityIndicator color={colors.actionForeground} accessibilityLabel="جارٍ تسجيل الدخول" />}
          </View>
          <LegalDocumentLinks termsUrl={process.env.EXPO_PUBLIC_WOW_TERMS_URL} privacyUrl={process.env.EXPO_PUBLIC_WOW_PRIVACY_URL} />
          <AppText variant="caption" muted className="text-right">الدخول لا يمنح تفويضاً على أي نشاط تلقائياً؛ يتحقق الخادم من الصلاحيات.</AppText>
        </View>
      </View>
    </ScrollView>
  );
}
