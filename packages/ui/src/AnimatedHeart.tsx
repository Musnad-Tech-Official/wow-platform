
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTheme } from '@wow/theme';
import { rtlProps, rtlStyles } from './rtl';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

type AnimatedHeartProps = {
  initialLiked?: boolean;
  onChange?: (liked: boolean) => void;
};

export function AnimatedHeart({
  initialLiked = false,
  onChange,
}: AnimatedHeartProps) {
  const [liked, setLiked] = useState(initialLiked);
  const { resolvedTheme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  function toggleLike() {
    const nextLiked = !liked;

    setLiked(nextLiked);
    onChange?.(nextLiked);

    scale.set(withSequence(
      withSpring(1.35, { damping: 8 }),
      withSpring(1, { damping: 12 })
    ));
  }

  return (
    <Pressable
      {...rtlProps}
      style={rtlStyles.layout}
      onPress={toggleLike}
      accessibilityRole="button"
      accessibilityLabel={
        liked ? 'Remove from favorites' : 'Add to favorites'
      }
      accessibilityState={{ selected: liked }}
      className="items-center justify-center rounded-xl bg-surface p-4"
    >
      <Animated.View style={animatedStyle}>
        <Heart
          size={28}
          strokeWidth={2}
          color={liked ? '#EF4444' : resolvedTheme === 'dark' ? '#A1A1AA' : '#71717A'}
          fill={liked ? '#EF4444' : 'none'}
        />
      </Animated.View>
    </Pressable>
  );
}
