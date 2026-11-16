import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as AuthSession from 'expo-auth-session';
import { ShieldCheck, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { wowBrand } from '@wow/assets';
import { AppText, AppButton } from '@wow/ui';
import { useTheme } from '@wow/theme';
import { useSSO } from '@wow/auth';
import type { AdminAccessStatus } from '../auth/admin-access';
import { CompactThemeControl } from '../theme/CompactThemeControl';

interface AdminAccessScreenProps {
  status: AdminAccessStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
  onSignOut?: () => Promise<void>;
  userEmail?: string;
}

export function AdminAccessScreen({
  status,
  errorMessage,
  onRetry,
  onSignOut,
  userEmail,
}: AdminAccessScreenProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { startSSOFlow } = useSSO();
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const handleSSO = async (strategy: 'oauth_google' | 'oauth_facebook') => {
    if (ssoLoading) return;
    setSsoLoading(true);
    setSsoError(null);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'admin',
        path: 'oauth-callback',
      });
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl,
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else {
        setSsoError('لم تكتمل المصادقة. لم تُفعّل جلسة دخول جديدة.');
      }
    } catch (err) {
      setSsoError(err instanceof Error ? err.message : 'تعذر إتمام تسجيل الدخول عبر مزود الهوية.');
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <ScrollView
      {...(Platform.OS === 'web' ? { dir: 'rtl' as const } : {})}
      testID="wow-admin-login-canvas"
      className={isDark ? 'flex-1 bg-[#101014]' : 'flex-1 bg-[#F6F7F6]'}
      contentContainerClassName="flex-grow justify-center items-center p-4 sm:p-6 lg:p-10"
      keyboardShouldPersistTaps="handled"
    >
      {/* Compact Theme Control in Top Corner */}
      <View className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <CompactThemeControl />
      </View>

      <View
        className={`w-full max-w-5xl rounded-3xl overflow-hidden shadow-xl border flex-col lg:flex-row lg:min-h-[580px] ${
          isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E2E8F0]'
        }`}
      >
        {/* Brand Card (Golden Yellow Panel) */}
        <View className="bg-[#FACC15] justify-between p-6 sm:p-10 lg:p-12 w-full lg:w-5/12 py-8 lg:py-12">
          <View className="items-start">
            {/* Official WOW Navy Logo on Yellow */}
            <Image
              source={wowBrand.logoNavy}
              contentFit="contain"
              alt="شعار واو الرسمي"
              style={{ width: 130, height: 60, marginBottom: 20 }}
            />

            <AppText className="text-3xl sm:text-4xl font-tajawal-bold text-[#0F172D] leading-tight text-right mb-3">
              قرارات موثّقة.
            </AppText>
            <AppText className="text-base sm:text-lg font-tajawal-bold text-[#1E293B] leading-relaxed text-right">
              إدارة دقيقة للأنشطة والعروض والشكاوى.
            </AppText>
          </View>

          <View className="pt-6 sm:pt-8">
            <View className="flex-row items-center gap-2 bg-[#0F172D] rounded-full px-3.5 py-1.5 self-start shadow-sm">
              <CheckCircle2 size={16} color="#FACC15" />
              <AppText className="text-xs font-tajawal-bold text-white">
                نظام إدارة العمليات المعتمد
              </AppText>
            </View>
          </View>
        </View>

        {/* Access Form / Status Card */}
        <View className="justify-between p-6 sm:p-10 lg:p-12 w-full lg:w-7/12">
          <View>
            {/* Top Logo & Restricted Badge */}
            <View className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-[#E2E8F0] dark:border-[#27272A]">
              <View className="flex-row items-center gap-3 min-w-0">
                <Image
                  source={isDark ? wowBrand.logoPrimaryDark : wowBrand.logoPrimary}
                  contentFit="contain"
                  alt="شعار واو"
                  style={{ width: 78, height: 40 }}
                />
                <View>
                  <AppText className="text-base font-tajawal-bold tracking-tight leading-tight">
                    مركز الإدارة
                  </AppText>
                  <AppText variant="caption" muted className="text-[10px] font-tajawal tracking-wider">
                    WOW CONTROL CENTER
                  </AppText>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5 self-start sm:self-auto max-w-full bg-[#FEF9C3] dark:bg-[#422E12] px-3 py-1 rounded-full border border-[#FDE047] dark:border-[#854D0E]">
                <Lock size={12} color="#854D0E" />
                <AppText className="text-xs font-tajawal-bold text-[#854D0E] dark:text-[#FDE047]">
                  وصول مقيّد • Authorized
                </AppText>
              </View>
            </View>

            {/* Title & Guidance */}
            <View className="mb-8">
              <AppText className="text-2xl sm:text-3xl font-tajawal-bold text-right mb-2">
                الدخول إلى منصة الإدارة
              </AppText>
              <AppText variant="caption" muted className="text-sm text-right leading-relaxed font-tajawal">
                بيانات الدخول تخص المسؤولين المخوّلين وفق أدوارهم المعتمدة. التحقق يتم حصراً عبر خادم قاعدة البيانات.
              </AppText>
            </View>

            {/* DYNAMIC ACCESS STATES */}

            {/* 1. Loading / Verifying State */}
            {status === 'loading' && (
              <View className="items-center justify-center py-10 gap-4 bg-surface rounded-2xl border border-border p-6">
                <ActivityIndicator size="large" color="#FACC15" />
                <AppText className="font-tajawal-bold text-base text-center">
                  جارٍ التحقق من الصلاحيات الإدارية على الخادم...
                </AppText>
                <AppText variant="caption" muted className="text-center font-tajawal max-w-sm">
                  يتم التحقق من وجود عضوية نشطة في السجل الإداري وقواعد الأمان.
                </AppText>
              </View>
            )}

            {/* 2. Unauthorized / Denied State */}
            {status === 'unauthorized' && (
              <View className="gap-5 py-4">
                <View className="rounded-2xl bg-[#FEE2E2] dark:bg-[#451B20] border border-[#FCA5A5] dark:border-[#B91C1C] p-5 gap-3">
                  <View className="flex-row items-center gap-2">
                    <AlertTriangle size={22} color="#B91C1C" />
                    <AppText className="font-tajawal-bold text-base text-[#B91C1C] dark:text-[#FCA5A5]">
                      غير مصرّح بالدخول إلى مساحة الإدارة
                    </AppText>
                  </View>
                  <AppText className="text-sm text-[#7F1D1D] dark:text-[#FECACA] font-tajawal leading-relaxed">
                    الحساب الحالي ({userEmail || 'المسجل'}) لا يمتلك صلاحية إدارية فعّالة. تواصل مع مسؤول النظام إذا كان الوصول مطلوباً.
                  </AppText>
                  <AppText variant="caption" className="text-[#991B1B] dark:text-[#F87171] font-tajawal-bold">
                    قاعدة الأمان: تسجيل الدخول وحده لا يمنح أي امتيازات إدارية دون تفويض الخادم.
                  </AppText>
                </View>

                <View className="flex-row gap-3">
                  {onSignOut && (
                    <AppButton
                      title="تسجيل الخروج وتبديل الحساب"
                      variant="secondary"
                      onPress={() => void onSignOut()}
                      className="flex-1"
                    />
                  )}
                  {onRetry && (
                    <AppButton
                      title="إعادة فحص الصلاحية"
                      variant="secondary"
                      onPress={onRetry}
                    />
                  )}
                </View>
              </View>
            )}

            {/* 3. Error / Network State */}
            {status === 'error' && (
              <View className="gap-5 py-4">
                <View className="rounded-2xl bg-surface border border-danger/40 p-5 gap-3">
                  <View className="flex-row items-center gap-2">
                    <AlertTriangle size={20} color="#DC2626" />
                    <AppText className="font-tajawal-bold text-base text-danger">
                      تعذر تأكيد الصلاحية الإدارية
                    </AppText>
                  </View>
                  <AppText muted className="text-sm font-tajawal leading-relaxed">
                    {__DEV__ && errorMessage ? errorMessage : 'تعذّر التحقق من الصلاحيات حالياً. يرجى إعادة المحاولة لاحقاً.'}
                  </AppText>
                </View>

                {onRetry && (
                  <AppButton
                    title="إعادة المحاولة"
                    variant="primary"
                    onPress={onRetry}
                  />
                )}
              </View>
            )}

            {/* 4. Unauthenticated State (Sign In Action) */}
            {status === 'unauthenticated' && (
              <View className="gap-4">
                {ssoError && (
                  <View className="rounded-xl bg-[#FEE2E2] dark:bg-[#451B20] p-3 mb-2">
                    <AppText className="text-xs text-danger font-tajawal">{ssoError}</AppText>
                  </View>
                )}

                <View className="gap-3">
                  <AppButton
                    title="تسجيل الدخول عبر موفر الهوية المعتمد (Google)"
                    variant="primary"
                    disabled={ssoLoading}
                    onPress={() => void handleSSO('oauth_google')}
                  />

                  <AppButton
                    title="المتابعة باستخدام Facebook"
                    variant="secondary"
                    disabled={ssoLoading}
                    onPress={() => void handleSSO('oauth_facebook')}
                  />
                </View>

                {ssoLoading && <ActivityIndicator color="#FACC15" />}

                <View className="pt-2">
                  <AppText variant="caption" muted className="text-center font-tajawal text-xs">
                    ملاحظة: يتم التحقق من الصلاحيات الإدارية فور نجاح تسجيل الدخول المؤسسي.
                  </AppText>
                </View>
              </View>
            )}
          </View>

          {/* Account Protection Footer Note */}
          <View
            className={`mt-8 rounded-2xl p-4 border flex-row items-center gap-3 ${
              isDark ? 'bg-[#27272A]/40 border-[#3F3F46]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
            }`}
          >
            <ShieldCheck size={18} color="#FACC15" />
            <AppText variant="caption" muted className="flex-1 text-xs font-tajawal leading-relaxed text-right">
              حماية الحساب: محاولات الدخول غير المخوّلة لا تكشف أي سجلات محمية. التفويض مشروط حصراً بقواعد الخادم.
            </AppText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
