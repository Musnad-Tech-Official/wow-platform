import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, User } from 'lucide-react-native';
import { useAuth, useClerk, useUser } from '@wow/auth';
import { wowIllustrations } from '@wow/assets';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import { useGuestStore } from '../../state/guest-store';

export function CustomerAccountTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const exitGuest = useGuestStore((s) => s.exitGuest);

  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    try {
      exitGuest();
      await clerk.signOut();
      router.replace('/access');
    } finally {
      setLoading(false);
    }
  }

  function handleExitGuest() {
    exitGuest();
    router.replace('/access');
  }

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    'مستخدم مسجل';

  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Math.max(insets.top, 16),
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <AppText
          style={{
            fontSize: 20,
            fontWeight: '900',
            color: colors.foreground,
            textAlign: 'right',
          }}
        >
          حسابي
        </AppText>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        <View style={{ alignItems: 'center', width: '100%', maxWidth: 380, gap: 20 }}>
          {isSignedIn ? (
            /* Authenticated Account Profile */
            <>
              {/* Avatar Icon */}
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: '#FACC15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <User size={44} color="#0F172A" />
              </View>

              {/* Name & Email */}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <AppText
                  style={{
                    fontSize: 20,
                    fontWeight: '900',
                    color: colors.foreground,
                    textAlign: 'center',
                  }}
                >
                  {displayName}
                </AppText>

                {email && (
                  <AppText
                    style={{
                      fontSize: 14,
                      color: colors.mutedForeground,
                      textAlign: 'center',
                    }}
                  >
                    {email}
                  </AppText>
                )}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                    marginTop: 6,
                  }}
                >
                  <ShieldCheck size={14} color="#10B981" />
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>
                    حساب موثق ومحمي
                  </AppText>
                </View>
              </View>

              {/* Sign Out Action */}
              <View style={{ width: '100%', marginTop: 24 }}>
                <AppButton
                  title="تسجيل الخروج"
                  variant="outline"
                  onPress={handleSignOut}
                  disabled={loading}
                  style={{
                    height: 50,
                    borderRadius: 25,
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  }}
                />
                {loading && <ActivityIndicator style={{ marginTop: 12 }} color="#FACC15" />}
              </View>
            </>
          ) : (
            /* Guest Account State */
            <>
              <View style={{ width: 140, height: 140, marginBottom: 8 }}>
                <Image
                  source={wowIllustrations.customer.secureAccess}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  accessibilityLabel="تسجيل الدخول"
                />
              </View>

              <AppText
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                أنت تتصفح تطبيق WOW كضيف
              </AppText>

              <AppText
                style={{
                  fontSize: 14,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                يمكنك تسجيل الدخول في أي وقت للاستفادة من كامل المزايا وحفظ العروض ومزامنة تفضيلاتك.
              </AppText>

              <View style={{ width: '100%', gap: 12, marginTop: 16 }}>
                <AppButton
                  title="تسجيل الدخول"
                  variant="primary"
                  onPress={() => router.push('/sign-in')}
                  style={{
                    height: 50,
                    borderRadius: 25,
                  }}
                />

                <AppButton
                  title="الخروج من وضع الضيف"
                  variant="outline"
                  onPress={handleExitGuest}
                  style={{
                    height: 50,
                    borderRadius: 25,
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                  }}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
