import { View, type ViewProps } from 'react-native';
import { useWowColors } from '@wow/theme';
import { rtlProps, rtlStyles } from './rtl';
import { AppText } from './AppText';

export type BadgeProps = Omit<ViewProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function Badge({ label, variant = 'primary', className, style, ...props }: BadgeProps) {
  const colors = useWowColors();
  return (
    <View {...rtlProps} {...props}
      style={[rtlStyles.layout, {
        backgroundColor: variant === 'primary' ? colors.primary : colors.surface,
        borderColor: variant === 'primary' ? 'transparent' : colors.border,
        borderWidth: variant === 'primary' ? 0 : 1,
      }, style]}
      className={`self-start rounded-lg px-3 py-1 ${className ?? ''}`}>
      <AppText variant="label" tone={variant === 'primary' ? 'onPrimary' : 'default'}>{label}</AppText>
    </View>
  );
}
