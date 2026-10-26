
import { Pressable, Text } from 'react-native';
import type { ComponentProps } from 'react';

type AppButtonProps = {
  title: string;
  variant?: 'primary' | 'secondary';
} & Omit<ComponentProps<typeof Pressable>, 'children'>;

export function AppButton({
  title,
  variant = 'primary',
  className,
  disabled,
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
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      className={[
        'items-center justify-center rounded-xl px-6 py-4',
        'active:opacity-80',
        disabled ? 'opacity-50' : '',
        variantClasses,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Text
        className={`font-tajawal-bold text-base ${textClasses}`}
      >
        {title}
      </Text>
    </Pressable>
  );
}
