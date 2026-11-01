import { Pressable, View } from 'react-native';
import { useTheme, useWowColors, type ThemeMode } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

const modes: ThemeMode[] = ['light', 'dark', 'system'];

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme();
  const colors = useWowColors();

  return (
    <View {...rtlProps} style={rtlStyles.layout} className="flex-row flex-wrap gap-2">
      {modes.map((item) => {
        const selected = mode === item;
        return (
          <Pressable
            {...rtlProps}
            key={item}
            onPress={() => setMode(item)}
            accessibilityRole="button"
            accessibilityLabel={item}
            accessibilityState={{ selected }}
            style={[rtlStyles.layout, {
              minHeight: 48, minWidth: 78,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 16, paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: selected ? colors.primary : colors.surface,
              borderColor: selected ? colors.focusRing : colors.controlBorder,
              borderWidth: 1,
            }]}
          >
            <AppText variant="label" tone={selected ? 'onPrimary' : 'default'} style={{ textAlign: 'center' }}>
              {item}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
