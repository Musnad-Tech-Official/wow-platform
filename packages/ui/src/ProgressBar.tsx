import { View } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';
import { clampProgress } from './ui-math';

export interface ProgressBarProps {
  value: number; // 0..1
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({ value, label, showPercent = true }: ProgressBarProps) {
  const colors = useWowColors();
  const progress = clampProgress(value);
  const percent = Math.round(progress * 100);
  return (
    <View {...rtlProps} className="gap-2">
      {label || showPercent ? (
        <View className="flex-row items-center justify-between">
          {label ? <AppText variant="label">{label}</AppText> : <View />}
          {showPercent ? <AppText variant="caption" muted>{percent}%</AppText> : null}
        </View>
      ) : null}
      <View accessibilityRole="progressbar" accessibilityLabel={label ?? 'التقدم'}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={{ height: 9, borderRadius: 99, backgroundColor: colors.border, overflow: 'hidden',
          flexDirection: 'row', justifyContent: 'flex-start' }}>
        <View style={{ width: `${percent}%` as `${number}%`, height: '100%', borderRadius: 99, backgroundColor: colors.primary }} />
      </View>
    </View>
  );
}
