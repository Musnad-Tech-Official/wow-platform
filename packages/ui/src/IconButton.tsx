import { Pressable, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';
import { rtlProps, rtlStyles } from './rtl';

export type IconButtonProps = Omit<PressableProps, 'children'> & {
  accessibilityLabel: string;
  children: ReactNode;
};

export function IconButton({ className, disabled, accessibilityState, style, ...props }: IconButtonProps) {
  return (
    <Pressable {...rtlProps} {...props} style={(state) => [rtlStyles.layout, typeof style === 'function' ? style(state) : style]} accessibilityRole="button" disabled={disabled}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      className={`min-h-12 min-w-12 items-center justify-center rounded-xl bg-surface p-3 active:opacity-80 ${disabled ? 'opacity-50' : ''} ${className ?? ''}`} />
  );
}
