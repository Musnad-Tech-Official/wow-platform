import { Pressable, View, type PressableProps } from 'react-native';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export type CheckboxProps = Omit<PressableProps, 'children' | 'onPress'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
};

export function Checkbox({ checked, onCheckedChange, label, disabled, className, accessibilityState, style, ...props }: CheckboxProps) {
  return (
    <Pressable {...rtlProps} {...props} style={(state) => [rtlStyles.layout, typeof style === 'function' ? style(state) : style]} accessibilityRole="checkbox" accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, checked, disabled: !!disabled }}
      disabled={disabled} onPress={() => onCheckedChange(!checked)}
      className={`min-h-12 flex-row items-center gap-3 active:opacity-80 ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}>
      <View className={`h-6 w-6 items-center justify-center rounded-md border ${checked ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
        {checked ? <AppText variant="label" style={{ textAlign: 'center' }} className="text-primary-foreground">✓</AppText> : null}
      </View>
      <AppText className="flex-shrink">{label}</AppText>
    </Pressable>
  );
}
