import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { wowBrand } from '@wow/assets';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText, WowIcon, WowAppHeader } from '@wow/ui';

export interface HomeHeaderProps {
  onOpenSearch: () => void;
  onOpenLocation: () => void;
  selectedAreaName?: string;
  isLocationFiltered?: boolean;
  isSearchActive?: boolean;
}

export function HomeHeader({
  onOpenSearch,
  onOpenLocation,
  selectedAreaName = 'كل المناطق',
  isLocationFiltered = false,
  isSearchActive = false,
}: HomeHeaderProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <WowAppHeader
      brand={
        <Image
          source={isDark ? wowBrand.logoPrimaryDark : wowBrand.logoPrimary}
          contentFit="contain"
          alt="شعار واو"
          style={{ width: 84, height: 46 }}
        />
      }
      actions={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={'اختيار المنطقة، المنطقة المحددة حالياً: ' + selectedAreaName}
            onPress={onOpenLocation}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 12,
              borderRadius: 14,
              backgroundColor: isLocationFiltered
                ? (isDark ? 'rgba(250, 204, 21, 0.18)' : '#FEF08A')
                : colors.surface,
              borderWidth: 1,
              borderColor: isLocationFiltered ? colors.focusRing : colors.border,
            }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <WowIcon
              name="location"
              size={18}
              color={isLocationFiltered ? (isDark ? colors.primary : '#854D0E') : colors.foreground}
            />
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isLocationFiltered
                  ? (isDark ? colors.primary : '#854D0E')
                  : colors.foreground,
                maxWidth: 88,
              }}
            >
              {selectedAreaName}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="البحث في العروض"
            onPress={onOpenSearch}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isSearchActive ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: isSearchActive ? colors.focusRing : colors.border,
            }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <WowIcon
              name="search"
              size={18}
              color={isSearchActive ? colors.primaryForeground : colors.foreground}
            />
          </Pressable>
        </View>
      }
    />
  );
}
