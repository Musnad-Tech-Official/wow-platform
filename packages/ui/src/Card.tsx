import { View, type ViewProps } from 'react-native';
import { useWowColors } from '@wow/theme';
import { rtlProps, rtlStyles } from './rtl';

export type CardProps = ViewProps;

export function Card({ className, style, ...props }: CardProps) {
  const colors = useWowColors();
  return <View {...rtlProps} {...props} style={[rtlStyles.layout, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }, style] className={`gap-4 rounded-2xl border border-border bg-surface p-5 ${className ?? ''}`} />;
}
