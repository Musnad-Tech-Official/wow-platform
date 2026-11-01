import { useState } from 'react';
import { View } from 'react-native';
import { useTheme, useWowColors, wowColorSchemes } from '@wow/theme';
import {
  AnimatedWowIcon, AppButton, AppInput, AppText, Badge, Card, Checkbox,
  FilterChip, InlineNotice, ListRow, ProgressBar, ResponsiveActionGroup,
  SearchField, SectionHeader, SegmentedTabs, StatusBadge, SwitchField,
  ThemeSwitcher, WowIcon,
} from '@wow/ui';

type Palette = (typeof wowColorSchemes)[keyof typeof wowColorSchemes];

/** Both palettes are rendered together to catch white-on-white or dark-on-dark mistakes. */
function PaletteSample({ mode, colors }: { mode: 'light' | 'dark'; colors: Palette }) {
  return (
    <View
      testID={mode === 'light' ? 'wow-v08-palette-light' : 'wow-v08-palette-dark'}
      style={{ minWidth: 130, flexGrow: 1, flexBasis: 200, padding: 14,
        borderWidth: 1, borderColor: colors.controlBorder, borderRadius: 12,
        backgroundColor: colors.background, gap: 8 }}
    >
      <AppText variant="label" style={{ color: colors.foreground }}>
        {mode === 'light' ? 'الوضع الفاتح' : 'الوضع الداكن'}
      </AppText>
      <AppText style={{ color: colors.foreground }}>نص أساسي واضح</AppText>
      <AppText variant="caption" style={{ color: colors.mutedForeground }}>نص ثانوي قابل للقراءة</AppText>
      <AppText variant="label" style={{ color: colors.actionForeground }}>رابط أو إجراء نصي</AppText>
      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.primary }}>
        <AppText variant="label" style={{ color: colors.primaryForeground }}>نص على الأصفر</AppText>
      </View>
      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.successSurface }}>
        <AppText variant="label" style={{ color: colors.success }}>تم الاعتماد</AppText>
      </View>
      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.warningSurface }}>
        <AppText variant="label" style={{ color: colors.warning }}>قيد المراجعة</AppText>
      </View>
      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.dangerSurface }}>
        <AppText variant="label" style={{ color: colors.danger }}>حدث خطأ</AppText>
      </View>
    </View>
  );
}

