import { ActivityIndicator, View } from 'react-native';
import { AlertCircle, Inbox } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export type DataStateKind = 'loading' | 'empty' | 'error';

export interface DataStateProps {
  kind: DataStateKind;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const defaults = {
  loading: { title: 'جارٍ التحميل...', description: 'لحظات ونجهّز البيانات.' },
  empty: { title: 'لا توجد بيانات بعد', description: 'ستظهر هنا عند توفرها.' },
  error: { title: 'تعذّر تحميل البيانات', description: 'تحقق من اتصالك وحاول مرة أخرى.' },
} as const;

/** Explicit loading/empty/error UI. Does not retry mutations by itself. */
export function DataState({ kind, title, description, actionLabel, onAction }: DataStateProps) {
  const colors = useWowColors();
  const iconColor = kind === 'error' ? colors.danger : colors.mutedForeground;

  return (
    <View
      {...rtlProps}
      accessibilityLiveRegion="polite"
      className="min-h-52 items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-6"
    >
      {kind === 'loading' ? <ActivityIndicator size="large" color={colors.primary} /> : null}
      {kind === 'empty' ? <Inbox size={30} color={iconColor} strokeWidth={1.7} /> : null}
      {kind === 'error' ? <AlertCircle size={30} color={iconColor} strokeWidth={1.7} /> : null}
      <AppText variant="heading" style={{ textAlign: 'center' }}>{title ?? defaults[kind].title}</AppText>
      <AppText muted style={{ textAlign: 'center' }}>{description ?? defaults[kind].description}</AppText>
      {actionLabel && onAction && kind !== 'loading' ? (
        <AppButton title={actionLabel} onPress={onAction} size="sm" variant="secondary" />
      ) : null}
    </View>
  );
}
