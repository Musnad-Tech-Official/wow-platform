import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { CreditCard, ShieldCheck } from 'lucide-react-native';
import { useAdminSubscriptionPayments, useAdminDecideSubscriptionPayment } from '@wow/api';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText, Badge, Card } from '@wow/ui';
import type { AdminRole } from '../auth/admin-access';
import {
  canSubmitW06Decision, W06AuthorityNotice, W06Header,
  W06Message, W06Paging, w06ErrorMessage,
} from './W06Shared';

type Status = 'submitted' | 'verified' | 'rejected' | null;
const PAGE_SIZE = 25;
const STATUSES: { status: Status; label: string }[] = [
  { status: 'submitted', label: 'بانتظار التأكيد' },
  { status: 'verified', label: 'تم التحقق' },
  { status: 'rejected', label: 'مرفوضة' },
  { status: null, label: 'الكل' },
];
const PAYMENT_METHODS: Record<string, string> = {
  cash: 'نقدي', bank_transfer: 'حوالة بنكية', wallet: 'محفظة إلكترونية', other: 'أخرى',
};

export function SubscriptionPayments({ role }: { role: AdminRole | null }) {
  const colors = useWowColors();
  const [status, setStatus] = useState<Status>('submitted');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<boolean | null>(null);
  const [independentlyVerified, setIndependentlyVerified] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const query = useAdminSubscriptionPayments({ status, limit: PAGE_SIZE, offset });
  const mutation = useAdminDecideSubscriptionPayment();
  const rows = Array.isArray(query.data) ? query.data : [];
  const selected = rows.find((item) => item.payment_id === selectedId) ?? null;
  const canDecide = canSubmitW06Decision(role) && selected?.status === 'submitted' && !mutation.isPending;
  const trimmedNote = note.trim();
  const validNote = trimmedNote.length >= 10 && trimmedNote.length <= 1500;
  const validDecision = canDecide && decision !== null && validNote &&
    (decision === false || independentlyVerified);

  const select = (id: string) => {
    setSelectedId(id);
    setDecision(null);
    setNote('');
    setIndependentlyVerified(false);
    setConfirming(false);
    mutation.reset();
  };

  async function submit() {
    if (!validDecision || !confirming || !selected || decision === null) return;
    try {
      await mutation.mutateAsync({ paymentId: selected.payment_id, approve: decision, note: trimmedNote });
      setSelectedId(null);
      setDecision(null);
      setNote('');
      setIndependentlyVerified(false);
      setConfirming(false);
    } catch {
      setConfirming(false);
    }
  }

  const info: { label: string; value: string }[] = selected ? [
    { label: 'معرّف النشاط', value: selected.business_id },
    { label: 'معرّف الاشتراك', value: selected.subscription_id },
    { label: 'المبلغ', value: String(selected.amount) + ' ' + selected.currency },
    { label: 'وسيلة السداد', value: PAYMENT_METHODS[selected.method] ?? selected.method },
    { label: 'مرجع الدفع المقدم من التاجر', value: selected.reference },
    { label: 'حالة الطلب', value: selected.status },
  ] : [];

  return (
    <View className="gap-6">
      <W06Header
        section="الاشتراكات والمدفوعات"
        title="الاشتراكات وتأكيد الدفعات"
        description="قرار الدفع يخضع للتحقق المستقل، ولا يُعتبر مرجع التاجر دليلاً على السداد."
      />
      <View className="rounded-xl bg-[#FEFCE8] dark:bg-[#422E12] p-4 border border-[#FACC15] flex-row items-start gap-3">
        <ShieldCheck size={20} color="#CA8A04" />
        <AppText className="flex-1 text-xs text-[#854D0E] dark:text-[#FEF08A] text-right">
          حق النشر أو تفعيل الاشتراك لا ينتج عن تقديم طلب الدفع وحده. الخادم وحده يقرر بعد التحقق المستقل، مع منع تضارب المصالح.
        </AppText>
      </View>
      <View className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 p-4 sm:p-6 border border-border gap-4">
          <View className="flex-row justify-between flex-wrap gap-3 items-center">
            <AppButton title="تحديث" size="sm" variant="outline" disabled={query.isFetching} onPress={() => void query.refetch()} />
            <View className="flex-row gap-2 items-center">
              <AppText className="font-tajawal-bold text-lg text-right">سجل المدفوعات</AppText>
              <CreditCard size={20} color="#A16207" />
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {STATUSES.map((item) => (
              <Pressable
                key={String(item.status)}
                accessibilityRole="button"
                accessibilityState={{ selected: status === item.status }}
                onPress={() => { setStatus(item.status); setOffset(0); setSelectedId(null); }}
                className={`rounded-xl border px-3 py-2 ${status === item.status
                  ? 'bg-[#FEF3C7] dark:bg-[#422E12] border-[#FACC15]' : 'bg-background border-border'}`}
              >
                <AppText className="font-tajawal-bold text-xs text-right">{item.label}</AppText>
              </Pressable>
            ))}
          </View>
          {query.isPending && <W06Message title="جارٍ تحميل سجل المدفوعات…" kind="info" />}
          {query.isError && <W06Message title="تعذر تحميل سجل المدفوعات" detail="يتطلب هذا المسار صلاحية مراجع مالي مخوّل. لا تُعرض بيانات بديلة عند رفض الخادم." kind="error" retry={() => void query.refetch()} />}
          {query.isSuccess && rows.length === 0 && <W06Message title="لا توجد دفعات ضمن هذا الفلتر" />}
          {query.isSuccess && rows.map((payment) => (
            <Pressable
              key={payment.payment_id}
              onPress={() => select(payment.payment_id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedId === payment.payment_id }}
              accessibilityLabel={`مراجعة دفعة اشتراك ${payment.payment_id}`}
              className={`rounded-xl border p-4 gap-2 ${selectedId === payment.payment_id
                ? 'border-[#FACC15] bg-[#FEFCE8] dark:bg-[#422E12]/40'
                : 'border-border bg-background'}`}
            >
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Badge label={STATUSES.find((item) => item.status === payment.status)?.label ?? payment.status} variant="secondary" />
                <AppText className="font-tajawal-bold text-sm text-right">{String(payment.amount)} {payment.currency}</AppText>
              </View>
              <AppText variant="caption" muted className="text-xs text-right">النشاط: {payment.business_id}</AppText>
              <AppText variant="caption" muted className="text-xs text-right">{payment.created_at ? new Date(payment.created_at).toLocaleDateString('ar') : 'تاريخ غير متاح'}</AppText>
              <AppText variant="caption" muted className="text-xs text-right" numberOfLines={1}>المرجع: {payment.reference}</AppText>
            </Pressable>
          ))}
          {query.isSuccess && (
            <W06Paging offset={offset} count={rows.length} pageSize={PAGE_SIZE} loading={query.isFetching}
              previous={() => { setOffset((x) => Math.max(0, x - PAGE_SIZE)); setSelectedId(null); }}
              next={() => { setOffset((x) => x + PAGE_SIZE); setSelectedId(null); }}
            />
          )}
        </Card>

        <Card className="lg:col-span-5 p-4 sm:p-6 border border-border gap-4">
          <AppText className="text-lg font-tajawal-bold text-right">الدفعة المختارة وقرار المراجعة</AppText>
          {!selected && <W06Message title="اختر دفعة من السجل" detail="تظهر تفاصيل الدفعة وفق صلاحيات الخادم الفعلية." />}
          {selected && (
            <>
              {info.map((item) => (
                <View key={item.label} className="rounded-xl p-3 bg-background border border-border gap-1">
                  <AppText variant="caption" muted className="text-xs text-right">{item.label}</AppText>
                  <AppText className="font-tajawal-bold text-sm text-right" selectable>{item.value}</AppText>
                </View>
              ))}
              <W06AuthorityNotice role={role} action="تأكيد الدفع" />
              {selected.status !== 'submitted' && <W06Message title="القرار غير متاح لهذه الحالة" detail="الخادم يقبل فقط دفعات الاشتراكات المعلّقة." kind="info" />}
              <View className="flex-row flex-wrap gap-2">
                <AppButton title="تحقّق واعتماد الدفع" size="sm" disabled={!canDecide}
                  onPress={() => { setDecision(true); setConfirming(false); }} />
                <AppButton title="رفض الدفع" size="sm" variant="danger" disabled={!canDecide}
                  onPress={() => { setDecision(false); setConfirming(false); }} />
              </View>
              {decision !== null && (
                <>
                  <AppText className="font-tajawal-bold text-sm text-right">
                    {decision ? 'اعتماد بعد التحقق المستقل' : 'توثيق سبب الرفض'}
                  </AppText>
                  {decision && (
                    <Pressable
                      onPress={() => { setIndependentlyVerified((x) => !x); setConfirming(false); }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: independentlyVerified }}
                      className="rounded-xl border border-[#FACC15] bg-[#FEFCE8] dark:bg-[#422E12] p-4 flex-row gap-3"
                    >
                      <View className="h-5 w-5 border border-[#A16207] rounded items-center justify-center">
                        {independentlyVerified && <ShieldCheck size={16} color="#A16207" />}
                      </View>
                      <AppText className="flex-1 text-sm font-tajawal-bold text-[#854D0E] dark:text-[#FEF08A] text-right">
                        أقر بأنني تحققت من وصول المبلغ بشكل مستقل، وليس من رقم المرجع فقط.
                      </AppText>
                    </Pressable>
                  )}
                  <TextInput
                    value={note}
                    onChangeText={(value) => { setNote(value); setConfirming(false); }}
                    editable={canDecide}
                    multiline numberOfLines={4}
                    className="rounded-xl border border-border bg-background p-3.5 min-h-[100px] text-sm font-tajawal text-right"
                    style={{ color: colors.foreground, textAlignVertical: 'top' }}
                    placeholder="وثّق وسيلة التحقق ونتيجتها (10–1500 حرف)"
                    placeholderTextColor={colors.mutedForeground}
                    accessibilityLabel="ملاحظات مراجعة الدفع"
                  />
                  {mutation.isError && <W06Message kind="error" title="لم يكتمل تسجيل قرار الدفع" detail={w06ErrorMessage(mutation.error)} />}
                  {confirming ? (
                    <View className="gap-2 border border-[#FACC15] rounded-xl p-3">
                      <AppText className="text-sm font-tajawal-bold text-right">
                        تأكيد نهائي: {decision ? 'اعتماد الدفع وتفعيل الاستحقاق وفق قواعد الخادم' : 'رفض الدفع'}؟
                      </AppText>
                      <AppButton title="تأكيد وإرسال القرار" loading={mutation.isPending} disabled={!validDecision} onPress={() => void submit()} />
                      <AppButton title="إلغاء التأكيد" variant="outline" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
                    </View>
                  ) : <AppButton title="متابعة إلى تأكيد القرار" variant="secondary" disabled={!validDecision} onPress={() => setConfirming(true)} />}
                </>
              )}
            </>
          )}
        </Card>
      </View>
    </View>
  );
}
