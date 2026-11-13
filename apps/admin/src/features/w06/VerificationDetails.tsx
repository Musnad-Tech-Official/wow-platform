import React, { useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, ShieldCheck } from 'lucide-react-native';
import { useAdminBusinessVerification, useAdminDecideBusinessVerification, useAdminVerificationEvidence } from '@wow/api';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText, Badge, Card } from '@wow/ui';
import { canSubmitW06Decision, W06AuthorityNotice, W06Header, W06Message, w06ErrorMessage } from './W06Shared';
import type { AdminRole } from '../auth/admin-access';

type Decision = 'approved' | 'needs_info' | 'rejected';
type JsonObject = Record<string, unknown>;

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : value === null || value === undefined ? 'غير متاح' : String(value);
const asArray = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.filter((item): item is JsonObject =>
    Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];

export function VerificationDetails({ id, role }: { id: string; role: AdminRole | null }) {
  const router = useRouter();
  const colors = useWowColors();
  const query = useAdminBusinessVerification(id);
  const mutation = useAdminDecideBusinessVerification();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);

  const detail = query.data && !Array.isArray(query.data) && typeof query.data === 'object'
    ? (query.data as JsonObject)
    : null;
  const submitted = detail?.status === 'submitted';
  const canDecide = canSubmitW06Decision(role) && submitted && !mutation.isPending;
  const needsReason = decision === 'needs_info' || decision === 'rejected';
  const reasonTrim = reason.trim();
  const validReason = needsReason
    ? reasonTrim.length >= 5 && reasonTrim.length <= 2000
    : reasonTrim.length <= 2000;
  const submissions = asArray(detail?.submission_history);
  const history = asArray(detail?.decision_history);
  const evidenceKeys: string[] = Array.isArray(detail?.evidence_refs)
    ? detail.evidence_refs.filter((item): item is string => typeof item === 'string') : [];
  const evidenceRefs = evidenceKeys.length;
  const evidenceQuery = useAdminVerificationEvidence(
    id, typeof detail?.business_id === 'string' ? detail.business_id : null,
    evidenceKeys, canSubmitW06Decision(role),
  );
  // A signed URL is a temporary credential; force a refresh after 45 seconds.
  const evidenceReady = evidenceRefs > 0 && evidenceQuery.isSuccess &&
    evidenceQuery.data.length === evidenceRefs && Date.now() - evidenceQuery.dataUpdatedAt < 45_000;
  const approvalEvidenceVerified = evidenceReady && evidenceReviewed;

  async function submit() {
    // Approval requires fresh, RLS-signed evidence and reviewer attestation.
    if (!canDecide || !decision || !confirming || !validReason ||
        (decision === 'approved' && !approvalEvidenceVerified)) return;
    try {
      await mutation.mutateAsync({
        verificationId: id,
        decision,
        reason: reasonTrim || null,
      });
      // A database confirmation was returned; other lists are invalidated by the API hook.
      router.replace('/verifications' as any);
    } catch {
      setConfirming(false);
    }
  }

  const fields = [
    ['النشاط', detail?.business_name],
    ['نوع الطلب', detail?.request_type === 'initial' ? 'تأهيل النشاط' : 'إضافة فرع'],
    ['معرّف النشاط', detail?.business_id],
    ['معرّف الفرع', detail?.branch_id],
    ['الحالة', detail?.status],
    ['تاريخ التقديم', detail?.submitted_at],
  ];

  return (
    <View className="gap-6">
      <View className="flex-row justify-start">
        <AppButton title="العودة إلى الطلبات" variant="outline" size="sm" onPress={() => router.replace('/verifications' as any)} />
      </View>
      <W06Header section="تأهيل الأنشطة والفروع" title="مراجعة النشاط والفرع" description="قرار مستقل مبني على سجل الطلب الحالي والأدلة المصرح بعرضها." />
      {query.isPending && <W06Message title="جارٍ تحميل تفاصيل التأهيل…" kind="info" />}
      {query.isError && <W06Message title="تعذر الوصول إلى تفاصيل الطلب" detail="قد لا تتوفر الصلاحية أو تغيرت حالة الطلب." kind="error" retry={() => void query.refetch()} />}
      {query.isSuccess && !detail && <W06Message title="الطلب غير موجود أو لم يعد متاحاً" />}
      {detail && query.isSuccess && (
        <>
          <Card className="p-4 sm:p-6 border border-border gap-5">
            <View className="flex-row flex-wrap justify-between items-center gap-3">
              <Badge label={asString(detail.status)} variant="secondary" />
              <AppText className="text-xl font-tajawal-bold text-right">{asString(detail.business_name)}</AppText>
            </View>
            <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map(([label, value]) => (
                <View key={label as string} className="rounded-xl p-3.5 border border-border bg-background gap-1">
                  <AppText variant="caption" muted className="text-xs text-right">{String(label)}</AppText>
                  <AppText className="font-tajawal-bold text-sm text-right" selectable numberOfLines={2}>{asString(value)}</AppText>
                </View>
              ))}
            </View>
            <View className="rounded-xl border border-border p-4 gap-3">
              <View className="flex-row gap-3 items-center">
                <FileText size={22} color="#A16207" />
                <AppText className="font-tajawal-bold text-sm text-right flex-1">الأدلة الخاصة المرفقة: {evidenceRefs}</AppText>
              </View>
              <AppText variant="caption" muted className="text-xs text-right">
                تُفتح الأدلة بروابط توقيع مؤقتة (60 ثانية) يتحقق الخادم من صلاحية المراجع وتعارض مصالحه قبل إصدارها.
              </AppText>
              {evidenceQuery.isPending && canSubmitW06Decision(role) && <AppText variant="caption" muted className="text-xs text-right">جارٍ التحقق من صلاحية عرض المستندات…</AppText>}
              {evidenceQuery.isError && <W06Message kind="error" title="تعذر فتح الأدلة بشكل آمن" detail="لا يمكن اعتماد الطلب قبل إعادة التحقق من صلاحيات التخزين والمستندات." />}
              {evidenceQuery.isSuccess && evidenceReady && evidenceQuery.data.map((item) => (
                <AppButton
                  key={item.keyIndex}
                  variant="outline" size="sm"
                  title={`فتح المستند ${item.keyIndex + 1} (${item.mimeType === 'application/pdf' ? 'PDF' : 'صورة'})`}
                  onPress={() => void Linking.openURL(item.signedUrl)}
                />
              ))}
              {canSubmitW06Decision(role) && evidenceRefs > 0 && (
                <AppButton variant="quiet" size="sm" title="تجديد صلاحية روابط المستندات"
                  onPress={() => { setEvidenceReviewed(false); void evidenceQuery.refetch(); }} />
              )}
              {evidenceReady && (
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: evidenceReviewed }}
                  onPress={() => setEvidenceReviewed((value) => !value)}
                  className="flex-row items-center gap-3 rounded-xl bg-[#FEFCE8] dark:bg-[#422E12] p-3">
                  <View className="rounded h-5 w-5 border border-[#A16207] items-center justify-center">
                    {evidenceReviewed && <ShieldCheck size={16} color="#A16207" />}
                  </View>
                  <AppText className="flex-1 text-xs font-tajawal-bold text-[#854D0E] dark:text-[#FEF08A] text-right">
                    أؤكد أنني اطلعت على المستندات وفحصت أدلة الطلب فعلياً.
                  </AppText>
                </Pressable>
              )}
            </View>
          </Card>

          <View className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-7 p-4 sm:p-6 border border-border gap-4">
              <AppText className="text-lg font-tajawal-bold text-right">تاريخ الطلب والقرارات</AppText>
              <AppText variant="caption" muted className="text-xs text-right">
                {submissions.length} تقديمات • {history.length} قرارات مسجّلة
              </AppText>
              {history.length === 0 && submissions.length === 0 ? (
                <W06Message title="لا يوجد تاريخ إضافي مسجّل" />
              ) : (
                <View className="gap-2">
                  {submissions.map((item, i) => (
                    <View key={asString(item.id) + i} className="p-3 rounded-xl bg-background border border-border">
                      <AppText className="font-tajawal-bold text-sm text-right">تقديم الطلب</AppText>
                      <AppText variant="caption" muted className="text-xs text-right">{asString(item.created_at)}</AppText>
                    </View>
                  ))}
                  {history.map((item, i) => (
                    <View key={asString(item.id) + i} className="p-3 rounded-xl bg-background border border-border gap-1">
                      <AppText className="font-tajawal-bold text-sm text-right">قرار: {asString(item.decision)}</AppText>
                      <AppText variant="caption" muted className="text-xs text-right">{asString(item.created_at)}</AppText>
                      <AppText variant="caption" muted className="text-xs text-right">{asString(item.reason)}</AppText>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <Card className="lg:col-span-5 p-4 sm:p-6 border border-border gap-4">
              <AppText className="text-lg font-tajawal-bold text-right">قرار مراجعة التأهيل</AppText>
              <W06AuthorityNotice role={role} action="إصدار قرار التأهيل" />
              {(!evidenceReady || !evidenceReviewed) && <W06Message kind="info" title="الاعتماد مرتبط بفحص الأدلة" detail="اعتماد التأهيل يظل معطلاً حتى تنجح صلاحية عرض جميع الأدلة وتؤكد فحصها. لا تُعرض روابط التخزين الخاصة مباشرةً." />}
              {!submitted && <W06Message title="لا يمكن إصدار قرار لهذا الطلب" detail="الخادم يقبل قرارات الطلبات المقدّمة فقط." kind="info" />}

              <View className="flex-row flex-wrap gap-2">
                {([
                  ['approved', 'اعتماد الطلب'],
                  ['needs_info', 'طلب استكمال'],
                  ['rejected', 'رفض الطلب'],
                ] as const).map(([value, label]) => (
                  <Pressable
                    key={value}
                    disabled={!canDecide || (value === 'approved' && !approvalEvidenceVerified)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: decision === value, disabled: !canDecide || (value === 'approved' && !approvalEvidenceVerified) }}
                    onPress={() => { setDecision(value); setConfirming(false); }}
                    className={`rounded-xl p-3 border ${decision === value
                      ? 'bg-[#FEF3C7] dark:bg-[#422E12] border-[#FACC15]'
                      : 'bg-background border-border'} ${!canDecide ? 'opacity-50' : ''}`}
                  >
                    <AppText className="text-xs font-tajawal-bold text-right">{label}</AppText>
                  </Pressable>
                ))}
              </View>

              <AppText variant="caption" muted className="text-xs text-right">مبرر القرار {needsReason ? '(إجباري: 5–2000 حرف)' : '(اختياري)'}</AppText>
              <TextInput
                multiline
                numberOfLines={4}
                value={reason}
                onChangeText={(value) => { setReason(value); setConfirming(false); }}
                editable={canDecide}
                className="rounded-xl border border-border bg-background p-3.5 min-h-[112px] text-sm font-tajawal text-right"
                style={{ color: colors.foreground, textAlignVertical: 'top' }}
                placeholder="دوّن سبباً واضحاً قابلًا للمراجعة في سجل القرار"
                placeholderTextColor={colors.mutedForeground}
                accessibilityLabel="مبرر قرار التأهيل"
              />

              {mutation.isError && <W06Message title="لم يكتمل اتخاذ القرار" detail={w06ErrorMessage(mutation.error)} kind="error" retry={() => void query.refetch()} />}

              <View className="rounded-xl border border-border bg-background p-3 flex-row gap-2 items-center">
                <ShieldCheck size={18} color="#A16207" />
                <AppText variant="caption" muted className="flex-1 text-xs text-right">
                  الخادم يتحقق من صلاحية المراجع وتعارض المصالح وحالة الطلب وقت الحفظ؛ لا يعتمد القرار على بيانات المعاينة.
                </AppText>
              </View>

              {confirming && decision ? (
                <View className="gap-2 p-3 border border-[#FACC15] rounded-xl">
                  <AppText className="text-sm font-tajawal-bold text-right">
                    تأكيد نهائي: {decision === 'approved' ? 'اعتماد' : decision === 'rejected' ? 'رفض' : 'طلب استكمال'} هذا الطلب؟
                  </AppText>
                  <AppButton title="تأكيد وإرسال القرار للخادم" loading={mutation.isPending} disabled={!canDecide || (decision === 'approved' && !approvalEvidenceVerified) || !validReason} onPress={() => void submit()} />
                  <AppButton title="إلغاء التأكيد" variant="outline" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
                </View>
              ) : (
                <AppButton title="متابعة إلى تأكيد القرار" disabled={!canDecide || !decision || (decision === 'approved' && !approvalEvidenceVerified) || !validReason} onPress={() => setConfirming(true)} />
              )}
            </Card>
          </View>
        </>
      )}
    </View>
  );
}
