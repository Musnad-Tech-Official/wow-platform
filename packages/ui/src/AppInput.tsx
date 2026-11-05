import { useId, useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export type AppInputProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  containerClassName?: string;
};

export function AppInput({ label, hint, error, required, leading, trailing, containerClassName, className, style, editable = true,
  accessibilityLabel, nativeID, placeholderTextColor, ...props }: AppInputProps) {
  const id = useId();
  const inputId = nativeID ?? id;
  const colors = useWowColors();
  const [focused, setFocused] = useState(false);

  return (
    <View {...rtlProps} style={rtlStyles.layout} className={`gap-2 ${containerClassName ?? ''}`}>
      {label ? (
        <AppText variant="label" nativeID={`${inputId}-label`}>
          {label}
          {required ? <AppText style={{ color: colors.warning }}> *</AppText> : null}
        </AppText>
      ) : null}
      {leading || trailing ? (
        <View
          {...rtlProps}
          style={[rtlStyles.layout, {
            backgroundColor: colors.background,
            borderColor: error ? colors.danger : (focused ? colors.focusRing : colors.controlBorder),
            borderWidth: focused ? 2 : 1,
          }]}
          className={`min-h-12 flex-row items-center gap-2 rounded-xl px-3 ${editable ? '' : 'opacity-50'}`}
        >
          {leading ? <View className="shrink-0">{leading}</View> : null}
          <TextInput
            {...rtlProps}
            {...props}
            style={[rtlStyles.layout, rtlStyles.text, {
              flex: 1,
              color: colors.foreground,
              minHeight: 48,
            }, style]}
            nativeID={inputId}
            onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
            onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
            editable={editable}
            placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={props.accessibilityHint ?? error ?? hint}
            aria-invalid={Boolean(error)}
            className={`text-right font-tajawal text-base ${className ?? ''}`}
          />
          {trailing ? <View className="shrink-0">{trailing}</View> : null}
        </View>
      ) : (
        <TextInput
          {...rtlProps}
          {...props}
          style={[rtlStyles.layout, rtlStyles.text, {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: error ? colors.danger : (focused ? colors.focusRing : colors.controlBorder),
            borderWidth: focused ? 2 : 1,
          }, style]}
          nativeID={inputId}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
          editable={editable}
          placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={props.accessibilityHint ?? error ?? hint}
          aria-invalid={Boolean(error)}
          className={`min-h-12 rounded-xl border px-4 py-3 text-right font-tajawal text-base ${editable ? '' : 'opacity-50'} ${className ?? ''}`}
        />
      )}
      {error || hint ? (
        <AppText variant="caption" muted={!error} tone={error ? 'danger' : 'muted'} accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {error || hint}
        </AppText>
      ) : null}
    </View>
  );
}
