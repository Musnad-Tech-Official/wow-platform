import { Pressable, Text, View } from 'react-native';
import { useTheme, type ThemeMode } from '@wow/theme';

const modes: ThemeMode[] = ['light', 'dark', 'system'];

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme();

  return (
    <View className="flex-row gap-2">
      {modes.map((item) => (
        <Pressable
          key={item}
          onPress={() => setMode(item)}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === item }}
          className={
            mode === item
              ? 'rounded-xl bg-primary px-4 py-3'
              : 'rounded-xl bg-surface px-4 py-3'
          }
        >
          <Text
            className={
              mode === item
                ? 'font-semibold text-primary-foreground'
                : 'font-semibold text-foreground'
            }
          >
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}