/** Local-only visual/interaction audit: no API, upload, persistence or network. */
export function V08AcceptanceGallery() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [text, setText] = useState('نص تجريبي ظاهر');
  const [checked, setChecked] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('offers');
  const [action, setAction] = useState('لم يُضغط أي إجراء بعد.');
  return (
    <View testID="wow-v08-acceptance" className="gap-5">
      <SectionHeader title="V0.8 — فحص الاعتماد البصري" subtitle="نماذج حقيقية من المكونات المشتركة؛ لا توجد عمليات خلفية" />
      <Card>
        <AppText variant="heading">الوضع الحالي: {resolvedTheme === 'dark' ? 'داكن' : 'فاتح'}</AppText>
        <ThemeSwitcher />
        <AppText variant="caption" muted>بدّل الوضع إلى فاتح، داكن، ثم النظام؛ راقب النصوص وحدود الحقول.</AppText>
      </Card>
      <SectionHeader title="مقارنة فورية للوضعين" subtitle="كل الألوان المهمة تظهر في الوقت نفسه بغض النظر عن وضع الجهاز" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' }}>
        <PaletteSample mode="light" colors={wowColorSchemes.light} />
        <PaletteSample mode="dark" colors={wowColorSchemes.dark} />
      </View>
      <SectionHeader
        title="أزرار وتفاعل واضح"
        subtitle="تمييز الزر الأساسي والثانوي، التركيز، والتحويم دون حركة مبالغ فيها"
        actionLabel="إجراء نصي واضح"
        onActionPress={() => setAction('تم اختبار الرابط النصي محليًا.')}
      />
      <ResponsiveActionGroup minItemWidth={138} maxColumns={3}>
        <AppButton title="أساسي" onPress={() => setAction('تم ضغط الأساسي محليًا.')} />
        <AppButton title="ثانوي" variant="secondary" onPress={() => setAction('تم ضغط الثانوي محليًا.')} />
        <AppButton title="محدد" variant="outline" onPress={() => setAction('تم ضغط المحدد محليًا.')} />
        <AppButton title="إجراء خطر" variant="danger" onPress={() => setAction('تم ضغط إجراء تجريبي؛ بلا حفظ.')} />
        <AppButton title="غير متاح" disabled onPress={() => setAction('هذا الزر يجب ألا يعمل.')} />
        <AppButton title="تحميل" loading onPress={() => setAction('هذا الزر يجب ألا يعمل.')} />
      </ResponsiveActionGroup>
      <AppText variant="caption" style={{ color: colors.actionForeground }}>{action}</AppText>
      <Card>
        <SectionHeader title="حقول الإدخال والبحث" subtitle="النص المكتوب والنص الإرشادي وحدود الحقول" />
        <AppInput label="حقل عادي" value={text} onChangeText={setText} placeholder="أدخل نصًا" />
        <AppInput label="حقل بخطأ" value="" error="رسالة الخطأ مرئية" placeholder="قيمة غير صالحة" />
        <AppInput label="حقل معطل" value="حالة قراءة فقط" editable={false} />
        <SearchField label="بحث تجريبي" value={search} onChangeText={setSearch} />
        <Checkbox checked={checked} onCheckedChange={setChecked} label="موافقة تجريبية" />
        <SwitchField checked={enabled} onCheckedChange={setEnabled} label="مفتاح تجريبي" />
      </Card>
      <SectionHeader title="الحالات والأيقونات" subtitle="لا نعتمد على اللون وحده لتفسير حالة البيانات" />
      <View className="flex-row flex-wrap gap-2">
        <StatusBadge label="مقبول" tone="success" />
        <StatusBadge label="معلق" tone="warning" />
        <StatusBadge label="مرفوض" tone="danger" />
        <StatusBadge label="معلومات" tone="info" />
        <StatusBadge label="مسودة" tone="neutral" />
        <Badge label="أساسي" />
        <Badge label="ثانوي" variant="secondary" />
      </View>
      <View className="flex-row flex-wrap items-center gap-3">
        <AnimatedWowIcon name="search" label="اختبار حركة البحث" onPress={() => setAction('تم اختبار حركة البحث.')} />
        <AnimatedWowIcon name="location" label="اختبار حركة الموقع" onPress={() => setAction('تم اختبار حركة الموقع.')} />
        <WowIcon name="shield" size={24} color={colors.actionForeground} decorative={false} accessibilityLabel="رمز الأمان" />
      </View>
      <InlineNotice tone="info" title="هذه معاينة اختبار" description="لا تتصل بخدمات WOW ولا ترسل بيانات إلى الخادم." />
      <ListRow title="بطاقة قائمة مقروءة" description="نص ثانوي واضح داخل بطاقة" leading={<WowIcon name="store" color={colors.foreground} />} />
      <SectionHeader title="تمييز الاختيار والتقدم" />
      <View className="flex-row flex-wrap gap-2">
        <FilterChip label="الكل" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="المقبولة" selected={filter === 'approved'} onPress={() => setFilter('approved')} />
      </View>
      <SegmentedTabs value={tab} onValueChange={setTab} tabs={[
        { value: 'offers', label: 'العروض' }, { value: 'businesses', label: 'المتاجر' },
      ]} />
      <ProgressBar value={.65} label="تقدم تجريبي" />
      <AppText variant="caption" muted>
        اختبار الهاتف: 320 و375 و390. الجهاز اللوحي: 768. سطح المكتب: 1024 و1440.
        افحص عدم اختفاء النصوص أو خروج الأزرار خارج الشاشة، ثم التبديل إلى الوضع الداكن.
      </AppText>
    </View>
  );
}
