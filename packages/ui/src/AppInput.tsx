import { useId } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export type AppInputProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

export function AppInput({ label, hint, error, containerClassName, className, style, editable = true,
  accessibilityLabel, nativeID, placeholderTextColor, ...props }: AppInputProps) {
  const id = useId();
  const inputId = nativeID ?? id;
  const colors = useWowColors();

  return (
    <View {...rtlProps} style={rtlStyles.layout} className={`gap-2 ${containerClassName ?? ''}`}>
      {label ? <AppText variant="label" nativeID={`${inputId}-label`}>{label}</AppText> : null}
      <TextInput
        {...rtlProps}
        {...props}
        style={[rtlStyles.layout, rtlStyles.text, {
          color: colors.foreground,
          backgroundColor: colors.background,
          borderColor: error ? colors.danger : colors.border,
        }, style]}
        nativeID={inputId}
        editable={editable}
        placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={props.accessibilityHint ?? error ?? hint}
        aria-invalid={Boolean(error)}
        className={`min-h-12 rounded-xl border px-4 py-3 text-right font-tajawal text-base ${editable ? '' : 'opacity-50'} ${className ?? ''}`}
      />
      {error || hint ? (
        <AppText variant="caption" muted={!error} tone={error ? 'danger' : 'muted'} accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {error || hint}
        </AppText>
      ) : null}
    </View>
  );
}
