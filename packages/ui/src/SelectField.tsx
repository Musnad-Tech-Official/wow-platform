import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export type WowSelectOption = { value: string; label: string; disabled?: boolean };
export interface SelectFieldProps {
  label: string;
  value: string | null;
  options: readonly WowSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

/** Native Modal is used intentionally: no platform-specific picker dependency. */
export function SelectField({
  label, value, options, onValueChange, placeholder = 'اختر من القائمة', hint, error, disabled = false,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const colors = useWowColors();
  const selected = options.find(item => item.value === value);
  return (
    <View {...rtlProps} className="gap-2">
      <AppText variant="label">{label}</AppText>
      <Pressable {...rtlProps} accessibilityRole="button" accessibilityLabel={label}
        accessibilityHint="افتح قائمة الخيارات" accessibilityState={{ disabled, expanded: open }}
        disabled={disabled} onPress={() => setOpen(true)}
        className="min-h-12 flex-row items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{ opacity: disabled ? .5 : 1, borderWidth: 1.5, borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.background }}>
        <AppText style={{ color: selected ? colors.foreground : colors.mutedForeground }}>
          {selected?.label ?? placeholder}
        </AppText>
        <ChevronDown color={colors.mutedForeground} size={20}/>
      </Pressable>
      {error || hint ? <AppText variant="caption" muted={!error} style={error ? { color: colors.danger } : undefined}>
        {error ?? hint}</AppText> : null}
      <Modal visible={open} transparent animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: '#00000088' }}>
          <View {...rtlProps} className="w-full max-w-md gap-3 rounded-2xl p-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}>
            <View className="flex-row items-center justify-between gap-3">
              <AppText variant="heading" accessibilityRole="header">{label}</AppText>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="إغلاق القائمة"
                className="min-h-12 min-w-12 items-center justify-center">
                <AppText variant="label" muted>إغلاق</AppText>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {options.map(item => (
                <Pressable {...rtlProps} key={item.value} accessibilityRole="button"
                  accessibilityLabel={item.label} accessibilityState={{ selected: item.value === value, disabled: !!item.disabled }}
                  disabled={item.disabled} onPress={() => { onValueChange(item.value); setOpen(false); }}
                  className="min-h-12 flex-row items-center justify-between gap-3 rounded-lg px-3 py-3"
                  style={{ opacity: item.disabled ? .5 : 1 }}>
                  <AppText>{item.label}</AppText>
                  {item.value === value ? <Check color={colors.primary} size={20}/> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
