import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, House, UserRound } from 'lucide-react-native';
import { useWowColors, wowBrandColors } from '@wow/theme';
import { AppText } from '@wow/ui';

export type BottomNavTabId = 'explore' | 'favorites' | 'account';

export interface BottomNavBarProps {
  activeTab: BottomNavTabId;
  onSelectTab: (tabId: BottomNavTabId) => void;
}

export function BottomNavBar({ activeTab, onSelectTab }: BottomNavBarProps) {
  const colors = useWowColors();
  const insets = useSafeAreaInsets();

  const tabs: { id: BottomNavTabId; label: string; icon: typeof House }[] = [
    { id: 'explore', label: 'استكشف', icon: House },
    { id: 'favorites', label: 'المفضلة', icon: Heart },
    { id: 'account', label: 'حسابي', icon: UserRound },
  ];

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
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        const IconComponent = tab.icon;
        const tint = isSelected ? colors.foreground : colors.mutedForeground;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectTab(tab.id)}
            style={{
              minWidth: 74,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent', // Explicitly NO background or highlight
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
              {tab.label}
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
