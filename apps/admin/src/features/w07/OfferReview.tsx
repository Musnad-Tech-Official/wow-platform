import React, { useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FileCheck2, ImageIcon, ShieldCheck } from 'lucide-react-native';
import { useAdminOfferReview, useAdminDecideOffer, useAdminOfferAssets } from '@wow/api';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText, Badge, Card } from '@wow/ui';
import type { AdminRole } from '../auth/admin-access';
import {
  canSubmitW06Decision, W06Header, W06Message, W06AuthorityNotice, w06ErrorMessage,
} from '../w06/W06Shared';

type JsonObject = Record<string, unknown>;
type Decision = 'approved' | 'rejected' | 'needs_info';
const isRecord = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const asRecord = (value: unknown): JsonObject => isRecord(value) ? value : {};
const asRecords = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];
const display = (value: unknown): string =>
  value === null || value === undefined || value === '' ? 'غير متاح' : String(value);

const DECISIONS: { value: Decision; title: string }[] = [
  { value: 'approved', title: 'اعتماد النسخة' },
  { value: 'needs_info', title: 'طلب معلومات' },
  { value: 'rejected', title: 'رفض النسخة' },
];

function InfoTile({ label, value }: { label: string; value: unknown }) {
  return (
    <View className="rounded-xl border border-border bg-background p-3 gap-1">
      <AppText variant="caption" muted className="text-xs text-right">{label}</AppText>
      <AppText className="text-sm font-tajawal-bold text-right" selectable numberOfLines={3}>
        {display(value)}
      </AppText>
    </View>
  );
}

