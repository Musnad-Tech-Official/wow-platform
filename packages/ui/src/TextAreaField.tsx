import { useId, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export type TextAreaFieldProps = Omit<TextInputProps, 'multiline'> & {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  minHeight?: number;
  maxLength?: number;
};

/** Accessible, RTL controlled multi-line field. Never writes to an API itself. */
export function TextAreaField({
  label, hint, error, required, minHeight = 120, maxLength, value, editable = true,
  style, accessibilityLabel, nativeID, ...props
}: TextAreaFieldProps) {
  const generatedId = useId();
  const id = nativeID ?? generatedId;
  const colors = useWowColors();
  const [focused, setFocused] = useState(false);
  return (
    <View {...rtlProps} className="gap-2" style={rtlStyles.layout}>
      <AppText variant="label" nativeID={`${id}-label`}>{label}{required ? ' *' : ''}</AppText>
      <TextInput
        {...rtlProps} {...props} multiline numberOfLines={4} value={value} maxLength={maxLength}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        nativeID={id} editable={editable} accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={error ?? hint} aria-invalid={!!error}
        placeholderTextColor={colors.mutedForeground}
        style={[rtlStyles.layout, rtlStyles.text, {
          minHeight, paddingHorizontal: 16, paddingVertical: 12,
          borderWidth: focused ? 2 : 1.5, borderRadius: 12,
          borderColor: error ? colors.danger : (focused ? colors.focusRing : colors.controlBorder),
          backgroundColor: colors.background, color: colors.foreground,
          fontFamily: 'Tajawal-Regular', fontSize: 16, textAlignVertical: 'top',
        }, style]}
      />
      <View className="flex-row items-center justify-between gap-2">
        {error || hint ? (
          <AppText variant="caption" muted={!error} style={error ? { color: colors.danger } : undefined}
            accessibilityLiveRegion={error ? 'polite' : 'none'}>{error ?? hint}</AppText>
        ) : <View />}
        {maxLength !== undefined ? <AppText variant="caption" muted>{String(value?.length ?? 0)} / {maxLength}</AppText> : null}
      </View>
    </View>
  );
}
