import React from 'react';
import { View } from 'react-native';
import { useAdminComplaint } from '@wow/api';
import { AppText, Card } from '@wow/ui';
import { W06Header, W06Message } from '../w06/W06Shared';

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ?
    value as Record<string, unknown> : {};
const asText = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value :
    typeof value === 'number' ? String(value) : 'غير متاح';

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <View className="p-3 rounded-xl border border-border bg-background gap-1">
      <AppText variant="caption" muted className="text-xs text-right">{label}</AppText>
      <AppText className="font-tajawal-medium text-sm text-right" selectable>
        {asText(value)}
      </AppText>
    </View>
  );
}

/** Admin-only allowlisted details: do not echo the unrestricted RPC JSON verbatim. */
export function AdminComplaintDetail({ id }: { id: string }) {
  const query = useAdminComplaint(id);
  const item = record(query.data?.complaint);
  const updates = Array.isArray(query.data?.updates) ? query.data.updates : [];
  return (
    <View className="gap-6">
      <W06Header section="الشكاوى والبلاغات" title="تفاصيل الشكوى"
        description="هذه البيانات مخصّصة للمسؤول المخوّل. الروابط الخاصة والأدلة لا تُعرض دون تحقق مستقل." />
      {query.isPending && <W06Message title="جارٍ تحميل ملف الشكوى…" kind="info" />}
      {query.isError && <W06Message title="تعذر تحميل ملف الشكوى" kind="error"
        retry={() => void query.refetch()} />}
      {query.isSuccess && !query.data && <W06Message title="الشكوى غير موجودة أو غير متاحة" />}
      {query.isSuccess && query.data && (
        <>
          <Card className="p-4 sm:p-6 border border-border gap-4">
            <AppText className="text-lg font-tajawal-bold text-right">بيانات البلاغ</AppText>
            <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="المعرّف" value={item.id} />
              <Field label="الحالة" value={item.status} />
              <Field label="نوع الشكوى" value={item.complaint_type} />
              <Field label="معرّف العرض" value={item.offer_id} />
              <Field label="معرّف نسخة العرض" value={item.offer_version_id} />
              <Field label="تاريخ الإنشاء" value={item.created_at} />
            </View>
            <Field label="الوصف الأصلي" value={item.description} />
            <Field label="النتيجة المعلنة للعميل" value={item.public_outcome} />
          </Card>
          <Card className="p-4 sm:p-6 border border-border gap-3">
            <AppText className="text-lg font-tajawal-bold text-right">سجل التحديثات</AppText>
            {updates.length === 0 && <W06Message title="لا توجد تحديثات مسجلة" />}
            {updates.map((raw, i) => {
              const update = record(raw);
              return (
                <View key={String(update.id ?? i)}
                  className="p-3 rounded-xl border border-border bg-background gap-2">
                  <AppText className="font-tajawal-bold text-sm text-right">
                    {asText(update.kind)}
                  </AppText>
                  <AppText variant="caption" muted className="text-xs text-right">
                    {asText(update.created_at)}
                  </AppText>
                  <AppText className="text-sm text-right" selectable>
                    {asText(update.message)}
                  </AppText>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </View>
  );
}
