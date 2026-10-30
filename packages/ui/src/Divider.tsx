import { View, type ViewProps } from 'react-native';
import { rtlProps, rtlStyles } from './rtl';

export type DividerProps = ViewProps & { orientation?: 'horizontal' | 'vertical' };

export function Divider({ orientation = 'horizontal', className, style, ...props }: DividerProps) {
  return <View {...rtlProps} {...props} style={[rtlStyles.layout, style]} className={`bg-border ${orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch'} ${className ?? ''}`} />;
}
