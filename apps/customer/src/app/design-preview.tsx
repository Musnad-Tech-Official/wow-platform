import { useState } from 'react';
import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { V06Gallery } from '../features/design/V06Gallery';
import { V07ThemeAudit } from '../features/design/V07ThemeAudit';
import { wowBrand, wowIllustrations } from '@wow/assets';
import { useWowColors, useWowViewport, wowBrandColors } from '@wow/theme';
import {
  AppButton, AppInput, AppText, AnimatedBell, AnimatedHeart, AnimatedWowIcon, Checkbox,
  DataState, Divider, ListRow, MetricCard, PageHeader, PageScaffold, ResponsiveActionGroup,
  SectionHeader, StatusBadge, ThemeSwitcher, WowIcon, type DataStateKind,
} from '@wow/ui';

/** Preview-only, synthetic data and no Supabase or Clerk mutations. */
export default function DesignPreviewRoute() {
  const colors = useWowColors();
  const viewport = useWowViewport();
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState(false);
  const [state, setState] = useState<DataStateKind>('empty');
  const [lastAction, setLastAction] = useState('اضغط على عنصر لتجربة حركة قصيرة ومقصودة.');
  if (!__DEV__) return <Redirect href="/" />;
  const tileWidth: '100%' | '46%' = viewport.isCompact ? '100%' : '46%';
  return (
    <PageScaffold app="customer" testID="wow-ui-preview">
      <View className="rounded-2xl bg-surface p-4">
        <Image source={wowBrand.logoPrimary} contentFit="contain" alt="شعار واو" style={{ width: 132, height: 70 }} />
        <PageHeader eyebrow="WOW / Design Foundation V0.6" title="المكونات المشتركة" description="هذه لوحة تطوير فقط، وليست من صفحات العميل المعتمدة." />
        <AppText variant="caption" muted>عرض النافذة الحقيقي: {Math.round(viewport.width)}px — وضع التجاوب: {viewport.size} — أصفر الهوية: {wowBrandColors.yellow}</AppText>
      </View>
      <ThemeSwitcher />
      <SectionHeader title="الأزرار وحالاتها" subtitle="تحويم: تغيير لون فقط • ضغط: انكماش 1.5% دون ارتداد • عرض متجاوب" />
      <ResponsiveActionGroup testID="action-grid" minItemWidth={156} maxColumns={4}>
        <AppButton className="w-full" title="أساسي" size="sm" variant="primary" onPress={() => { setChecked(true); setLastAction('ضغط الزر الأساسي'); }} />
        <AppButton className="w-full" title="ثانوي" size="sm" variant="secondary" onPress={() => setChecked(false)} />
        <AppButton className="w-full" title="محدد" size="sm" variant="outline" onPress={() => setSelected(!selected)} />
        <AppButton className="w-full" title="خفيف" size="sm" variant="soft" onPress={() => setSelected(!selected)} />
        <AppButton className="w-full" title="هادئ" size="sm" variant="quiet" onPress={() => setSelected(!selected)} />
        <AppButton className="w-full" title="إجراء حساس" size="sm" variant="danger" onPress={() => setSelected(false)} />
        <AppButton className="w-full" title="جارٍ التحميل" size="sm" loading />
        <AppButton className="w-full" title="غير متاح" size="sm" disabled />
      </ResponsiveActionGroup>
      <SectionHeader title="الأيقونات والحركة" subtitle="حركة صغيرة مختلفة للقلب والجرس والبحث والموقع والمشاركة؛ الحماية تتغير لونياً فقط" />
      <View className="flex-row flex-wrap items-center gap-4">
        <AnimatedHeart initialLiked={false} onChange={(value) => { setSelected(value); setLastAction(value ? 'حفظ في المفضلة' : 'إزالة من المفضلة'); }} />
        <AnimatedBell onPress={() => { setChecked(true); setLastAction('تفاعل مع جرس التنبيهات'); }} />
        <AnimatedWowIcon name="search" label="تجربة حركة البحث" onPress={() => setLastAction('تفاعل مع أيقونة البحث')} />
        <AnimatedWowIcon name="location" label="تجربة حركة الموقع" onPress={() => setLastAction('تفاعل مع أيقونة الموقع')} />
        <AnimatedWowIcon name="share" label="تجربة حركة المشاركة" onPress={() => setLastAction('تفاعل مع أيقونة المشاركة')} />
        <AnimatedWowIcon name="shield" label="تجربة حركة الحماية" onPress={() => setLastAction('تفاعل مع أيقونة الحماية')} />
      </View>
      <AppText variant="caption" muted>{lastAction}</AppText>
      <SectionHeader title="الرسومات المعتمدة" subtitle="الأصول من الحزم الأصلية — دون إعادة رسم" />
      <View className="flex-row flex-wrap items-center gap-3">
        {[
          { source: wowIllustrations.customer.beaconHero, label: 'ترحيب العميل' },
          { source: wowIllustrations.customer.searchEmpty, label: 'بحث فارغ' },
          { source: wowIllustrations.merchant.beaconWelcome, label: 'ترحيب التاجر' },
          { source: wowIllustrations.admin.beaconSecurity, label: 'أمان الإدارة' },
        ].map(item => (
          <View key={item.label} style={{ width: tileWidth }} className="items-center gap-1 rounded-2xl border border-border bg-surface p-3">
            <Image source={item.source} contentFit="contain" alt={item.label} style={{ width: '100%', height: 140 }} />
            <AppText variant="caption" muted>{item.label}</AppText>
          </View>
        ))}
      </View>
      <SectionHeader title="الحالات الدلالية" />
      <View className="flex-row flex-wrap gap-2">
        <StatusBadge label="معتمد" tone="success" />
        <StatusBadge label="قيد المراجعة" tone="warning" />
        <StatusBadge label="مرفوض" tone="danger" />
        <StatusBadge label="جديد" tone="info" />
        <StatusBadge label="مسودة" tone="neutral" />
      </View>
      <Divider />
      <SectionHeader title="المؤشرات والقوائم" subtitle="بيانات توضيحية وليست بيانات فعلية" />
      <View className="flex-row flex-wrap gap-3">
        <MetricCard label="المتاجر" value="12" caption="تجريبي" icon={<WowIcon name="store" color={colors.primary} />} />
        <MetricCard label="المراجعات" value="4" caption="تجريبي" icon={<WowIcon name="check" color={colors.primary} />} />
      </View>
      <ListRow title="متجر نموذجي" description="صف للمعاينة فقط" leading={<WowIcon name="store" />} trailing={<StatusBadge label={selected ? 'محدد' : 'جديد'} tone={selected ? 'success' : 'neutral'} />} onPress={() => setSelected(!selected)} />
      <SectionHeader title="إدخال وتجربة الحالات" />
      <AppInput label="بحث تجريبي" placeholder="اكتب للمعاينة" value={query} onChangeText={setQuery} />
      <Checkbox label="خيار تجريبي" checked={checked} onCheckedChange={setChecked} />
      <ResponsiveActionGroup minItemWidth={156} maxColumns={3}>
        <AppButton className="w-full" title="فارغ" variant="secondary" size="sm" onPress={() => setState('empty')} />
        <AppButton className="w-full" title="خطأ" variant="secondary" size="sm" onPress={() => setState('error')} />
        <AppButton className="w-full" title="تحميل" variant="secondary" size="sm" onPress={() => setState('loading')} />
      </ResponsiveActionGroup>
      <DataState kind={state} actionLabel={state === 'error' ? 'إعادة المحاولة' : undefined} onAction={() => setState('loading')} />
      <Divider />
      <V07ThemeAudit />
      <V06Gallery />
      <AppText variant="caption" muted>لا توجد أي طلبات API أو بيانات مستخدم ضمن هذه المعاينة.</AppText>
    </PageScaffold>
  );
}
