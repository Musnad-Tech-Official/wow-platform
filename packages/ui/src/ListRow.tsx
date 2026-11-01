import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useWowColors } from '@wow/theme';
import { rtlProps } from './rtl';

export interface ListRowProps {
  title: string;
  description?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function ListRow({
  title,
  description,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const colors = useWowColors();
  const surfaceStyle = { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 };
  const content = (
    <>
      {leading ? <View className="shrink-0">{leading}</View> : null}
      <View className="min-w-0 flex-1 items-start gap-1">
        <AppText className="font-tajawal-medium">{title}</AppText>
        {description ? <AppText variant="caption" muted>{description}</AppText> : null}
      </View>
      {trailing ? <View className="shrink-0">{trailing}</View> : null}
    </>
  );

  const className = 'min-h-14 flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3';
  if (!onPress) {
    return <View {...rtlProps} className={className} style={surfaceStyle}>{content}</View>;
  }

  return (
    <Pressable
      {...rtlProps}
      style={surfaceStyle}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      className={`${className} active:opacity-80`}
    >
      {content}
    </Pressable>
  );
}
