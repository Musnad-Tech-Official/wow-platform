import { Image, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@wow/auth';
import { wowIllustrations } from '@wow/assets';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';

export function CustomerFavoritesTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { isSignedIn } = useAuth();

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
          المفضلة
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
        <View style={{ alignItems: 'center', maxWidth: 360, gap: 16 }}>
          {isSignedIn ? (
            /* Authenticated Empty State */
            <>
              <View style={{ width: 140, height: 140, marginBottom: 8 }}>
                <Image
                  source={wowIllustrations.customer.savedOffersEmpty}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  accessibilityLabel="المفضلة فارغة"
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
                قائمتك المفضلة فارغة
              </AppText>

              <AppText
                style={{
                  fontSize: 14,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                ستظهر هنا العروض والمتاجر التي تقوم بحفظها للرجوع إليها بسرعة في أي وقت.
              </AppText>

              <AppButton
                title="استكشف العروض الآن"
                variant="primary"
                onPress={() => router.push('/')}
                style={{
                  marginTop: 12,
                  minWidth: 180,
                  height: 48,
                  borderRadius: 24,
                }}
              />
            </>
          ) : (
            /* Guest Restricted Access Notice */
            <>
              <View style={{ width: 140, height: 140, marginBottom: 8 }}>
                <Image
                  source={wowIllustrations.customer.favoritesGuide}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  accessibilityLabel="دليل المفضلة"
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
                سجّل دخولك لحفظ المفضلة
              </AppText>

              <AppText
                style={{
                  fontSize: 14,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                لحفظ عروضك وتجارك المفضلين ومزامنتهم، يرجى تسجيل الدخول إلى حسابك في WOW.
              </AppText>

              <AppButton
                title="تسجيل الدخول"
                variant="primary"
                onPress={() => router.push('/sign-in')}
                style={{
                  marginTop: 12,
                  minWidth: 180,
                  height: 48,
                  borderRadius: 24,
                }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