export function OfferReview({ id, role }: { id: string; role: AdminRole | null }) {
  const router = useRouter();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const review = useAdminOfferReview(id);
  const mutation = useAdminDecideOffer();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [reviewedAssetReceipt, setReviewedAssetReceipt] = useState<{ versionId: string; issuedAt: number } | null>(null);
  const data = isRecord(review.data) ? review.data : null;
  const version = asRecord(data?.version);
  const business = asRecord(data?.business);
  const offer = asRecord(data?.offer);
  const items = asRecords(data?.items);
  const branches = asRecords(data?.branches);
  const media = asRecords(data?.media);
  const reviews = asRecords(data?.reviews);
  const evidence = asRecords(data?.private_evidence);
  const businessId = typeof business.id === 'string' ? business.id : null;
  const mediaKeys = media.flatMap((item) => typeof item.storage_key === 'string'
    ? [item.storage_key] : []);
  const evidenceKeys = evidence.flatMap((item) => typeof item.storageKey === 'string'
    ? [item.storageKey] : []);
  const viewerIsReviewer = canSubmitW06Decision(role);
  const assetQuery = useAdminOfferAssets(
    data && typeof version.id === 'string' ? id : null, businessId,
    mediaKeys, evidenceKeys, viewerIsReviewer,
  );
  const pending = version.review_status === 'pending';
  const readyToDecide = viewerIsReviewer && pending && !mutation.isPending;
  const requiresEvidence = version.original_price !== null && version.original_price !== undefined ||
    version.is_clearance === true;
  const expectedAssets = mediaKeys.length + evidenceKeys.length;
  const signedReady = expectedAssets === 0 ||
    (assetQuery.isSuccess && !assetQuery.isFetching && assetQuery.data.length === expectedAssets);
  const evidenceReady = !requiresEvidence ||
    (evidenceKeys.length > 0 && assetQuery.isSuccess &&
      assetQuery.data.filter((item) => item.kind === 'evidence').length === evidenceKeys.length);
  const reviewed = expectedAssets === 0 ||
    (assetQuery.isSuccess && !assetQuery.isFetching &&
      reviewedAssetReceipt?.versionId === id &&
      reviewedAssetReceipt.issuedAt === assetQuery.dataUpdatedAt &&
      assetQuery.dataUpdatedAt > 0);
  const validAssets = signedReady && evidenceReady && reviewed;
  const trimmedReason = reason.trim();
  const reasonValid = (decision === 'approved' ? trimmedReason.length <= 2000 :
    trimmedReason.length >= 5 && trimmedReason.length <= 2000);
  const validSubmission = readyToDecide && !!decision && reasonValid &&
    (decision !== 'approved' || validAssets);

  const changeDecision = (value: Decision) => {
    setDecision(value);
    setReason('');
    setConfirming(false);
    mutation.reset();
  };

  async function submit() {
    if (!validSubmission || !confirming || !decision) return;
    if (decision === 'approved' && expectedAssets > 0 &&
        Date.now() - assetQuery.dataUpdatedAt >= 45_000) {
      setReviewedAssetReceipt(null);
      setConfirming(false);
      void assetQuery.refetch();
      return;
    }
    try {
      await mutation.mutateAsync({ versionId: id, decision, reason: trimmedReason || null });
      router.replace('/offer-review' as any);
    } catch {
      setConfirming(false);
    }
  }

  return (
    <View className="gap-6">
      <View className="flex-row justify-start">
        <AppButton title="العودة إلى قائمة العروض" variant="outline" size="sm"
          onPress={() => router.replace('/offer-review' as any)} />
      </View>
      <W06Header section="مراجعة العروض" title="مراجعة نسخة عرض"
        description="قرار مستقل مبني على النسخة المرسلة وسجلها الحالي. تُراجع المرفقات بروابط مؤقتة." />
      {review.isPending && <W06Message title="جارٍ تحميل تفاصيل العرض…" kind="info" />}
      {review.isError && <W06Message title="تعذر تحميل نسخة العرض"
        kind="error" detail="قد تكون الجلسة غير مخولة أو أن العرض غير موجود."
        retry={() => void review.refetch()} />}
      {review.isSuccess && !data && <W06Message title="نسخة العرض غير موجودة أو غير متاحة" />}
      {review.isSuccess && data && (
        <>
          <Card className="border border-border p-4 sm:p-6 gap-4">
            <View className="flex-row flex-wrap justify-between items-center gap-3">
              <Badge label={pending ? 'قيد المراجعة' : display(version.review_status)} variant="secondary" />
              <AppText className="text-xl font-tajawal-bold text-right">
                {display(version.title)}
              </AppText>
            </View>
            <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoTile label="النشاط" value={business.name} />
              <InfoTile label="حالة النشاط" value={business.status} />
              <InfoTile label="حالة العرض" value={offer.status} />
              <InfoTile label="نسخة العرض" value={version.version_no} />
              <InfoTile label="النوع" value={version.offer_kind} />
              <InfoTile label="الفئة" value={version.category_id} />
              <InfoTile label="السعر قبل العرض" value={version.original_price} />
              <InfoTile label="السعر النهائي" value={version.final_price} />
              <InfoTile label="العملة" value={version.currency} />
              <InfoTile label="تاريخ البدء" value={version.starts_at} />
              <InfoTile label="تاريخ الانتهاء" value={version.ends_at} />
              <InfoTile label="رسوم إضافية" value={version.mandatory_fees} />
            </View>
            <View className="gap-2">
              <AppText className="font-tajawal-bold text-base text-right">الوصف والشروط</AppText>
              {[
                ['الوصف', version.description], ['التفاصيل والمنافع', version.benefit_details],
                ['الشروط', version.terms], ['ملاحظات التوفر', version.stock_or_condition_notice],
              ].map(([label, value]) =>
                <InfoTile key={String(label)} label={String(label)} value={value} />)}
            </View>
          </Card>

          <View className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border p-4 sm:p-5 gap-3">
              <AppText className="text-lg font-tajawal-bold text-right">العناصر والفروع</AppText>
              {items.length === 0 && branches.length === 0 && <W06Message title="لا توجد تفاصيل عناصر أو فروع مسجلة" />}
              {items.map((item, index) => (
                <View key={String(item.id ?? index)} className="rounded-xl border border-border p-3 gap-1">
                  <AppText className="text-sm font-tajawal-bold text-right">{display(item.name)}</AppText>
                  <AppText variant="caption" muted className="text-xs text-right">
                    {display(item.item_type)} • {display(item.quantity)} {display(item.unit)}
                  </AppText>
                  {asRecords(item.attributes).map((attr, i) =>
                    <AppText key={i} variant="caption" muted className="text-xs text-right">
                      {display(attr.name)}: {display(attr.value)}
                    </AppText>)}
                </View>
              ))}
              {branches.map((item, index) => (
                <View key={String(item.id ?? index)} className="rounded-xl border border-border p-3">
                  <AppText className="text-sm font-tajawal-bold text-right">{display(item.name)}</AppText>
                  <AppText variant="caption" muted className="text-xs text-right">
                    {display(item.city)} • {display(item.status)}
                  </AppText>
                </View>
              ))}
            </Card>

            <Card className="border border-border p-4 sm:p-5 gap-3">
              <View className="flex-row gap-2 items-center">
                <ImageIcon size={19} color="#A16207" />
                <AppText className="text-lg font-tajawal-bold text-right flex-1">
                  الصور والأدلة الخاصة
                </AppText>
              </View>
              <AppText variant="caption" muted className="text-xs text-right">
                {media.length} صور • {evidence.length} مستندات
              </AppText>
              {requiresEvidence && evidence.length === 0 && (
                <W06Message kind="info" title="أدلة السعر السابق أو التصفية غير متاحة"
                  detail="يبقى الاعتماد معطلاً حتى يرفق التاجر الأدلة المطلوبة ويتحقق منها الخادم." />
              )}
              {!viewerIsReviewer && expectedAssets > 0 && (
                <W06Message title="المرفقات الخاصة متاحة للمراجع المخوّل فقط" kind="info" />
              )}
              {viewerIsReviewer && assetQuery.isPending && expectedAssets > 0 &&
                <W06Message title="جارٍ التحقق من صلاحيات فتح المرفقات…" kind="info" />}
              {assetQuery.isError && <W06Message title="تعذر توقيع المرفقات بأمان"
                detail="لا يمكن اعتماد النسخة قبل استكمال التحقق من المرفقات."
                kind="error" retry={() => { setReviewedAssetReceipt(null); void assetQuery.refetch(); }} />}
              {viewerIsReviewer && assetQuery.isSuccess && assetQuery.data.map((item) => (
                <AppButton key={item.kind + item.keyIndex} size="sm" variant="outline"
                  title={(item.kind === 'image' ? 'عرض صورة ' : 'فتح مستند ') + (item.keyIndex + 1)}
                  onPress={() => {
                    if (Date.now() - assetQuery.dataUpdatedAt >= 45_000) {
                      setReviewedAssetReceipt(null);
                      void assetQuery.refetch();
                      return;
                    }
                    void Linking.openURL(item.signedUrl);
                  }} />
              ))}
              {viewerIsReviewer && expectedAssets > 0 &&
                <AppButton title="تجديد الروابط المؤقتة" variant="outline" size="sm"
                  onPress={() => { setReviewedAssetReceipt(null); void assetQuery.refetch(); }} />}
              {viewerIsReviewer && assetQuery.isSuccess && expectedAssets > 0 && (
                <Pressable accessibilityRole="checkbox"
                  accessibilityState={{ checked: reviewed }}
                  onPress={() => setReviewedAssetReceipt(reviewed ? null :
                    { versionId: id, issuedAt: assetQuery.dataUpdatedAt })}
                  className={'flex-row items-center gap-2 rounded-xl p-3 ' +
                    (isDark ? 'bg-[#422E12]' : 'bg-[#FEFCE8]')}>
                  <View className="rounded w-5 h-5 border border-[#A16207] items-center justify-center">
                    {reviewed && <ShieldCheck size={16} color="#A16207" />}
                  </View>
                  <AppText className={'flex-1 text-xs font-tajawal-bold text-right ' +
                      (isDark ? 'text-[#FEF08A]' : 'text-[#854D0E]')}>
                    أؤكد أنني راجعت الصور والمستندات المتاحة فعلياً.
                  </AppText>
                </Pressable>
              )}
            </Card>
          </View>

          <View className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border p-4 sm:p-5 gap-3">
              <AppText className="text-lg font-tajawal-bold text-right">تاريخ المراجعات</AppText>
              {reviews.length === 0 && <W06Message title="لا توجد قرارات سابقة مسجلة" />}
              {reviews.map((item, index) => (
                <View key={String(item.id ?? index)} className="rounded-xl border border-border p-3 gap-1">
                  <AppText className="text-sm font-tajawal-bold text-right">{display(item.decision)}</AppText>
                  <AppText variant="caption" muted className="text-xs text-right">
                    {display(item.reason)} • {display(item.created_at)}
                  </AppText>
                </View>
              ))}
            </Card>
            <Card className="border border-border p-4 sm:p-5 gap-4">
              <View className="flex-row gap-2 items-center">
                <FileCheck2 size={20} color="#A16207" />
                <AppText className="text-lg font-tajawal-bold text-right flex-1">قرار مراجعة النسخة</AppText>
              </View>
              <W06AuthorityNotice role={role} action="مراجعة العرض" />
              {!pending && <W06Message title="هذه النسخة ليست في حالة انتظار المراجعة" />}
              {readyToDecide && (
                <>
                  <View className="flex-row flex-wrap gap-2">
                    {DECISIONS.map((item) => (
                      <Pressable key={item.value} accessibilityRole="button"
                        accessibilityState={{ selected: decision === item.value }}
                        onPress={() => changeDecision(item.value)}
                        className={'rounded-xl border px-3 py-2 ' +
                          (decision === item.value
                            ? (isDark ? 'bg-[#422E12] border-[#FACC15]' : 'bg-[#FEF3C7] border-[#FACC15]')
                            : 'bg-background border-border')}>
                        <AppText className="text-xs font-tajawal-bold text-right">{item.title}</AppText>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput multiline value={reason} onChangeText={(value) => {
                    setReason(value); setConfirming(false);
                  }} placeholder={decision === 'approved' ? 'ملاحظة اختيارية (حد أقصى 2000 حرف)' :
                    'سبب القرار مطلوب (5 أحرف على الأقل)'}
                    placeholderTextColor={colors.mutedForeground}
                    className="rounded-xl border border-border bg-background p-3 text-right font-tajawal"
                    style={{ color: colors.foreground, minHeight: 96, textAlignVertical: 'top' }}
                    accessibilityLabel="سبب قرار مراجعة العرض" />
                  {decision === 'approved' && !validAssets && (
                    <W06Message title="لا يمكن الاعتماد قبل فحص الأدلة والمرفقات المطلوبة" kind="info" />
                  )}
                  <Pressable accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirming }}
                    disabled={!validSubmission}
                    onPress={() => setConfirming((value) => !value)}
                    className="flex-row gap-2 items-center rounded-xl border border-border p-3">
                    <View className="w-5 h-5 rounded border border-[#A16207] items-center justify-center">
                      {confirming && <ShieldCheck size={16} color="#A16207" />}
                    </View>
                    <AppText className="flex-1 text-sm text-right">
                      أؤكد أن القرار يخص هذه النسخة فقط وأنني تحققت من حالة العرض.
                    </AppText>
                  </Pressable>
                  {mutation.isError &&
                    <W06Message title="لم يُقبل قرار المراجعة" kind="error"
                      detail={w06ErrorMessage(mutation.error)} />}
                  <AppButton title={mutation.isPending ? 'جارٍ إرسال القرار…' : 'تأكيد وإرسال القرار'}
                    disabled={!validSubmission || !confirming || mutation.isPending}
                    onPress={() => void submit()} />
                </>
              )}
            </Card>
          </View>
        </>
      )}
    </View>
  );
}
