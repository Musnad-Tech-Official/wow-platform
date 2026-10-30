import { View, type ViewProps } from 'react-native';
import { rtlProps, rtlStyles } from './rtl';
import { AppText } from './AppText';

export type BadgeProps = Omit<ViewProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function Badge({ label, variant = 'primary', className, style, ...props }: BadgeProps) {
  return (
    <View {...rtlProps} {...props} style={[rtlStyles.layout, style]} className={`self-start rounded-lg px-3 py-1 ${variant === 'primary' ? 'bg-primary' : 'border border-border bg-surface'} ${className ?? ''}`}>
      <AppText variant="label" className={variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'}>{label}</AppText>
    </View>
  );
}
