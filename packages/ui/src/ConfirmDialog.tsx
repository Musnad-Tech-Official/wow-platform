import { Modal, View } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { ResponsiveActionGroup } from './ResponsiveActionGroup';
import { rtlProps } from './rtl';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** No implicit success or auto-dismiss: the parent owns actual async mutation state. */
export function ConfirmDialog({
  visible, title, description, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء',
  destructive = false, busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const colors = useWowColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}
      statusBarTranslucent>
      <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: '#00000088' }}>
        <View {...rtlProps} className="w-full max-w-md items-start gap-4 rounded-2xl p-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}>
          <AppText variant="heading" accessibilityRole="header">{title}</AppText>
          <AppText muted>{description}</AppText>
          <View className="w-full">
            <ResponsiveActionGroup minItemWidth={128} maxColumns={2}>
              <AppButton className="w-full" title={cancelLabel} variant="secondary" size="sm"
                disabled={busy} onPress={onCancel} />
              <AppButton className="w-full" title={confirmLabel}
                variant={destructive ? 'danger' : 'primary'} loading={busy}
                size="sm" onPress={onConfirm}/>
            </ResponsiveActionGroup>
          </View>
        </View>
      </View>
    </Modal>
  );
}
