import { useState } from 'react';
import { View } from 'react-native';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppInput, AppText, Badge, Card, SectionHeader, ThemeSwitcher } from '@wow/ui';

/** Developer-only contrast preview. No persistence, network or account data. */
export function V07ThemeAudit() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const [value, setValue] = useState('');
  return (
    <View className="gap-3" testID="wow-v07-theme-audit">
      <SectionHeader title="اختبار تباين الألوان V0.7" subtitle={`الوضع الحالي: ${resolvedTheme} — افحص كل النصوص والأزرار والحقول`} />
      <ThemeSwitcher />
      <Card>
        <AppText variant="heading">عنوان رئيسي</AppText>
        <AppText>نص عادي يجب أن يظل واضحًا في كل الأوضاع.</AppText>
        <AppText muted>نص ثانوي بتباين مناسب.</AppText>
        <AppText tone="danger">رسالة خطأ بلون دلالي.</AppText>
        <AppText className="text-primary-foreground" style={{ backgroundColor: colors.primary, padding: 8 }}>
          اختبار لون النص القديم على الخلفية الصفراء.
        </AppText>
        <View className="flex-row flex-wrap gap-2">
          <Badge label="شارة رئيسية" />
          <Badge label="شارة ثانوية" variant="secondary" />
        </View>
        <AppInput label="حقل إدخال" placeholder="نص إرشادي ظاهر" value={value} onChangeText={setValue} />
        <AppInput label="حقل بخطأ" value="" error="رسالة الخطأ مرئية" editable={false} />
        <AppButton title="إجراء أساسي" onPress={() => setValue('تم الاختبار')} />
        <AppButton title="إجراء ثانوي" variant="secondary" onPress={() => setValue('')} />
      </Card>
    </View>
  );
}
