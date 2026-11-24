import React, { useState } from 'react';
import { Image, Linking, Pressable, TextInput, View } from 'react-native';
import { UserRoundCog, FileClock } from 'lucide-react-native';
import {
  useAdminProfileRevisions, useAdminDecideProfileRevision, useAdminProfileRevisionContext, useAdminProfileMedia,
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
  latitude: 'خط العرض', longitude: 'خط الطول', logo_url: 'شعار النشاط', cover_url: 'غلاف النشاط',
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
  const baselineQuery = useAdminProfileRevisionContext(selected?.id ?? null);
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
  const baselineValid = baselineQuery.isSuccess && baselineQuery.data?.revision_id === selected?.id &&
    baselineQuery.data?.business_id === selected?.business_id && baselineQuery.data?.branch_id === selected?.branch_id;
  const mediaEntries = patchEntries.filter(([key]) => key === 'logo_url' || key === 'cover_url');
  const mediaAllowed = Boolean(baselineValid && baselineQuery.data?.media_review_allowed && canSubmitW06Decision(role));
  const mediaFields = mediaEntries.flatMap(([key,value]) => [
    { slot: `${key}:current`, key: baselineQuery.data?.current[key] ?? null },
    { slot: `${key}:candidate`, key: value },
  ]);
  const mediaScope = JSON.stringify([selected?.id, selected?.business_id, mediaFields]);
  const mediaQuery = useAdminProfileMedia(selected?.id ?? null, selected?.business_id ?? null, mediaFields, mediaAllowed, mediaScope);
  const mediaReady = mediaEntries.length === 0 || (mediaAllowed && mediaQuery.isSuccess && !mediaQuery.isFetching && mediaQuery.data.scope === mediaScope);
  const [reviewedMediaScope, setReviewedMediaScope] = useState<string | null>(null);
  const mediaAttestation = JSON.stringify([mediaScope, mediaQuery.dataUpdatedAt]);
  const mediaReviewed = mediaEntries.length === 0 || reviewedMediaScope === mediaAttestation;
  const canApprove = canDecide && baselineValid && patchEntries.length > 0 && unrecognizedFields.length === 0 && mediaReady && mediaReviewed;
  const validReason = decision === 'rejected' ? note.length >= 5 && note.length <= 2000 : note.length <= 2000;

  const pick = (id: string) => {
    setSelectedId(id);
    setDecision(null);
    setReason('');
    setConfirming(false);
    setReviewedMediaScope(null);
    mutation.reset();
  };

  async function submit() {
    // Approval requires the trusted, server-verified published baseline for this revision.
    if (!canDecide || !selected || !decision || !validReason || !confirming ||
        (decision === 'approved' && !canApprove)) return;
    if (decision === 'approved' && mediaEntries.length && Date.now() - mediaQuery.dataUpdatedAt >= 45_000) {
      setReviewedMediaScope(null); setConfirming(false); void mediaQuery.refetch(); return;
    }
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
              {patchEntries.map(([key, value]) => (key === 'logo_url' || key === 'cover_url') ? (
                <View key={key} className="rounded-xl bg-background border border-border p-3 gap-2">
                  <AppText className="font-tajawal-bold text-sm text-right">{LABELS[key]}</AppText>
                  {!mediaAllowed ? <W06Message title="الوسائط محجوبة عن هذه الجلسة" /> : (['current','candidate'] as const).map(side => {
                    const item = mediaQuery.data?.scope === mediaScope ? mediaQuery.data.items.find(x => x.slot === `${key}:${side}`) : undefined;
                    return <View key={side} className="gap-1">
                      <AppText variant="caption" muted className="text-xs text-right">{side === 'current' ? 'المنشور حالياً' : 'المرشح'}</AppText>
                      {item?.url ? <><Image source={{uri:item.url}} resizeMode="contain" accessibilityLabel={LABELS[key]} style={{width:'100%',height:120}} />
                        <AppButton title="فتح الصورة" size="sm" variant="outline" onPress={() => {
                          if (Date.now() - mediaQuery.dataUpdatedAt >= 45_000) {setReviewedMediaScope(null);void mediaQuery.refetch();return;}
                          void Linking.openURL(item.url!);
                        }} /></> : <AppText variant="caption" muted>{item ? 'لا توجد صورة / إزالة القيمة' : 'لم تثبت الصورة بعد'}</AppText>}
                    </View>;
                  })}
                </View>
              ) : (
                <View key={key} className="rounded-xl bg-background border border-border p-3 gap-1">
                  <AppText variant="caption" muted className="text-xs text-right">{LABELS[key]}</AppText>
                  <AppText variant="caption" muted className="text-xs text-right">
                    المنشور حالياً: {baselineValid ? String(baselineQuery.data?.current[key] ?? 'فارغ') : 'لم يثبت بعد'}
                  </AppText>
                  <AppText className="font-tajawal-bold text-sm text-right" selectable>
                    المرشح: {value === null ? 'إزالة القيمة' : String(value)}
                  </AppText>
                </View>
              ))}
              {mediaEntries.length > 0 && mediaAllowed && (
                <View className="gap-2">
                  {mediaQuery.isError && <W06Message kind="error" title="تعذر التحقق من صور التعديل" retry={() => void mediaQuery.refetch()} />}
                  <AppButton title="تجديد معاينة الصور" variant="outline" size="sm" disabled={mediaQuery.isFetching} onPress={() => {setReviewedMediaScope(null);setConfirming(false);void mediaQuery.refetch();}} />
                  <Pressable accessibilityRole="checkbox" accessibilityState={{checked:mediaReviewed,disabled:!mediaReady}} disabled={!mediaReady}
                    onPress={() => {setReviewedMediaScope(mediaReviewed ? null : mediaAttestation);setConfirming(false);}} className="p-3 border border-border rounded-xl">
                    <AppText className="text-sm text-right">{mediaReviewed ? 'تم تأكيد مقارنة الصور' : 'أؤكد أنني قارنت الصور المنشورة والمرشحة'}</AppText>
                  </Pressable>
                </View>
              )}
              {unrecognizedFields.length > 0 && (
                <W06Message kind="error" title="يتضمن الطلب حقولاً لا تدعم هذه الواجهة مراجعتها"
                  detail="لا تُعتمد التعديلات التي تتطلب فحص بيانات أو وسائط غير معروضة هنا." />
              )}
              <W06AuthorityNotice role={role} action="اعتماد التعديل" />
              {!baselineValid && (
                <W06Message kind="info" title="اعتماد التعديل يتطلب مقارنة موثوقة" detail="الاعتماد معطل حتى ينجح عقد الخادم في إرجاع الملف المنشور الموافق لنفس طلب التعديل، وتُعرض الحقول المرشحة إلى جانبه." />
              )}
              {baselineQuery.isError && <W06Message kind="error" title="تعذر استرجاع نسخة الملف المنشورة" detail="عقد مقارنة ملفات التجار غير مفعل أو أن الصلاحية غير متاحة لهذه الجلسة." />}
              <View className="flex-row flex-wrap gap-2">
                <AppButton title="اعتماد التعديل" size="sm" variant="primary"
                  disabled={!canApprove}
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
                        disabled={!canDecide || !validReason || (decision === 'approved' && !canApprove)}
                        onPress={() => void submit()} />
                      <AppButton title="إلغاء" variant="outline" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
                    </View>
                  ) : (
                    <AppButton title="متابعة إلى التأكيد" variant="secondary"
                      disabled={!canDecide || !validReason || (decision === 'approved' && !canApprove)}
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
