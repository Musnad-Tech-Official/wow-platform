import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}

/** Reusable screen heading; caller owns any navigation action. */
export function PageHeader({ title, description, eyebrow, action }: PageHeaderProps) {
  return (
    <View {...rtlProps} className="flex-row items-center gap-3">
      <View className="min-w-0 flex-1 items-start gap-1">
        {eyebrow ? <AppText variant="label" muted>{eyebrow}</AppText> : null}
        <AppText variant="title" accessibilityRole="header">{title}</AppText>
        {description ? <AppText muted>{description}</AppText> : null}
      </View>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  );
}
