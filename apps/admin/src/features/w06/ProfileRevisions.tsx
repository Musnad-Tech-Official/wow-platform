import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { UserRoundCog, FileClock } from 'lucide-react-native';
import {
  useAdminProfileRevisions, useAdminDecideProfileRevision,
} from '@wow/api';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText, Badge, Card } from '@wow/ui';
import type { AdminRole } from '../auth/admin-access';
import {
  canSubmitW06Decision, W06AuthorityNotice, W06Header,
  W06Message, W06Paging, w06ErrorMessage,
} from './W06Shared';

const PAGE_SIZE = 25;
const LABELS: Record<string, string> = {
  name: 'الاسم', description: 'الوصف', contact_phone: 'هاتف التواصل',
  city: 'المدينة', district: 'الحي', address_line: 'العنوان',
  latitude: 'خط العرض', longitude: 'خط الطول',
};

export function ProfileRevisions({ role }: { role: AdminRole | null }) {
  const colors = useWowColors();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const query = useAdminProfileRevisions({ limit: PAGE_SIZE, offset });
  const mutation = useAdminDecideProfileRevision();
  const rows = Array.isArray(query.data) ? query.data : [];
  const selected = rows.find((item) => item.id === selectedId) ?? null;
  const searchTerm = search.trim().toLowerCase();
  const shown = rows.filter((item) =>
    !searchTerm || item.business_id.toLowerCase().includes(searchTerm)
    || item.id.toLowerCase().includes(searchTerm));
  const patchEntries = selected?.patch && typeof selected.patch === 'object'
    ? Object.entries(selected.patch).filter(([key]) => Object.prototype.hasOwnProperty.call(LABELS, key))
    : [];
  const unrecognizedFields = selected?.patch && typeof selected.patch === 'object'
    ? Object.keys(selected.patch).filter((key) => !Object.prototype.hasOwnProperty.call(LABELS, key))
    : [];
  const note = reason.trim();
  const canDecide = canSubmitW06Decision(role) && selected?.status === 'submitted' && !mutation.isPending;
  const validReason = decision === 'rejected' ? note.length >= 5 && note.length <= 2000 : note.length <= 2000;

  const pick = (id: string) => {
    setSelectedId(id);
    setDecision(null);
    setReason('');
    setConfirming(false);
    mutation.reset();
  };

  async function submit() {
    // The queue only exposes candidate patches, not the current published baseline.
    if (!canDecide || !selected || !decision || decision === 'approved' || !validReason || !confirming) return;
    try {
      await mutation.mutateAsync({ revisionId: selected.id, decision, reason: note || null });
      setSelectedId(null);
      setDecision(null);
      setReason('');
      setConfirming(false);
    } catch {
      setConfirming(false);
    }
  }

  return (
    <View className="gap-6">
      <W06Header
        section="تعديلات ملفات التجار"
        title="مراجعة تغييرات الملف المعتمد"
        description="فصل الملف المنشور عن التعديل المرسل للمراجعة؛ لا تُعتمد التغييرات قبل موافقة مخوّلة."
      />
      <View className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 p-4 sm:p-6 border border-border gap-4">
          <View className="flex-row flex-wrap justify-between items-center gap-2">
            <AppButton title="تحديث" variant="outline" size="sm" disabled={query.isFetching} onPress={() => void query.refetch()} />
            <View className="flex-row items-center gap-2">
              <AppText className="font-tajawal-bold text-lg text-right">طلبات التعديل المعلقة</AppText>
              <FileClock size={20} color="#A16207" />
            </View>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            className="rounded-xl bg-background border border-border px-4 py-3 text-sm font-tajawal text-right"
            style={{ color: colors.foreground }}
            placeholder="بحث بالمعرّف في الصفحة الحالية"
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel="البحث في طلبات تعديل الملف"
          />
          {query.isPending && <W06Message title="جارٍ تحميل طلبات التعديل…" kind="info" />}
          {query.isError && <W06Message title="تعذر تحميل طلبات التعديل" kind="error" retry={() => void query.refetch()} />}
          {query.isSuccess && shown.length === 0 && <W06Message title="لا توجد طلبات مطابقة في هذه الصفحة" />}
          {query.isSuccess && shown.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => pick(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`مراجعة تغيير الملف ${item.id}`}
              accessibilityState={{ selected: selectedId === item.id }}
              className={`rounded-xl p-4 border gap-2 ${selectedId === item.id
                ? 'border-[#FACC15] bg-[#FEFCE8] dark:bg-[#422E12]/40'
                : 'border-border bg-background'}`}
            >
              <View className="flex-row flex-wrap justify-between gap-2 items-center">
                <Badge label={item.status === 'submitted' ? 'قيد المراجعة' : item.status} variant="secondary" />
                <View className="flex-row gap-2 items-center flex-shrink">
                  <AppText className="font-tajawal-bold text-sm text-right">
                    {item.branch_id ? 'تعديل ملف فرع' : 'تعديل ملف نشاط'}
                  </AppText>
                  <UserRoundCog size={16} color="#CA8A04" />
                </View>
              </View>
              <AppText variant="caption" muted className="text-xs text-right">النشاط: {item.business_id}</AppText>
              <AppText variant="caption" muted className="text-xs text-right">{item.created_at ? new Date(item.created_at).toLocaleDateString('ar') : 'تاريخ غير متاح'}</AppText>
            </Pressable>
          ))}
          {query.isSuccess && (
            <W06Paging
              offset={offset} count={rows.length} pageSize={PAGE_SIZE} loading={query.isFetching}
              previous={() => { setOffset((x) => Math.max(0, x - PAGE_SIZE)); setSelectedId(null); }}
              next={() => { setOffset((x) => x + PAGE_SIZE); setSelectedId(null); }}
            />
          )}
        </Card>

        <Card className="lg:col-span-5 p-4 sm:p-6 border border-border gap-4">
          <AppText className="font-tajawal-bold text-lg text-right">تفاصيل التعديل وقرار المراجعة</AppText>
          {!selected && <W06Message title="اختر طلب تعديل من القائمة" detail="لن تُعرض بيانات افتراضية عند عدم تحديد طلب." />}
          {selected && (
            <>
              <AppText variant="caption" muted selectable className="text-xs text-right">معرّف الطلب: {selected.id}</AppText>
              <AppText variant="caption" muted className="text-xs text-right">
                التغييرات المطلوبة فقط؛ يجب مقارنة البيانات بالملف الحالي قبل الاعتماد.
              </AppText>
              {patchEntries.map(([key, value]) => (
                <View key={key} className="rounded-xl bg-background border border-border p-3 gap-1">
                  <AppText variant="caption" muted className="text-xs text-right">{LABELS[key]}</AppText>
                  <AppText className="font-tajawal-bold text-sm text-right" selectable>{value === null ? 'إزالة القيمة' : String(value)}</AppText>
                </View>
              ))}
              {unrecognizedFields.length > 0 && (
                <W06Message kind="error" title="يتضمن الطلب حقولاً لا تدعم هذه الواجهة مراجعتها"
                  detail="لا تُعتمد التعديلات التي تتطلب فحص بيانات أو وسائط غير معروضة هنا." />
              )}
              <W06AuthorityNotice role={role} action="اعتماد التعديل" />
              <W06Message kind="info" title="اعتماد تعديلات الملف معطّل" detail="تستلزم الموافقة عقد قراءة موثوقاً لمقارنة الملف المنشور بالتعديل المرشح؛ لا يكفي عرض حقول التغيير منفردةً." />
              <View className="flex-row flex-wrap gap-2">
                <AppButton title="اعتماد التعديل" size="sm" variant="primary"
                  disabled={true}
                  onPress={() => { setDecision('approved'); setConfirming(false); }} />
                <AppButton title="رفض التعديل" size="sm" variant="danger"
                  disabled={!canDecide}
                  onPress={() => { setDecision('rejected'); setConfirming(false); }} />
              </View>
              {decision && (
                <View className="gap-3">
                  <AppText className="text-sm font-tajawal-bold text-right">
                    {decision === 'approved' ? 'قرار اعتماد التعديل' : 'قرار رفض التعديل'}
                  </AppText>
                  <TextInput
                    value={reason}
                    onChangeText={(value) => { setReason(value); setConfirming(false); }}
                    multiline numberOfLines={4}
                    editable={canDecide}
                    className="rounded-xl bg-background border border-border p-3 text-sm font-tajawal text-right min-h-[100px]"
                    style={{ color: colors.foreground, textAlignVertical: 'top' }}
                    placeholder={decision === 'rejected' ? 'مبرر الرفض (5–2000 حرف)' : 'مبرر الاعتماد (اختياري)'}
                    placeholderTextColor={colors.mutedForeground}
                    accessibilityLabel="مبرر قرار مراجعة تعديل الملف"
                  />
                  {mutation.isError && <W06Message kind="error" title="رفض الخادم إتمام القرار" detail={w06ErrorMessage(mutation.error)} />}
                  {confirming ? (
                    <View className="gap-2">
                      <AppText className="font-tajawal-bold text-sm text-right">تأكيد قرار {decision === 'approved' ? 'الاعتماد' : 'الرفض'} النهائي؟</AppText>
                      <AppButton title="تأكيد وإرسال القرار" loading={mutation.isPending}
                        disabled={!canDecide || !validReason || decision === 'approved' || unrecognizedFields.length > 0}
                        onPress={() => void submit()} />
                      <AppButton title="إلغاء" variant="outline" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
                    </View>
                  ) : (
                    <AppButton title="متابعة إلى التأكيد" variant="secondary"
                      disabled={!canDecide || !validReason || (decision === 'approved' && unrecognizedFields.length > 0)}
                      onPress={() => setConfirming(true)} />
                  )}
                </View>
              )}
            </>
          )}
        </Card>
      </View>
    </View>
  );
}
