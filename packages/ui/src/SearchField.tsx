import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { rtlProps, rtlStyles } from './rtl';

export type SearchFieldProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
  onSubmitSearch?: () => void;
  label?: string;
};

/** Search is a local controlled input; queries only run when its parent decides. */
export function SearchField({
  value, onChangeText, onSubmitSearch, label = 'بحث', placeholder = 'ابحث...',
  editable = true, style, ...props
}: SearchFieldProps) {
  const colors = useWowColors();
  return (
    <View {...rtlProps} className="min-h-12 flex-row items-center gap-2 rounded-xl border border-border bg-background px-3"
      style={rtlStyles.layout}>
      <Search size={20} strokeWidth={1.9} color={colors.mutedForeground} />
      <TextInput {...rtlProps} {...props} editable={editable} value={value} onChangeText={onChangeText}
        onSubmitEditing={() => onSubmitSearch?.()} returnKeyType="search" placeholder={placeholder}
        accessibilityLabel={props.accessibilityLabel ?? label} placeholderTextColor={colors.mutedForeground}
        style={[rtlStyles.text, { flex: 1, minHeight: 48, minWidth: 0, fontSize: 16,
          color: colors.foreground, fontFamily: 'Tajawal-Regular', textAlign: 'right' }, style]}/>
      {editable && value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="مسح البحث"
          className="min-h-12 min-w-12 items-center justify-center">
          <X size={19} color={colors.mutedForeground} strokeWidth={1.8}/>
        </Pressable>
      ) : null}
    </View>
  );
}
