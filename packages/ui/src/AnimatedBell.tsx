import { useState } from 'react';
import { Pressable } from 'react-native';
import { Bell } from 'lucide-react-native';
import Animated, { ReduceMotion, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { useWowColors } from '@wow/theme';
import { wowMotion } from './motion';
import { rtlProps, rtlStyles } from './rtl';

export type AnimatedBellProps = { onPress?: () => void; size?: number; disabled?: boolean };

/** One quiet two-phase ring, rather than continuous icon shaking. */
export function AnimatedBell({ onPress, size = 24, disabled = false }: AnimatedBellProps) {
  const rotation = useSharedValue(0);
  const colors = useWowColors();
  const [hovered, setHovered] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  function ringBell() {
    if (disabled) return;
    rotation.set(withSequence(
      withTiming(-wowMotion.bellAngleDeg, { duration: 95, reduceMotion: ReduceMotion.System }),
      withTiming(wowMotion.bellAngleDeg / 2, { duration: 105, reduceMotion: ReduceMotion.System }),
      withTiming(0, { duration: 120, reduceMotion: ReduceMotion.System }),
    ));
    onPress?.();
  }
  return (
    <Pressable
      {...rtlProps}
      style={[rtlStyles.layout, { minWidth: 48, minHeight: 48,
        backgroundColor: hovered ? colors.neutralSurface : colors.surface }]}
      onPress={ringBell}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="الإشعارات"
      accessibilityState={{ disabled }}
      className={`items-center justify-center rounded-xl ${disabled ? 'opacity-50' : ''}`}
    >
      <Animated.View style={animatedStyle}>
        <Bell size={size} strokeWidth={1.9} color={colors.foreground} />
      </Animated.View>
    </Pressable>
  );
}
