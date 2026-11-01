import { useState } from 'react';
import { Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useWowColors } from '@wow/theme';
import { wowMotion } from './motion';
import { rtlProps, rtlStyles } from './rtl';

export type AnimatedHeartProps = {
  liked?: boolean;
  initialLiked?: boolean;
  onChange?: (liked: boolean) => void;
  disabled?: boolean;
};

/** Filled state communicates the action; a single 5.5% pulse reinforces it. */
export function AnimatedHeart({ liked, initialLiked = false, onChange, disabled = false }: AnimatedHeartProps) {
  const [uncontrolledLiked, setUncontrolledLiked] = useState(initialLiked);
  const selected = liked ?? uncontrolledLiked;
  const colors = useWowColors();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  function toggleLike() {
    if (disabled) return;
    const next = !selected;
    if (liked === undefined) setUncontrolledLiked(next);
    onChange?.(next);
    if (next) scale.set(withSequence(
      withTiming(wowMotion.iconAccentScale, { duration: wowMotion.iconOutMs, reduceMotion: ReduceMotion.System }),
      withTiming(1, { duration: wowMotion.iconReturnMs, reduceMotion: ReduceMotion.System }),
    ));
  }
  return (
    <Pressable
      {...rtlProps}
      style={[rtlStyles.layout, { minWidth: 48, minHeight: 48,
        backgroundColor: hovered ? colors.neutralSurface : colors.surface }]}
      onPress={toggleLike}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={selected ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      accessibilityState={{ selected, disabled }}
      className={`items-center justify-center rounded-xl ${disabled ? 'opacity-50' : ''}`}
    >
      <Animated.View style={animatedStyle}>
        <Heart size={25} strokeWidth={1.9} color={selected ? '#E14C64' : colors.mutedForeground}
          fill={selected ? '#E14C64' : 'none'} />
      </Animated.View>
    </Pressable>
  );
}
