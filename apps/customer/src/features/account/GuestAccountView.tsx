import { Image, Platform, View } from 'react-native';
import { wowIllustrations } from '@wow/assets';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';

export interface GuestAccountViewProps {
  onPressSignIn: () => void;
  onPressExplore: () => void;
  onPressExitGuest: () => void;
}

export function GuestAccountView({
  onPressSignIn,
  onPressExplore,
  onPressExitGuest,
}: GuestAccountViewProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  return (
    <View
      {...rtlWebProps}
      style={{
        width: '100%',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        gap: 20,
      }}
    >
      {/* Secure Access Illustration */}
      <View
        style={{
          width: 140,
          height: 140,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Image
          source={wowIllustrations.customer.secureAccess}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          accessibilityLabel="رسم توضيحي للوصول الآمن وتسجيل الدخول"
        />
      </View>

      {/* Copy */}
      <View style={{ alignItems: 'center', gap: 8, maxWidth: 420 }}>
        <AppText
          variant="heading"
          style={{
            fontSize: 20,
            fontWeight: '900',
            color: colors.foreground,
            textAlign: 'center',
          }}
        >
          أنت تتصفح تطبيق WOW كضيف
        </AppText>

        <AppText
          variant="body"
          muted
          style={{
            fontSize: 14,
            lineHeight: 22,
            textAlign: 'center',
            color: colors.mutedForeground,
          }}
        >
          يمكنك استكشاف جميع العروض والمتاجر المتاحة بحرية تامة دون الحاجة لتسجيل الدخول. يتيح لك تسجيل الدخول حفظ العروض المفضلة ومتابعة نشاطك.
        </AppText>
      </View>

      {/* Actions Container */}
      <View style={{ width: '100%', maxWidth: 360, gap: 12, marginTop: 8 }}>
        {/* Primary Action: Sign In */}
        <AppButton
          title="تسجيل الدخول / إنشاء حساب"
          variant="primary"
          onPress={onPressSignIn}
          style={{
            height: 50,
            borderRadius: 25,
          }}
        />

        {/* Secondary Action: Explore Public Discovery */}
        <AppButton
          title="متابعة التصفح واستكشاف العروض"
          variant="secondary"
          onPress={onPressExplore}
          style={{
            height: 50,
            borderRadius: 25,
          }}
        />

        {/* Tertiary Action: Exit Guest */}
        <AppButton
          title="الخروج من وضع الضيف"
          variant="outline"
          onPress={onPressExitGuest}
          style={{
            height: 50,
            borderRadius: 25,
            borderColor: isDark ? '#334155' : '#CBD5E1',
          }}
        />
      </View>
    </View>
  );
}
