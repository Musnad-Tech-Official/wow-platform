import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppText } from '@wow/ui';

/**
 * MER-01-02: recovery of the external SSO identity only.
 *
 * This page is intentionally reachable without a merchant session, and it
 * never accepts credentials, recovery codes, business IDs or delegation grants.
 * Google/Facebook verify ownership on their own trusted domains. The WOW
 * server must re-authorize activity and branch scope after sign-in.
 */
const recoveryLinks = {
  google: 'https://accounts.google.com/signin/recovery',
  facebook: 'https://www.facebook.com/login/identify',
} as const;

export default function MerchantAccountRecovery() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'google' | 'facebook' | null>(null);

  const openRecovery = async (provider: keyof typeof recoveryLinks) => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    try {
      await Linking.openURL(recoveryLinks[provider]);
    } catch {
      setError('تعذر فتح صفحة استعادة الحساب. تحقق من الاتصال ثم أعد المحاولة.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ direction: 'rtl' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-lg self-center gap-5">
          <AppText variant="heading" className="text-right font-tajawal-bold">
            استعادة الوصول إلى حساب التاجر
          </AppText>
          <AppText variant="body" className="text-right">
            يستخدم تطبيق واو تسجيل الدخول عبر Google أو Facebook.
            استعد الوصول إلى نفس الحساب لدى مزود الهوية أولًا، ثم سجّل الدخول من جديد.
          </AppText>

          <View className="rounded-2xl border border-border p-4 gap-3">
            <AppText variant="label" className="text-right font-tajawal-bold">
              اختيار مزود الهوية
            </AppText>
            <AppButton title="استعادة حساب Google"
              disabled={busy !== null}
              onPress={() => void openRecovery('google')} />
            <AppButton title="استعادة حساب Facebook" variant="outline"
              disabled={busy !== null}
              onPress={() => void openRecovery('facebook')} />
          </View>

          <View className="rounded-2xl border border-border p-4 gap-2">
            <AppText variant="label" className="text-right font-tajawal-bold">
              فقدان الوصول بالكامل أو سحب التفويض
            </AppText>
            <AppText variant="body" className="text-right">
              استعادة حساب Google أو Facebook لا تعيد ملكية نشاط أو تفويضًا ملغى.
              الحالات الاستثنائية تتطلب تحققًا مستقلاً من الهوية والصلاحية وإجراءً إداريًا موثقًا.
              لا تشارك كلمات المرور أو رموز التحقق مع أي شخص.
            </AppText>
          </View>

          {error ? (
            <AppText variant="caption" tone="danger" className="text-right">{error}</AppText>
          ) : null}

          <AppButton title="العودة إلى تسجيل الدخول" variant="outline"
            onPress={() => router.replace('/')} />
        </View>
      </ScrollView>
    </View>
  );
}
