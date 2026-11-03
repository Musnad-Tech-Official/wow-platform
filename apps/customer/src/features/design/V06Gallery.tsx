import { useState } from 'react';
import { View } from 'react-native';
import {
  AppButton, AppText, BottomSheet, ConfirmDialog, DataTable, FileSelectField, FilterChip,
  InlineNotice, Pagination, ProgressBar, RadioFieldGroup, ResponsiveActionGroup,
  SearchField, SectionHeader, SegmentedTabs, SelectField, Skeleton, SwitchField,
  Stepper, TextAreaField, ToastBanner, type DataTableColumn,
} from '@wow/ui';

type PreviewRecord = { id: string; shop: string; status: string; owner: string };
const previewRows: PreviewRecord[] = [
  { id: '1', shop: 'متجر تجريبي ١', status: 'قيد المراجعة', owner: 'مستخدم تجريبي' },
  { id: '2', shop: 'متجر تجريبي ٢', status: 'معتمد', owner: 'مستخدم آخر' },
  { id: '3', shop: 'متجر تجريبي ٣', status: 'مسودة', owner: 'صاحب الحساب' },
];
const columns: DataTableColumn<PreviewRecord>[] = [
  { key: 'shop', title: 'المتجر', width: 190, render: row => <AppText>{row.shop}</AppText> },
  { key: 'status', title: 'الحالة', width: 150, render: row => <AppText>{row.status}</AppText> },
  { key: 'owner', title: 'المالك', width: 190, render: row => <AppText>{row.owner}</AppText> },
];

/** All numbers and names are synthetic. No queries, writes, uploads or timers. */
export function V06Gallery() {
  const [search, setSearch] = useState('');
  const [details, setDetails] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [type, setType] = useState('offer');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('active');
  const [city, setCity] = useState<string | null>(null);
  const [progress, setProgress] = useState(.4);
  const [page, setPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <View className="gap-5">
      <SectionHeader title="V0.6 • البحث والحقول" subtitle="مدخلات متجاوبة ومتحكم بها من التطبيق" />
      <SearchField value={search} onChangeText={setSearch} onSubmitSearch={() => setToastOpen(true)} />
      <TextAreaField label="وصف تجريبي" placeholder="صف العرض..." value={details}
        onChangeText={setDetails} maxLength={280} hint="مثال على نص طويل بالعربية." />
      <SelectField label="المدينة" placeholder="اختر مدينة" value={city}
        onValueChange={setCity} options={[{ value: 'aden', label: 'عدن' },
          { value: 'sanaa', label: 'صنعاء' }, { value: 'taiz', label: 'تعز' }]} />
      <SwitchField label="تفعيل عرض تجريبي" description="حالة محلية للمعاينة فقط"
        checked={enabled} onCheckedChange={setEnabled}/>
      <RadioFieldGroup label="نوع المحتوى" value={type} onValueChange={setType}
        options={[{ value: 'offer', label: 'عرض' }, { value: 'business', label: 'متجر' }]}/>
      <SectionHeader title="الفلاتر والتبويبات" subtitle="تظل العناصر مقروءة عند عرض الهاتف" />
      <View className="flex-row flex-wrap gap-2">
        {['all', 'approved', 'pending'].map((v, i) => <FilterChip key={v}
          label={['الكل', 'معتمد', 'قيد المراجعة'][i]}
          selected={filter === v} onPress={() => setFilter(v)}/>)}
      </View>
      <SegmentedTabs value={tab} onValueChange={setTab}
        tabs={[{ value: 'active', label: 'المنشورة' }, { value: 'draft', label: 'المسودات' },
          { value: 'review', label: 'تحتاج مراجعة' }]}/>
      <SectionHeader title="الحالات والتحميل" />
      <InlineNotice tone="info" title="معلومة تجريبية" description="لا توجد عملية فعلية في قاعدة البيانات."/>
      <InlineNotice tone="warning" title="قيد المراجعة" description="مثال على حالة تتطلب انتباهاً."/>
      <ProgressBar value={progress} label="تقدم العرض"/>
      <ResponsiveActionGroup minItemWidth={156} maxColumns={2}>
        <AppButton className="w-full" title="زيادة التقدم" variant="secondary" size="sm"
          onPress={() => setProgress(p => Math.min(1, p + .2))}/>
        <AppButton className="w-full" title="إعادة التقدم" variant="outline" size="sm"
          onPress={() => setProgress(0)}/>
      </ResponsiveActionGroup>
      <View className="gap-2 rounded-xl border border-border bg-surface p-4">
        <Skeleton height={22} width="42%"/>
        <Skeleton height={14}/>
        <Skeleton height={14} width="75%"/>
      </View>
      <SectionHeader title="الجدول والتصفح" subtitle="الجدول يتمرر أفقياً على الهاتف دون تصغير الخط" />
      <DataTable columns={columns} rows={previewRows} getRowKey={row => row.id}/>
      <Pagination page={page} totalPages={4} onPageChange={setPage}/>
      <SectionHeader title="خطوات العملية" />
      <Stepper steps={["البيانات", "الصور", "المراجعة"]} currentStep={1}/>
      <SectionHeader title="اختيار الملفات والتأكيد" subtitle="المعاينة لا تفتح منتقي الملفات أو ترفع شيئاً" />
      <FileSelectField label="إرفاق مستند" hint="مكوّن عرض؛ يربطه المطور بمنتقي الملفات"
        onChooseFiles={() => setToastOpen(true)}/>
      <ResponsiveActionGroup minItemWidth={156} maxColumns={2}>
        <AppButton className="w-full" title="فتح حوار تأكيد" size="sm" onPress={() => setConfirmOpen(true)}/>
        <AppButton className="w-full" title="فتح لوحة سفلية" variant="soft" size="sm"
          onPress={() => setSheetOpen(true)}/>
      </ResponsiveActionGroup>
      <BottomSheet visible={sheetOpen} title="لوحة إجراءات تجريبية" onClose={() => setSheetOpen(false)}>
        <AppText>محتوى متجاوب قابل للتمرير، دون عمليات فعلية.</AppText>
      </BottomSheet>
      <ToastBanner visible={toastOpen} message="هذه معاينة محلية فقط؛ لم يُحفظ أي تغيير."
        onDismiss={() => setToastOpen(false)}/>
      <ConfirmDialog visible={confirmOpen} title="تأكيد إجراء تجريبي"
        description="لن يؤدي التأكيد إلى أي تعديل حقيقي." cancelLabel="إلغاء"
        onCancel={() => setConfirmOpen(false)} onConfirm={() => {
          setConfirmOpen(false); setToastOpen(true);
        }}/>
      <AppText variant="caption" muted>V0.6 للمعاينة والتقييم؛ لا تتضمن اتصالاً بالخادم أو رفع ملفات.</AppText>
    </View>
  );
}
