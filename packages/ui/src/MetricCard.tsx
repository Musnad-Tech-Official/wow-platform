import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface MetricCardProps {
  label: string;
  value: string | number;
  caption?: string;
  icon?: ReactNode;
}

/** A neutral KPI card; values must be sourced from real or explicitly labeled demo data. */
export function MetricCard({ label, value, caption, icon }: MetricCardProps) {
  return (
    <Card className="min-w-36 flex-1 gap-3 p-4">
      <View {...rtlProps} className="flex-row items-center justify-between gap-2">
        <AppText variant="label" muted>{label}</AppText>
        {icon ? <View>{icon}</View> : null}
      </View>
      <AppText className="font-tajawal-bold text-2xl">{String(value)}</AppText>
      {caption ? <AppText variant="caption" muted>{caption}</AppText> : null}
    </Card>
  );
}
