import { Pressable, View } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export type WowRadioOption = { value: string; label: string; description?: string; disabled?: boolean };
export interface RadioFieldGroupProps {
  label: string;
  options: readonly WowRadioOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function RadioFieldGroup({ label, options, value, onValueChange, disabled = false }: RadioFieldGroupProps) {
  const colors = useWowColors();
  return (
    <View {...rtlProps} className="gap-2" accessibilityLabel={label}>
      <AppText variant="label">{label}</AppText>
      {options.map(option => {
        const selected = option.value === value;
        const inactive = disabled || !!option.disabled;
        return (
          <Pressable {...rtlProps} key={option.value} accessibilityRole="radio"
            accessibilityLabel={option.label} accessibilityState={{ checked: selected, disabled: inactive }}
            disabled={inactive} onPress={() => onValueChange(option.value)}
            style={[rtlStyles.layout, { opacity: inactive ? .5 : 1,
              borderColor: selected ? colors.focusRing : colors.controlBorder, borderWidth: 1.5,
              backgroundColor: colors.surface, borderRadius: 12 }]}
            className="min-h-12 flex-row items-center gap-3 px-3 py-3">
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.8,
              borderColor: selected ? colors.focusRing : colors.mutedForeground,
              alignItems: 'center', justifyContent: 'center' }}>
              {selected ? <View style={{ width: 11, height: 11, borderRadius: 6,
                backgroundColor: colors.primary }} /> : null}
            </View>
            <View className="min-w-0 flex-1 items-start gap-1">
              <AppText variant="label">{option.label}</AppText>
              {option.description ? <AppText variant="caption" muted>{option.description}</AppText> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
