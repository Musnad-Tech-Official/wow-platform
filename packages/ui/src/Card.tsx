import { View, type ViewProps } from 'react-native';
import { rtlProps, rtlStyles } from './rtl';

export type CardProps = ViewProps;

export function Card({ className, style, ...props }: CardProps) {
  return <View {...rtlProps} {...props} style={[rtlStyles.layout, style]} className={`gap-4 rounded-2xl border border-border bg-surface p-5 ${className ?? ''}`} />;
}
