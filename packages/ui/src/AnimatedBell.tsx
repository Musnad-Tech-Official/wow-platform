
import { Pressable } from 'react-native';
import { Bell } from 'lucide-react-native';
import { styled } from 'nativewind';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

// Enable NativeWind className support for Lucide
const StyledBell = styled(Bell, {
  className: {
    target: false,
    nativeStyleMapping: {
      color: true,
    },
  },
});

type AnimatedBellProps = {
  onPress?: () => void;
  size?: number;
};

export function AnimatedBell({
  onPress,
  size = 28,
}: AnimatedBellProps) {
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
    ],
  }));

  function ringBell() {
    rotation.value = withSequence(
      withTiming(-20, { duration: 100 }),
      withTiming(20, { duration: 100 }),
      withTiming(-15, { duration: 100 }),
      withTiming(15, { duration: 100 }),
      withSpring(0)
    );

    onPress?.();
  }

  return (
    <Pressable
      onPress={ringBell}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      className="items-center justify-center rounded-xl bg-surface p-4 active:opacity-80"
    >
      <Animated.View style={animatedStyle}>
        <StyledBell
          size={size}
          strokeWidth={2}
          className="text-primary"
        />
      </Animated.View>
    </Pressable>
  );
}
