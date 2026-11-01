import { Pressable } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function FilterChip({ label, selected, onPress, disabled = false }: FilterChipProps) {
  const colors = useWowColors();
  return (
    <Pressable {...rtlProps} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
      style={{ minHeight: 48, minWidth: 56, paddingHorizontal: 14, paddingVertical: 10,
        opacity: disabled ? .5 : 1, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderRadius: 999,
        backgroundColor: selected ? colors.primary : colors.surface,
        borderColor: selected ? colors.focusRing : colors.controlBorder }}>
      <AppText variant="label" style={{ color: selected ? colors.primaryForeground : colors.foreground }}>{label}</AppText>
    </Pressable>
  );
}
