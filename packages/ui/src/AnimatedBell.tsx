
import { Pressable } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useTheme } from '@wow/theme';
import { rtlProps, rtlStyles } from './rtl';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

type AnimatedBellProps = {
  onPress?: () => void;
  size?: number;
};

export function AnimatedBell({
  onPress,
  size = 28,
}: AnimatedBellProps) {
  const rotation = useSharedValue(0);
  const { resolvedTheme } = useTheme();

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
      {...rtlProps}
      style={rtlStyles.layout}
      onPress={ringBell}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      className="items-center justify-center rounded-xl bg-surface p-4 active:opacity-80"
    >
      <Animated.View style={animatedStyle}>
        <Bell
          size={size}
          strokeWidth={2}
          color={resolvedTheme === 'dark' ? '#FFD23F' : '#F5B700'}
        />
      </Animated.View>
    </Pressable>
  );
}
