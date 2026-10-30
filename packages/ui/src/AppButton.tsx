
import { ActivityIndicator, Pressable } from 'react-native';
import type { ComponentProps } from 'react';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export type AppButtonProps = {
  title: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
} & Omit<ComponentProps<typeof Pressable>, 'children'>;

export function AppButton({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  className,
  disabled,
  accessibilityState,
  style,
  ...props
}: AppButtonProps) {
  const variantClasses =
    variant === 'primary'
      ? 'bg-primary'
      : 'bg-surface border border-border';

  const textClasses =
    variant === 'primary'
      ? 'text-primary-foreground'
      : 'text-foreground';

  return (
    <Pressable
      {...rtlProps}
      {...props}
      style={(state) => [rtlStyles.layout, typeof style === 'function' ? style(state) : style]}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? title}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled || loading, busy: loading }}
      className={[
        'min-h-12 flex-row items-center justify-center gap-2 rounded-xl',
        { sm: 'px-4 py-2', md: 'px-5 py-3', lg: 'px-6 py-4' }[size],
        'active:opacity-80',
        disabled || loading ? 'opacity-50' : '',
        variantClasses,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#171717' : undefined} /> : null}
      <AppText
        style={{ textAlign: 'center' }}
        className={`font-tajawal-bold text-base ${textClasses}`}
      >
        {title}
      </AppText>
    </Pressable>
  );
}
