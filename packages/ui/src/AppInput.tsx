import { useId } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export type AppInputProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

export function AppInput({ label, hint, error, containerClassName, className, style, editable = true, accessibilityLabel, nativeID, ...props }: AppInputProps) {
  const id = useId();
  const inputId = nativeID ?? id;

  return (
    <View {...rtlProps} style={rtlStyles.layout} className={`gap-2 ${containerClassName ?? ''}`}>
      {label ? <AppText variant="label" nativeID={`${inputId}-label`}>{label}</AppText> : null}
      <TextInput {...rtlProps} {...props} style={[rtlStyles.layout, rtlStyles.text, style]} nativeID={inputId} editable={editable}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={props.accessibilityHint ?? error ?? hint}
        aria-invalid={!!error}
        className={`min-h-12 rounded-xl border bg-background px-4 py-3 text-right font-tajawal text-base text-foreground placeholder:text-muted-foreground ${error ? 'border-red-500' : 'border-border'} ${editable ? '' : 'opacity-50'} ${className ?? ''}`} />
      {error || hint ? <AppText variant="caption" muted={!error} accessibilityLiveRegion={error ? 'polite' : 'none'} className={error ? 'text-red-500' : ''}>{error || hint}</AppText> : null}
    </View>
  );
}
