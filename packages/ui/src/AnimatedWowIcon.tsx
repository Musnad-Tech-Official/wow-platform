import { useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';
import { useWowColors } from '@wow/theme';
import { wowMotion } from './motion';
import { WowIcon, type WowIconName } from './WowIcon';
import { rtlProps, rtlStyles } from './rtl';

export interface AnimatedWowIconProps {
  name: WowIconName;
  label: string;
  size?: number;
  onPress: () => void;
  disabled?: boolean;
}

type MotionIntent = 'focus' | 'pin' | 'share' | 'direction-right' | 'direction-left' | 'confirm' | 'none';
const intentByIcon: Partial<Record<WowIconName, MotionIntent>> = {
  search: 'focus', location: 'pin', share: 'share', arrowBack: 'direction-right',
  chevronBack: 'direction-right', chevronNext: 'direction-left', check: 'confirm',
};

/** Per-icon intent. No generic rotation, shake or hover zoom. */
export function AnimatedWowIcon({ name, label, size = 22, onPress, disabled = false }: AnimatedWowIconProps) {
  const colors = useWowColors();
  const [hovered, setHovered] = useState(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));
  const timing = { duration: wowMotion.iconOutMs, reduceMotion: ReduceMotion.System } as const;
  const reset = { duration: wowMotion.iconReturnMs, reduceMotion: ReduceMotion.System } as const;

  function runIntent() {
    const intent = intentByIcon[name] ?? 'none';
    if (intent === 'pin') {
      y.set(withSequence(withTiming(-wowMotion.iconTravelPx, timing), withTiming(0, reset)));
    } else if (intent === 'share') {
      x.set(withSequence(withTiming(-wowMotion.iconTravelPx, timing), withTiming(0, reset)));
      y.set(withSequence(withTiming(-wowMotion.iconTravelPx, timing), withTiming(0, reset)));
    } else if (intent === 'direction-right' || intent === 'direction-left') {
      x.set(withSequence(withTiming(intent === 'direction-right' ? 2 : -2, timing), withTiming(0, reset)));
    } else if (intent === 'focus' || intent === 'confirm') {
      scale.set(withSequence(withTiming(wowMotion.iconAccentScale, timing), withTiming(1, reset)));
    }
  }
  return (
    <Pressable
      {...rtlProps}
      style={[rtlStyles.layout, { minWidth: 48, minHeight: 48,
        backgroundColor: hovered && !disabled ? colors.neutralSurface : colors.surface }]}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => { if (!disabled) { runIntent(); onPress(); } }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`items-center justify-center rounded-xl ${disabled ? 'opacity-50' : ''}`}
    >
      <Animated.View style={animatedStyle}>
        <WowIcon name={name} size={size} color={hovered && !disabled ? colors.actionForeground : colors.foreground} />
      </Animated.View>
    </Pressable>
  );
}
