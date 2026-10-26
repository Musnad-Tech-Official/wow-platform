
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';
import { styled } from 'nativewind';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

// Map NativeWind classes to Lucide SVG properties
const StyledHeart = styled(Heart, {
  className: {
    target: false,
    nativeStyleMapping: {
      color: true,
      fill: true,
    },
  },
});

type AnimatedHeartProps = {
  initialLiked?: boolean;
  onChange?: (liked: boolean) => void;
};

export function AnimatedHeart({
  initialLiked = false,
  onChange,
}: AnimatedHeartProps) {
  const [liked, setLiked] = useState(initialLiked);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function toggleLike() {
    const nextLiked = !liked;

    setLiked(nextLiked);
    onChange?.(nextLiked);

    scale.value = withSequence(
      withSpring(1.35, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
  }

  return (
    <Pressable
      onPress={toggleLike}
      accessibilityRole="button"
      accessibilityLabel={
        liked ? 'Remove from favorites' : 'Add to favorites'
      }
      accessibilityState={{ selected: liked }}
      className="items-center justify-center rounded-xl bg-surface p-4"
    >
      <Animated.View style={animatedStyle}>
        <StyledHeart
          size={28}
          strokeWidth={2}
          className={
            liked
              ? 'text-red-500 fill-red-500'
              : 'text-muted-foreground fill-transparent'
          }
        />
      </Animated.View>
    </Pressable>
  );
}
