import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View {...rtlProps} className="flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1 items-start gap-1">
        <AppText variant="heading" accessibilityRole="header">{title}</AppText>
        {subtitle ? <AppText variant="caption" muted>{subtitle}</AppText> : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          {...rtlProps}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          className="min-h-12 justify-center rounded-xl px-3 active:opacity-70"
        >
          <AppText variant="label" className="font-tajawal-bold text-primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
