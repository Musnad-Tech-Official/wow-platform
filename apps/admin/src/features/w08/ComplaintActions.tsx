import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import {
  useAdminRequestMerchantResponse, useAdminUpdateComplaint,
  type ComplaintStatus,
} from '@wow/api';
import { AppButton, AppText, Card } from '@wow/ui';
import { useWowColors } from '@wow/theme';
import type { AdminRole } from '../auth/admin-access';
import { canSubmitW06Decision, W06AuthorityNotice, W06Message, w06ErrorMessage } from '../w06/W06Shared';

type NextStatus = Exclude<ComplaintStatus, 'new'>;
const statuses: { value: NextStatus; label: string }[] = [
  { value: 'investigating', label: 'قيد التحقيق' },
  { value: 'waiting', label: 'بانتظار الرد' },
  { value: 'closed', label: 'إغلاق الشكوى' },
];

export function ComplaintActions({ complaintId, status, role }: {
  complaintId: string;
  status: ComplaintStatus;
  role: AdminRole | null;
}) {
  const colors = useWowColors();
  const update = useAdminUpdateComplaint();
  const request = useAdminRequestMerchantResponse();
  const [selected, setSelected] = useState<NextStatus | null>(null);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [confirmRequest, setConfirmRequest] = useState(false);
  const busy = update.isPending || request.isPending;
  const canDecide = canSubmitW06Decision(role);
  const normalizedNote = note.trim();
  const normalizedOutcome = outcome.trim();
  const normalizedRequest = requestMessage.trim();
  const readyUpdate = canDecide && status !== 'closed' &&
    selected !== null && selected !== status &&
    normalizedNote.length >= 5 && normalizedNote.length <= 3000 &&
    (selected !== 'closed' || (normalizedOutcome.length >= 5 && normalizedOutcome.length <= 2000)) &&
    confirmUpdate && !busy;
  const readyRequest = canDecide && status !== 'closed' &&
    normalizedRequest.length >= 5 && normalizedRequest.length <= 3000 &&
    confirmRequest && !busy;

  async function submitUpdate() {
    if (!readyUpdate || !selected) return;
    try {
      await update.mutateAsync({
        complaintId, status: selected, note: normalizedNote,
        publicOutcome: selected === 'closed' ? normalizedOutcome : null,
      });
      setSelected(null);
      setNote('');
      setOutcome('');
      setConfirmUpdate(false);
    } catch {
      setConfirmUpdate(false);
    }
  }

  async function submitRequest() {
    if (!readyRequest) return;
    try {
      await request.mutateAsync({ complaintId, message: normalizedRequest });
      setRequestMessage('');
      setConfirmRequest(false);
    } catch {
      setConfirmRequest(false);
    }
  }

  if (!canDecide) {
    return <W06AuthorityNotice role={role} action="اتخاذ قرار بشأن الشكوى" />;
  }
  if (status === 'closed') {
    return <W06Message title="الشكوى مغلقة" detail="لا يمكن اتخاذ قرار جديد بشأن شكوى مغلقة." />;
  }
  return (
    <View className="gap-4">
      <Card className="border border-border p-4 sm:p-6 gap-3">
        <AppText className="font-tajawal-bold text-lg text-right">تحديث حالة الشكوى</AppText>
        <View className="flex-row flex-wrap gap-2">
          {statuses.filter((item) => item.value !== status).map((item) => (
            <Pressable key={item.value} accessibilityRole="button"
              accessibilityState={{ selected: selected === item.value, disabled: busy }}
              disabled={busy}
              onPress={() => { setSelected(item.value); setConfirmUpdate(false); update.reset(); }}
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: selected === item.value ? colors.focusRing : colors.border,
                backgroundColor: selected === item.value ? colors.warningSurface : colors.surface }}>
              <AppText className="font-tajawal-medium text-xs">{item.label}</AppText>
            </Pressable>
          ))}
        </View>
        <TextInput value={note} editable={!busy} multiline
          onChangeText={(text) => { setNote(text); setConfirmUpdate(false); update.reset(); }}
          accessibilityLabel="الملاحظة الداخلية لقرار الشكوى"
          placeholder="الملاحظة الداخلية المطلوبة (5 أحرف على الأقل)"
          placeholderTextColor={colors.mutedForeground}
          className="rounded-xl border border-border bg-background p-3 text-right font-tajawal"
          style={{ color: colors.foreground, minHeight: 82, textAlignVertical: 'top' }} />
        {selected === 'closed' && (
          <TextInput value={outcome} editable={!busy} multiline
            onChangeText={(text) => { setOutcome(text); setConfirmUpdate(false); update.reset(); }}
            accessibilityLabel="النتيجة المعلنة للعميل"
            placeholder="ملخص نتيجة الإغلاق المسموح بعرضه للعميل (5 أحرف على الأقل)"
            placeholderTextColor={colors.mutedForeground}
            className="rounded-xl border border-border bg-background p-3 text-right font-tajawal"
            style={{ color: colors.foreground, minHeight: 82, textAlignVertical: 'top' }} />
        )}
        <Pressable accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmUpdate, disabled: busy || !selected }}
          disabled={busy || !selected} onPress={() => setConfirmUpdate((value) => !value)}
          className="rounded-xl border border-border p-3"
          style={{ backgroundColor: confirmUpdate ? colors.warningSurface : colors.surface }}>
          <AppText className="font-tajawal-medium text-sm text-right">
            {confirmUpdate ? '☑' : '□'} أؤكد تغيير حالة هذه الشكوى وتسجيل القرار
          </AppText>
        </Pressable>
        {update.isError && <W06Message kind="error" title="تعذر حفظ قرار الشكوى"
          detail={w06ErrorMessage(update.error)} />}
        <AppButton title={update.isPending ? 'جارٍ اعتماد القرار…' : 'اعتماد تغيير الحالة'}
          disabled={!readyUpdate} onPress={() => void submitUpdate()} />
      </Card>
      <Card className="border border-border p-4 sm:p-6 gap-3">
        <AppText className="font-tajawal-bold text-lg text-right">طلب رد من التاجر</AppText>
        <AppText variant="caption" muted className="text-xs text-right">
          يُرسل الطلب للتاجر عبر الخادم دون مشاركة بيانات العميل أو الأدلة الخاصة.
        </AppText>
        <TextInput value={requestMessage} editable={!busy} multiline
          onChangeText={(text) => { setRequestMessage(text); setConfirmRequest(false); request.reset(); }}
          accessibilityLabel="رسالة طلب رد التاجر"
          placeholder="رسالة موجّهة للتاجر (5 أحرف على الأقل)"
          placeholderTextColor={colors.mutedForeground}
          className="rounded-xl border border-border bg-background p-3 text-right font-tajawal"
          style={{ color: colors.foreground, minHeight: 82, textAlignVertical: 'top' }} />
        <Pressable accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmRequest, disabled: busy }}
          disabled={busy} onPress={() => setConfirmRequest((value) => !value)}
          className="rounded-xl border border-border p-3"
          style={{ backgroundColor: confirmRequest ? colors.warningSurface : colors.surface }}>
          <AppText className="font-tajawal-medium text-sm text-right">
            {confirmRequest ? '☑' : '□'} أؤكد إرسال طلب الرد إلى التاجر
          </AppText>
        </Pressable>
        {request.isError && <W06Message kind="error" title="تعذر طلب رد التاجر"
          detail={w06ErrorMessage(request.error)} />}
        <AppButton title={request.isPending ? 'جارٍ إرسال الطلب…' : 'إرسال طلب الرد'}
          disabled={!readyRequest} onPress={() => void submitRequest()} />
      </Card>
    </View>
  );
}
