import { View } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';
import { useWowColors, type WowStatusTone } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface InlineNoticeProps {
  title: string;
  description?: string;
  tone?: Exclude<WowStatusTone, 'neutral'>;
}

export function InlineNotice({ title, description, tone = 'info' }: InlineNoticeProps) {
  const colors = useWowColors();
  const style = {
    success: { backgroundColor: colors.successSurface, color: colors.success, Icon: CheckCircle2 },
    warning: { backgroundColor: colors.warningSurface, color: colors.warning, Icon: AlertTriangle },
    danger: { backgroundColor: colors.dangerSurface, color: colors.danger, Icon: AlertCircle },
    info: { backgroundColor: colors.infoSurface, color: colors.info, Icon: Info },
  }[tone];
  const NoticeIcon = style.Icon;
  return (
    <View {...rtlProps} accessibilityLiveRegion="polite" className="flex-row items-start gap-3 rounded-xl p-4"
      style={{ backgroundColor: style.backgroundColor }}>
      <NoticeIcon size={21} strokeWidth={1.8} color={style.color} />
      <View className="min-w-0 flex-1 items-start gap-1">
        <AppText variant="label" style={{ color: style.color }}>{title}</AppText>
        {description ? <AppText style={{ color: style.color }}>{description}</AppText> : null}
      </View>
    </View>
  );
}
