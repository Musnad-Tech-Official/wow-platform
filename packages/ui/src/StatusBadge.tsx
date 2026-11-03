import { View } from 'react-native';
import { useWowColors, type WowStatusTone } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface StatusBadgeProps {
  label: string;
  tone?: WowStatusTone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const colors = useWowColors();
  const palette = {
    success: { backgroundColor: colors.successSurface, color: colors.success },
    warning: { backgroundColor: colors.warningSurface, color: colors.warning },
    danger: { backgroundColor: colors.dangerSurface, color: colors.danger },
    info: { backgroundColor: colors.infoSurface, color: colors.info },
    neutral: { backgroundColor: colors.neutralSurface, color: colors.neutral },
  }[tone];

  return (
    <View {...rtlProps} className="self-start rounded-lg px-3 py-1.5" style={{ backgroundColor: palette.backgroundColor }}>
      <AppText variant="label" style={{ color: palette.color }}>{label}</AppText>
    </View>
  );
}
