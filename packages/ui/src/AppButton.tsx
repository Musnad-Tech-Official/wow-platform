import { useState } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, type PressableStateCallbackType } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppText } from './AppText';
import { wowMotion } from './motion';
import { rtlProps, rtlStyles } from './rtl';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export type WowButtonVariant = 'primary' | 'secondary' | 'outline' | 'soft' | 'quiet' | 'danger';
export type AppButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: WowButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

/** No hover enlargement or spring overshoot: feedback is purposefully restrained. */
export function AppButton({
  title, variant = 'primary', size = 'lg', loading = false, disabled,
  className, style, accessibilityState, onHoverIn, onHoverOut, onPressIn, onPressOut,
  onFocus, onBlur, ...props
}: AppButtonProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const inactive = Boolean(disabled || loading);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const scheme = {
    primary: {
      bg: hovered && !inactive ? wowBrandColors.yellowHover : colors.primary,
      fg: colors.primaryForeground,
      border: 'transparent',
    },
    secondary: {
      bg: hovered && !inactive ? (dark ? '#363844' : '#F1F4F8') : (dark ? '#292A32' : '#FFFFFF'),
      fg: colors.foreground,
      border: colors.border,
    },
    outline: {
      bg: hovered && !inactive ? (dark ? '#30333D' : '#F1F5F9') : 'transparent',
      fg: colors.foreground,
      border: dark ? '#747985' : '#CBD5E1',
    },
    soft: {
      bg: dark ? (hovered && !inactive ? '#6A5318' : '#584613') : (hovered && !inactive ? '#FDE68A' : '#FEF3C7'),
      fg: dark ? '#FFF2B7' : '#0F172D',
      border: 'transparent',
    },
    quiet: {
      bg: hovered && !inactive ? (dark ? '#30333D' : '#EDF0F5') : 'transparent',
      fg: colors.foreground,
      border: 'transparent',
    },
    danger: {
      bg: hovered && !inactive ? '#991B1B' : '#B91C1C',
      fg: '#FFFFFF',
      border: 'transparent',
    },
  }[variant];

  const externalStyle = typeof style === 'function'
    ? style({ pressed } as PressableStateCallbackType)
    : style;

  return (
    <AnimatedPressable
      {...rtlProps}
      {...props}
      role="button"
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? title}
      accessibilityState={{ ...accessibilityState, disabled: inactive, busy: loading }}
      disabled={inactive}
      onHoverIn={(event) => { setHovered(true); onHoverIn?.(event); }}
      onHoverOut={(event) => { setHovered(false); onHoverOut?.(event); }}
      onPressIn={(event) => {
        setPressed(true);
        if (!inactive) scale.set(withTiming(wowMotion.buttonPressedScale, {
          duration: wowMotion.buttonPressMs, reduceMotion: ReduceMotion.System,
        }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        scale.set(withTiming(1, {
          duration: wowMotion.buttonReleaseMs, reduceMotion: ReduceMotion.System,
        }));
        onPressOut?.(event);
      }}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      style={[
        rtlStyles.layout,
        {
          backgroundColor: scheme.bg,
          borderColor: focused ? (variant === 'primary' ? colors.primaryForeground : colors.focusRing) : scheme.border,
          borderWidth: focused || scheme.border !== 'transparent' ? 1.5 : 0,
          opacity: inactive ? 0.55 : 1,
          minHeight: 48,
        },
        animatedStyle,
        externalStyle,
      ]}
      className={[
        'flex-row items-center justify-center gap-2 rounded-xl',
        { sm: 'px-4 py-2', md: 'px-5 py-3', lg: 'px-6 py-4' }[size],
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      {loading ? <ActivityIndicator color={scheme.fg} /> : null}
      <AppText
        style={{ textAlign: 'center', color: scheme.fg, flexShrink: 1 }}
        className="font-tajawal-bold text-base"
      >
        {title}
      </AppText>
    </AnimatedPressable>
  );
}
