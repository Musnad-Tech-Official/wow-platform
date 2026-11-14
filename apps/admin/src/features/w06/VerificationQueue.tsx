import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Store, ChevronLeft, RefreshCcw } from 'lucide-react-native';
import { useAdminBusinessVerifications } from '@wow/api';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText, Badge, Card } from '@wow/ui';
import { W06Header, W06Message, W06Paging } from './W06Shared';

const PAGE_SIZE = 25;
const STATUSES: { label: string; value: string | null }[] = [
  { label: 'قيد المراجعة', value: 'submitted' },
  { label: 'طلب استكمال', value: 'needs_info' },
  { label: 'معتمد', value: 'approved' },
  { label: 'مرفوض', value: 'rejected' },
  { label: 'الكل', value: null },
];

function statusLabel(status: string) {
  return STATUSES.find((option) => option.value === status)?.label ?? status;
}

export function VerificationQueue() {
  const router = useRouter();
  const colors = useWowColors();
  const [status, setStatus] = useState<string | null>('submitted');
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const query = useAdminBusinessVerifications({ status, limit: PAGE_SIZE, offset });
  const rows = Array.isArray(query.data) ? query.data : [];
  const normalized = search.trim().toLocaleLowerCase('ar');
  const matching = normalized
    ? rows.filter((item) =>
        [item.business_name, item.id, item.business_id, item.branch_id ?? ''].some(
          (value) => value.toLocaleLowerCase('ar').includes(normalized),
        ))
    : rows;

  return (
    <View className="gap-6">
      <W06Header
        section="تأهيل الأنشطة والفروع"
        title="الأنشطة والفروع وطلبات المراجعة"
        description="سجل حالات التأهيل المسترجعة من الخادم، مع مراجعة مستقلة لكل نشاط وفرع."
      />

      <Card className="p-4 sm:p-6 gap-5 border border-border">
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="gap-1">
            <AppText className="text-lg font-tajawal-bold text-right">سجل التأهيل</AppText>
            <AppText variant="caption" muted className="text-xs text-right">
              البحث في الصفحة الحالية فقط؛ لا تُعرض إجماليات غير متوفرة من الخادم
            </AppText>
          </View>
          <AppButton title="تحديث" variant="outline" size="sm" onPress={() => void query.refetch()} disabled={query.isFetching} />
        </View>

        <View className="flex-row items-center gap-2 border border-border rounded-xl bg-background p-2.5">
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            className="flex-1 font-tajawal text-right text-sm"
            style={{ color: colors.foreground, minHeight: 34 }}
            placeholder="البحث باسم النشاط أو معرّف الطلب"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="البحث في طلبات التأهيل المعروضة"
          />
        </View>

        <View className="flex-row flex-wrap gap-2">
          {STATUSES.map((option) => (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: status === option.value }}
              onPress={() => { setStatus(option.value); setOffset(0); setSearch(''); }}
              className={`rounded-xl px-3 py-2 border ${status === option.value
                ? 'bg-[#FEF3C7] dark:bg-[#422E12] border-[#FACC15]'
                : 'bg-background border-border'}`}
            >
              <AppText className={`font-tajawal-bold text-xs text-right ${status === option.value
                ? 'text-[#854D0E] dark:text-[#FEF08A]' : ''}`}>{option.label}</AppText>
            </Pressable>
          ))}
        </View>

        {query.isPending ? <W06Message title="جارٍ تحميل الطلبات…" kind="info" /> : null}
        {query.isError ? <W06Message title="تعذر تحميل طلبات التأهيل" detail="قد لا تملك هذه الجلسة صلاحية الاستعلام، أو أن الاتصال بالخادم متعثر." kind="error" retry={() => void query.refetch()} /> : null}
        {query.isSuccess && matching.length === 0
          ? <W06Message title={rows.length ? 'لا توجد نتائج مطابقة في هذه الصفحة' : 'لا توجد طلبات في هذه الحالة'} detail="لا يتم إنشاء طلبات افتراضية عند غياب البيانات." />
          : null}

        {query.isSuccess && matching.length > 0 && (
          <View className="gap-2">
            {matching.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/verification/${item.id}` as any)}
                accessibilityRole="button"
                accessibilityLabel={`فتح تفاصيل طلب تأهيل ${item.business_name}`}
                className="rounded-2xl p-4 border border-border bg-background flex-row items-center gap-3"
              >
                <ChevronLeft size={18} color={colors.mutedForeground} />
                <View className="flex-1 gap-2">
                  <View className="flex-row flex-wrap items-center justify-between gap-2">
                    <Badge label={statusLabel(item.status)} variant="secondary" />
                    <View className="flex-row items-center gap-2 flex-shrink">
                      <AppText className="font-tajawal-bold text-sm text-right">{item.business_name}</AppText>
                      <Store size={17} color="#CA8A04" />
                    </View>
                  </View>
                  <AppText variant="caption" muted className="text-xs text-right">
                    {item.request_type === 'initial' ? 'تأهيل نشاط جديد' : 'طلب إضافة فرع'} • {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('ar') : 'لم يُقدّم بعد'}
                  </AppText>
                  <AppText variant="caption" muted numberOfLines={1} className="text-xs text-right">
                    معرّف الطلب: {item.id}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {query.isSuccess && (
          <W06Paging
            offset={offset} count={rows.length} pageSize={PAGE_SIZE} loading={query.isFetching}
            previous={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
            next={() => setOffset((value) => value + PAGE_SIZE)}
          />
        )}
      </Card>
      <View className="px-4 py-3 rounded-xl border border-border flex-row gap-2 items-center">
        <RefreshCcw size={16} color={colors.mutedForeground} />
        <AppText variant="caption" muted className="flex-1 text-xs text-right">
          الاعتماد يخص الطلب المحدد فقط، ولا ينقل التأهيل تلقائياً إلى نشاط أو فرع آخر.
        </AppText>
      </View>
    </View>
  );
}
