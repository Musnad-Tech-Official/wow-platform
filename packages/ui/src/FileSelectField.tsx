import { Pressable, View } from 'react-native';
import { Paperclip } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface FileSelectFieldProps {
  label: string;
  filenames?: readonly string[];
  hint?: string;
  disabled?: boolean;
  onChooseFiles: () => void;
}

/** Visual trigger only: app-specific file picker/validation/upload belongs in its feature layer. */
export function FileSelectField({ label, filenames = [], hint, disabled = false, onChooseFiles }: FileSelectFieldProps) {
  const colors = useWowColors();
  return (
    <View {...rtlProps} className="gap-2">
      <AppText variant="label">{label}</AppText>
      <Pressable {...rtlProps} disabled={disabled} onPress={onChooseFiles}
        accessibilityRole="button" accessibilityLabel={label}
        accessibilityHint="اختيار الملفات من الجهاز" accessibilityState={{ disabled }}
        className="min-h-16 flex-row items-center gap-3 rounded-xl border border-dashed px-4 py-3"
        style={{ borderColor: colors.border, backgroundColor: colors.surface, opacity: disabled ? .55 : 1 }}>
        <Paperclip color={colors.mutedForeground} size={21}/>
        <View className="min-w-0 flex-1 items-start gap-1">
          <AppText variant="label">{filenames.length ? `${filenames.length} ملفات محددة` : 'اختيار ملفات'}</AppText>
          <AppText variant="caption" muted numberOfLines={2}>
            {filenames.length ? filenames.join('، ') : (hint ?? 'اختر ملفاً للمتابعة')}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}
