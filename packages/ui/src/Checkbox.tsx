import { useEffect } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export type CheckboxProps = Omit<PressableProps, 'children' | 'onPress'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
};

/**
 * A real vector tick, not a font glyph. The check fades in gently and never bounces.
 * Accessibility semantics and the 48pt tap target are preserved on Web and Native.
 */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
  accessibilityState,
  style,
  ...props
}: CheckboxProps) {
  const colors = useWowColors();
  const checkProgress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    checkProgress.value = withTiming(checked ? 1 : 0, {
      duration: 110,
      reduceMotion: ReduceMotion.System,
    });
  }, [checked, checkProgress]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkProgress.value,
  }));

  return (
    <Pressable
      {...rtlProps}
      {...props}
      style={(state) => [
        rtlStyles.layout,
        typeof style === 'function' ? style(state) : style,
      ]}
      accessibilityRole="checkbox"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      className={`min-h-12 flex-row items-center gap-3 active:opacity-80 ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      <View
        className="h-6 w-6 shrink-0 items-center justify-center"
        style={{
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: checked ? colors.primary : colors.mutedForeground,
          backgroundColor: checked ? colors.primary : colors.background,
        }}
      >
        <Animated.View style={checkStyle} pointerEvents="none">
          <Check
            size={17}
            strokeWidth={2.7}
            color={colors.primaryForeground}
          />
        </Animated.View>
      </View>
      <AppText className="flex-shrink">{label}</AppText>
    </Pressable>
  );
}
