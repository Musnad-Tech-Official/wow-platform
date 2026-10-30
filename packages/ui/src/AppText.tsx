import { Text, type TextProps } from 'react-native';
import { rtlProps, rtlStyles } from './rtl';

const variants = {
  title: 'font-tajawal-bold text-3xl',
  heading: 'font-tajawal-bold text-xl',
  body: 'font-tajawal text-base',
  label: 'font-tajawal-medium text-sm',
  caption: 'font-tajawal text-xs',
};

export type AppTextProps = TextProps & {
  variant?: keyof typeof variants;
  muted?: boolean;
};

export function AppText({ variant = 'body', muted = false, className, style, ...props }: AppTextProps) {
  return <Text {...rtlProps} {...props} style={[rtlStyles.text, style]} className={`text-right ${variants[variant]} ${muted ? 'text-muted-foreground' : 'text-foreground'} ${className ?? ''}`} />;
}
