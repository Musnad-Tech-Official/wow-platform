import { Pressable, View } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps, rtlStyles } from './rtl';

export interface SwitchFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/** Deliberately no looping animation: the position is authoritative and deterministic. */
export function SwitchField({ label, description, checked, onCheckedChange, disabled = false, testID }: SwitchFieldProps) {
  const colors = useWowColors();
  return (
    <Pressable {...rtlProps} testID={testID} disabled={disabled} accessibilityRole="switch"
      accessibilityLabel={label} accessibilityState={{ checked, disabled }}
      onPress={() => onCheckedChange(!checked)} style={[rtlStyles.layout, { opacity: disabled ? .55 : 1 }]}
      className="min-h-12 flex-row items-center justify-between gap-3 py-2">
      <View className="min-w-0 flex-1 items-start gap-1">
        <AppText variant="label">{label}</AppText>
        {description ? <AppText variant="caption" muted>{description}</AppText> : null}
      </View>
      <View style={{ width: 46, height: 28, borderRadius: 14, padding: 3,
        backgroundColor: checked ? colors.primary : colors.neutralSurface,
        borderWidth: 1.5, borderColor: checked ? colors.focusRing : colors.controlBorder,
        flexDirection: 'row', justifyContent: checked ? 'flex-start' : 'flex-end',
      }}>
        <View style={{ width: 22, height: 22, borderRadius: 11,
          backgroundColor: checked ? colors.primaryForeground : colors.background }}/>
      </View>
    </Pressable>
  );
}
