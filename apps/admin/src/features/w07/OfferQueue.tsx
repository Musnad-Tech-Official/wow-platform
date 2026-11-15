import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, Tag } from 'lucide-react-native';
import { useAdminPendingOffers } from '@wow/api';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText, Badge, Card } from '@wow/ui';
import { W06Header, W06Message, W06Paging } from '../w06/W06Shared';

const PAGE_SIZE = 25;

export function OfferQueue() {
  const router = useRouter();
  const colors = useWowColors();
  const [offset, setOffset] = useState(0);
  const [term, setTerm] = useState('');
  const query = useAdminPendingOffers({ limit: PAGE_SIZE, offset });
  const rows = Array.isArray(query.data) ? query.data : [];
  const search = term.trim().toLocaleLowerCase('ar');
  const visible = rows.filter((row) => !search ||
    [row.business_name, row.title ?? '', row.version_id, row.business_id]
      .some((value) => value.toLocaleLowerCase('ar').includes(search)));

  return (
    <View className="gap-6">
      <W06Header section="مراجعة العروض" title="العروض بانتظار المراجعة"
        description="نسخ العروض المرسلة من التجار، مرتبة من الأقدم. القرار يتعلق بنسخة العرض المحددة فقط." />
      <Card className="p-4 sm:p-6 border border-border gap-4">
        <View className="flex-row flex-wrap justify-between items-center gap-3">
          <View className="gap-1">
            <AppText className="text-lg font-tajawal-bold text-right">قائمة انتظار العروض</AppText>
            <AppText variant="caption" muted className="text-xs text-right">
              البحث في الصفحة الحالية فقط. لا تُعرض أرقام إجمالية غير واردة من الخادم.
            </AppText>
          </View>
          <AppButton title="تحديث" variant="outline" size="sm"
            disabled={query.isFetching} onPress={() => void query.refetch()} />
        </View>
        <View className="flex-row items-center gap-2 rounded-xl border border-border p-2.5">
          <Search size={18} color={colors.mutedForeground} />
          <TextInput className="flex-1 font-tajawal text-right text-sm"
            style={{ color: colors.foreground, minHeight: 34 }}
            placeholder="بحث باسم التاجر أو عنوان العرض أو المعرّف"
            placeholderTextColor={colors.mutedForeground}
            value={term} onChangeText={setTerm}
            accessibilityLabel="البحث في عروض الصفحة الحالية" />
        </View>
        {query.isPending && <W06Message title="جارٍ تحميل العروض…" kind="info" />}
        {query.isError && <W06Message title="تعذر الوصول إلى قائمة العروض"
          detail="قد تكون صلاحية الجلسة غير كافية أو تعذر الاتصال بالخادم."
          kind="error" retry={() => void query.refetch()} />}
        {query.isSuccess && visible.length === 0 &&
          <W06Message title={rows.length ? 'لا توجد نتائج مطابقة في الصفحة' : 'لا توجد عروض معلقة حالياً'}
            detail="لا تُنشأ بيانات أو عروض افتراضية عند خلو القائمة." />}
        {query.isSuccess && visible.length > 0 && (
          <View className="gap-2">
            {visible.map((item) => (
              <Pressable key={item.version_id} accessibilityRole="button"
                accessibilityLabel={'مراجعة عرض ' + (item.title || item.version_id)}
                onPress={() => router.push(('/offer-review/' + item.version_id) as any)}
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-background p-4">
                <ChevronLeft size={18} color={colors.mutedForeground} />
                <View className="flex-1 gap-2">
                  <View className="flex-row flex-wrap items-center justify-between gap-2">
                    <Badge label="بانتظار المراجعة" variant="secondary" />
                    <View className="flex-row gap-2 items-center flex-1 justify-end">
                      <AppText className="font-tajawal-bold text-sm text-right" numberOfLines={2}>
                        {item.title || 'عرض بلا عنوان'}
                      </AppText>
                      <Tag size={17} color="#A16207" />
                    </View>
                  </View>
                  <AppText variant="caption" muted className="text-xs text-right">{item.business_name}</AppText>
                  <AppText variant="caption" muted className="text-xs text-right">
                    {item.final_price === null ? 'السعر غير محدد' : String(item.final_price) + ' ' + (item.currency || '')}
                    {' • '}
                    {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('ar') : 'تاريخ غير متاح'}
                  </AppText>
                  <AppText variant="caption" muted className="text-xs text-right" numberOfLines={1}>
                    معرّف النسخة: {item.version_id}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {query.isSuccess && <W06Paging offset={offset} count={rows.length}
          pageSize={PAGE_SIZE} loading={query.isFetching}
          previous={() => { setOffset(Math.max(0, offset - PAGE_SIZE)); setTerm(''); }}
          next={() => { setOffset(offset + PAGE_SIZE); setTerm(''); }} />}
      </Card>
    </View>
  );
}
