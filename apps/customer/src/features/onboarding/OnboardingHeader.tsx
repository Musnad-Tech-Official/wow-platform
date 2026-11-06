import { Image, Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { wowBrand } from '@wow/assets';
import { useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';

export interface OnboardingHeaderProps {
  onBack?: () => void;
  title?: string;
  isDark?: boolean;
}

export function OnboardingHeader({ onBack, title, isDark = false }: OnboardingHeaderProps) {
  const colors = useWowColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
        minHeight: 56,
      }}
    >
      {/* 1. Back button (or placeholder to balance header) */}
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={onBack}
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
          {/* In RTL layout, back arrow points right (towards previous screen) */}
          <ChevronRight size={22} color={colors.foreground} />
        </Pressable>
      ) : (
        <View style={{ width: 48, height: 48 }} />
      )}

      {/* 2. Brand Identity or Custom Title */}
      {title ? (
        <AppText
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.foreground,
            textAlign: 'center',
          }}
        >
          {title}
        </AppText>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image
            source={wowBrand.appIcon}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
            }}
            resizeMode="contain"
            accessibilityLabel="شعار واو"
          />
          <AppText
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: colors.foreground,
              letterSpacing: 2,
            }}
          >
            WOW
          </AppText>
        </View>
      )}

      {/* 3. Trailing Spacer for balanced centering */}
      <View style={{ width: 48, height: 48 }} />
    </View>
  );
}