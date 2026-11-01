import { Pressable, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useWowColors, type WowStatusTone } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface ToastBannerProps {
  visible: boolean;
  message: string;
  tone?: Exclude<WowStatusTone, 'neutral'>;
  onDismiss: () => void;
}

/** Explicit controlled notice; no artificial timers or claimed success. */
export function ToastBanner({ visible, message, tone = 'info', onDismiss }: ToastBannerProps) {
  const colors = useWowColors();
  if (!visible) return null;
  const palette = {
    success: { bg: colors.successSurface, fg: colors.success },
    warning: { bg: colors.warningSurface, fg: colors.warning },
    danger: { bg: colors.dangerSurface, fg: colors.danger },
    info: { bg: colors.infoSurface, fg: colors.info },
  }[tone];
  return (
    <View {...rtlProps} accessibilityLiveRegion="polite" className="min-h-12 flex-row items-center gap-3 rounded-xl p-3"
      style={{ backgroundColor: palette.bg }}>
      <View className="min-w-0 flex-1"><AppText style={{ color: palette.fg }}>{message}</AppText></View>
      <Pressable accessibilityRole="button" accessibilityLabel="إغلاق التنبيه" onPress={onDismiss}
        className="min-h-12 min-w-12 items-center justify-center">
        <X color={palette.fg} size={19}/>
      </Pressable>
    </View>
  );
}
