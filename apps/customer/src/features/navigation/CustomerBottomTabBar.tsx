import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import { Heart, House, UserRound } from 'lucide-react-native';
import { useWowColors, wowBrandColors } from '@wow/theme';
import { AppText } from '@wow/ui';

export type CustomerBottomTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

export function CustomerBottomTabBar({
  state,
  descriptors,
  navigation,
}: CustomerBottomTabBarProps) {
  const colors = useWowColors();
  const insets = useSafeAreaInsets();

  const tabConfig: Record<string, { label: string; icon: typeof House }> = {
    index: { label: 'استكشف', icon: House },
    favorites: { label: 'المفضلة', icon: Heart },
    account: { label: 'حسابي', icon: UserRound },
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 6),
        paddingTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        minHeight: 62 + Math.max(insets.bottom, 6),
      }}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const isSelected = state.index === index;
        const config = tabConfig[route.name] ?? {
          label: descriptor?.options?.title ?? route.name,
          icon: House,
        };
        const IconComponent = config.icon;
        const tint = isSelected ? colors.foreground : colors.mutedForeground;

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isSelected && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={config.label}
            accessibilityState={{ selected: isSelected }}
            onPress={onPress}
            style={{
              minWidth: 74,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              gap: 2,
            }}
          >
            <IconComponent size={21} color={tint} strokeWidth={isSelected ? 2.2 : 1.8} />

            <AppText
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: isSelected ? '800' : '500',
                color: tint,
                textAlign: 'center',
              }}
            >
              {config.label}
            </AppText>

            {/* Small yellow underline only for the selected tab */}
            {isSelected ? (
              <View
                style={{
                  width: 20,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: wowBrandColors.yellow,
                  marginTop: 2,
                }}
              />
            ) : (
              <View style={{ width: 20, height: 3, marginTop: 2, backgroundColor: 'transparent' }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
