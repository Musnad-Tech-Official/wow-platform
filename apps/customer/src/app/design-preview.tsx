import { useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { ClipboardCheck, Store, ArrowLeft } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import {
  AppButton,
  AppInput,
  AppText,
  Checkbox,
  DataState,
  Divider,
  ListRow,
  MetricCard,
  PageHeader,
  PageScaffold,
  SectionHeader,
  StatusBadge,
  ThemeSwitcher,
  type DataStateKind,
} from '@wow/ui';

/**
 * Developer-only shared UI gallery, not a customer-facing screen.
 * No Clerk login, Supabase requests or writes are performed here.
 */
export default function DesignPreviewRoute() {
  const colors = useWowColors();
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState(false);
  const [state, setState] = useState<DataStateKind>('empty');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <PageScaffold testID="wow-ui-preview">
      <PageHeader
        eyebrow="WOW UI / Developer Preview"
        title="مكتبة واجهات واو"
        description="معاينة تطويرية لمكوّنات التطبيقات الثلاثة. الأرقام توضيحية ولا تمثل بيانات حقيقية."
      />
      <ThemeSwitcher />

      <SectionHeader title="الحالات الدلالية" subtitle="نفس المعاني في الوضعين الفاتح والداكن" />
      <View className="flex-row flex-wrap gap-2">
        <StatusBadge label="معتمد" tone="success" />
        <StatusBadge label="قيد المراجعة" tone="warning" />
        <StatusBadge label="مرفوض" tone="danger" />
        <StatusBadge label="جديد" tone="info" />
        <StatusBadge label="مسودة" tone="neutral" />
      </View>

      <Divider />
      <SectionHeader title="المؤشرات" subtitle="قيم توضيحية فقط" />
      <View className="flex-row flex-wrap gap-3">
        <MetricCard label="المتاجر" value="12" caption="بيانات تجريبية" icon={<Store color={colors.primary} size={22} />} />
        <MetricCard label="المراجعات" value="4" caption="بيانات تجريبية" icon={<ClipboardCheck color={colors.primary} size={22} />} />
      </View>

      <SectionHeader
        title="القوائم والإجراءات"
        actionLabel="تغيير الاختيار"
        onActionPress={() => setSelected((previous) => !previous)}
      />
      <ListRow
        title="متجر نموذجي"
        description="حقل تجريبي للتصميم فقط"
        leading={<Store color={colors.foreground} size={22} />}
        trailing={<StatusBadge label={selected ? 'محدد' : 'جديد'} tone={selected ? 'success' : 'neutral'} />}
        onPress={() => setSelected((previous) => !previous)}
      />
      <ListRow title="صف معلومات غير قابل للضغط" description="للعرض فقط" trailing={<ArrowLeft color={colors.mutedForeground} size={18} />} />

      <SectionHeader title="الإدخال والتفاعل" />
      <AppInput label="بحث تجريبي" placeholder="اكتب كلمة للمعاينة" value={query} onChangeText={setQuery} />
      <Checkbox checked={checked} onCheckedChange={setChecked} label="الموافقة على الخيار التجريبي" />
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-32 flex-1"><AppButton title="إجراء أساسي" onPress={() => setChecked(true)} /></View>
        <View className="min-w-32 flex-1"><AppButton title="إجراء ثانوي" variant="secondary" onPress={() => setQuery('')} /></View>
      </View>

      <Divider />
      <SectionHeader title="حالات البيانات" subtitle="يمكن لأي صفحة إعادة استخدام الحالة المناسبة" />
      <View className="flex-row flex-wrap gap-2">
        <AppButton title="فارغ" variant="secondary" size="sm" onPress={() => setState('empty')} />
        <AppButton title="خطأ" variant="secondary" size="sm" onPress={() => setState('error')} />
        <AppButton title="تحميل" variant="secondary" size="sm" onPress={() => setState('loading')} />
      </View>
      <DataState
        kind={state}
        actionLabel={state === 'error' ? 'إعادة المحاولة' : 'عرض مثال خطأ'}
        onAction={() => setState(state === 'error' ? 'loading' : 'error')}
      />
      <AppText variant="caption" muted>
        هذه الصفحة للتطوير فقط. لا تتصل بقاعدة البيانات ولا تُنشئ طلبات أو سجلات.
      </AppText>
    </PageScaffold>
  );
}
