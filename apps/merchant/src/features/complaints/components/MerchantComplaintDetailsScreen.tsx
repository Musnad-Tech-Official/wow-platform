import React, { useState } from 'react';
import { View, ScrollView, TextInput, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  MessageSquare,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import {
  useMerchantComplaint,
  useMerchantRespondComplaint,
  useUploadWowMedia,
  type MerchantComplaintDetail,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { EvidencePicker, type SelectedEvidenceFile } from '../../business/components/EvidencePicker';

export function MerchantComplaintDetailsScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const params = useLocalSearchParams<{
    complaintId?: string;
    businessId?: string;
    preview?: string;
  }>();

  const complaintId = params.complaintId;

  const {
    activeBusinessId,
    isOwner,
    isSyntheticPreview,
  } = useActiveBusiness();

  const { data: serverDetail, isLoading: isDetailLoading, error: detailError, refetch: refetchDetail } = useMerchantComplaint(complaintId);
  const respondMutation = useMerchantRespondComplaint();
  const uploadEvidenceMutation = useUploadWowMedia();

  // Synthetic fallback detail matching reference MER-09
  const detail: MerchantComplaintDetail | null = isSyntheticPreview
    ? {
        id: complaintId || 'case-018-uuid',
        offer_id: 'offer-headphones-uuid',
        offer_title: 'سماعات لاسلكية مع ضمان المحل',
        offer_version_id: 'version-headphones-uuid',
        branch_id: 'branch-tahrir-uuid',
        branch_name: 'فرع التحرير',
        complaint_type: 'price_mismatch',
        description: 'عدم تطابق السعر المعروض مع السعر الفعلي عند زيارة الفرع.',
        incident_at: null,
        status: 'waiting',
        public_outcome: null,
        created_at: new Date().toISOString(),
        closed_at: null,
        is_owner: true,
        updates: [
          {
            id: 'up-1',
            kind: 'request_info',
            message: 'تطلب الإدارة توضيح طريقة احتساب السعر المعروض فقط.',
            visibility: 'proprietor_safe',
            created_at: new Date().toISOString(),
          },
        ],
      }
    : (serverDetail ?? null);

  const [responseMessage, setResponseMessage] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<(SelectedEvidenceFile | null)[]>([null, null, null]);
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'uploading' | 'sending'>('idle');

  const navParams = {
    ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    ...(isSyntheticPreview ? { preview: '1' } : {}),
  };

  const handleBack = () => {
    router.replace({
      pathname: '/complaints',
      params: navParams,
    });
  };

  // Waiting does not by itself establish a new administrative request.
  const requestedUpdate = detail?.updates?.filter(
    (update) => update.kind === 'request_info' && update.visibility === 'proprietor_safe'
  ).at(-1);
  const lastProprietorReply = detail?.updates?.filter(
    (update) => update.kind === 'merchant_response'
  ).at(-1);
  const responseRequested = Boolean(
    detail?.status === 'waiting' && requestedUpdate &&
    (!lastProprietorReply || Date.parse(requestedUpdate.created_at) > Date.parse(lastProprietorReply.created_at))
  );
  const canRespond = Boolean(detail && isOwner && detail.is_owner && responseRequested);

  const handleOpenReview = () => {
    if (responseMessage.trim().length < 5) {
      setSendError('يجب أن يحتوي الرد على 5 أحرف على الأقل.');
      return;
    }
    if (responseMessage.trim().length > 3000) {
      setSendError('يتجاوز الرد الحد الأقصى المسموح (3000 حرف).');
      return;
    }
    setSendError(null);
    setConfirmModalOpen(true);
  };

  const changeEvidence = (index: number, file: SelectedEvidenceFile | null) => {
    setEvidenceFiles((previous) => previous.map((existing, i) => i === index ? file : existing));
  };

  const handleSendResponse = async () => {
    if (!complaintId || !canRespond || submitting) return;
    setSubmitting(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      if (isSyntheticPreview) {
        setSendSuccess('تم إرسال الرد الرسمي إلى الإدارة بنجاح (معاينة)');
        setTimeout(() => {
          setConfirmModalOpen(false);
          setResponseMessage('');
        }, 1200);
        return;
      }

      const uploadedKeys: string[] = [];
      for (const [index, file] of evidenceFiles.entries()) {
        if (!file) continue;
        if (file.isUploaded && file.storageKey) {
          uploadedKeys.push(file.storageKey);
          continue;
        }
        if (!file.bytes) {
          throw new Error('المستند غير جاهز للرفع. أعد اختيار الملف.');
        }
        setSubmissionPhase('uploading');
        const uploaded = await uploadEvidenceMutation.mutateAsync({
          scope: { kind: 'complaint', complaintId },
          bytes: file.bytes,
          contentType: file.mimeType,
        });
        uploadedKeys.push(uploaded.key);
        setEvidenceFiles((previous) => previous.map((existing, i) =>
          i === index && existing ? { ...existing, isUploaded: true, storageKey: uploaded.key } : existing
        ));
      }
      setSubmissionPhase('sending');
      await respondMutation.mutateAsync({
        complaintId,
        message: responseMessage.trim(),
        ...(uploadedKeys.length ? { evidenceKeys: uploadedKeys } : {}),
      });

      setSendSuccess('تم تسجيل الرد وإشعار فريق المراجعة الإدارية.');
      setTimeout(() => {
        setConfirmModalOpen(false);
        setResponseMessage('');
        setEvidenceFiles([null, null, null]);
      }, 1500);
    } catch (err: unknown) {
      setSendError((err instanceof Error ? err.message : 'تعذر إرسال الرد إلى الإدارة.')
        + ' تحقق من سجل الحالة قبل إعادة الإرسال إذا انقطع الاتصال.');
      void refetchDetail();
    } finally {
      setSubmissionPhase('idle');
      setSubmitting(false);
    }
  };

  const isClosed = detail?.status === 'closed';

  // An unauthorized, missing, or failed lookup must never render a sample complaint.
  if (!detail) {
    return (
      <MerchantScaffold currentTab="complaints" title="تفاصيل الشكوى"
        subtitle="مراجعة الحالة والتواصل الرسمي مع إدارة واو" showBusinessSelector={false}>
        <View className="gap-4 rounded-2xl border border-border p-5">
          <AppText variant="heading" className="text-right">
            {detailError ? 'تعذر تحميل الشكوى' : isDetailLoading ? 'جارٍ تحميل الشكوى...' : 'الحالة غير متاحة'}
          </AppText>
          <AppText muted className="text-right">
            {detailError ? 'تحقق من الاتصال ثم أعد المحاولة.' :
              isDetailLoading ? 'يُرجى الانتظار حتى اكتمال جلب بيانات الحالة.' :
              'لم يتم العثور على حالة مصرّح بعرضها لهذا الحساب.'}
          </AppText>
          {detailError ? <AppButton title="إعادة المحاولة" onPress={() => void refetchDetail()} /> : null}
          <AppButton title="العودة إلى الشكاوى" variant="outline" onPress={handleBack} />
        </View>
      </MerchantScaffold>
    );
  }

  return (
    <MerchantScaffold
      currentTab="complaints"
      title="تفاصيل الشكوى"
      subtitle="مراجعة الحالة والتواصل الرسمي مع إدارة واو"
      showBusinessSelector={false}
    >
      <View className="gap-5 pb-10">
        {/* Hero Card with Case ID & Required Status (Matching Reference MER-09) */}
        <View
          className="rounded-2xl border p-5 gap-3"
          style={{ backgroundColor: colors.warningSurface, borderColor: colors.warning }}
        >
          <View className="flex-row items-center justify-between">
            <View
              className="rounded-md px-3 py-1"
              style={{ backgroundColor: '#FDE047' }}
            >
              <AppText
                variant="caption"
                className="font-tajawal-bold text-xs"
                style={{ color: '#0F172D' }}
              >
                {responseRequested ? 'مطلوب رد من المالك' : isClosed ? 'حالة مغلقة' : 'قيد المتابعة'}
              </AppText>
            </View>

            <AppText variant="caption" muted className="text-xs text-right">
              حالة إدارية مرتبطة بالعرض
            </AppText>
          </View>

          <AppText
            variant="heading"
            className="font-tajawal-bold text-2xl text-center tracking-wider my-1"
            style={{ color: colors.foreground }}
          >
            {isSyntheticPreview ? 'CASE-018' : detail.id.slice(0, 8).toUpperCase()}
          </AppText>
        </View>

        {/* Section 1: Authorized Information */}
        <View className="gap-2">
          <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
            معلومات مصرح بها
          </AppText>

          <View
            className="rounded-2xl border p-4 gap-3.5"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="flex-row items-start justify-between">
              <View className="items-start flex-1">
                <AppText variant="caption" muted className="text-xs">
                  الفرع
                </AppText>
                <AppText variant="label" className="font-tajawal-bold text-sm mt-0.5">
                  {detail.branch_name || 'فرع غير محدد'}
                </AppText>
              </View>

              <View className="items-end flex-1">
                <AppText variant="caption" muted className="text-xs">
                  العرض
                </AppText>
                <AppText variant="label" className="font-tajawal-bold text-sm text-right mt-0.5">
                  {detail.offer_title || 'عرض مرتبط بالحالة'}
                </AppText>
              </View>
            </View>

            <View
              className="p-3 rounded-xl border border-border"
              style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
            >
              <AppText variant="caption" muted className="text-xs text-center leading-relaxed">
                لا تُعرض هوية مقدم الشكوى ولا المرفقات الخاصة إلا وفق صلاحيات معتمدة.
              </AppText>
            </View>
          </View>
        </View>

        {/* Section 2: Administration Communication */}
        <View className="gap-2">
          <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
            تواصل الإدارة
          </AppText>

          <View
            className="rounded-2xl border p-4 gap-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <AppText variant="body" className="text-sm text-right leading-relaxed">
              {requestedUpdate?.message || 'لا يوجد طلب توضيح جديد موجّه إلى المالك.'}
            </AppText>

            <View
              className="rounded-xl p-2.5 items-center justify-center"
              style={{ backgroundColor: colors.warningSurface }}
            >
              <AppText
                variant="caption"
                className="font-tajawal-bold text-xs"
                style={{ color: colors.warning }}
              >
                {responseRequested ? 'طلب توضيح مطلوب من المالك' : 'لا يوجد طلب رد جديد'}
              </AppText>
            </View>
          </View>
        </View>

        {/* Recorded official replies are read back from the server, not local success copy. */}
        {detail.updates?.some((update) => update.kind === 'merchant_response') ? (
          <View className="gap-2">
            <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
              الردود الرسمية المسجلة
            </AppText>
            {detail.updates
              .filter((update) => update.kind === 'merchant_response')
              .map((update) => (
                <View key={update.id} className="rounded-2xl border p-4 gap-2"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <AppText variant="body" className="text-sm text-right">{update.message}</AppText>
                  <AppText variant="caption" muted className="text-xs text-right">
                    {new Date(update.created_at).toLocaleString('ar')}
                  </AppText>
                  {Array.isArray(update.private_evidence_keys) && update.private_evidence_keys.length > 0 ? (
                    <AppText variant="caption" muted className="text-xs text-right">
                      مستندات خاصة مرتبطة بالرد: {update.private_evidence_keys.length}
                    </AppText>
                  ) : null}
                </View>
              ))}
          </View>
        ) : null}

        {detail.status === 'closed' && detail.public_outcome ? (
          <View className="rounded-2xl border p-4 gap-2"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <AppText variant="heading" className="font-tajawal-bold text-base text-right">
              نتيجة مراجعة الإدارة
            </AppText>
            <AppText variant="body" className="text-right">{detail.public_outcome}</AppText>
            <AppText variant="caption" muted className="text-xs text-right">
              الحالة مغلقة؛ لا يمكن إرسال رد جديد.
            </AppText>
          </View>
        ) : null}

        {/* Section 3: Owner Reply Draft Area */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between px-1">
            <Image
              source={wowIllustrations.merchant.mer09ComplaintDetailsMascot}
              alt="مساعد واو للرد الرسمي"
              style={{ width: 36, height: 36 }}
              contentFit="contain"
            />
            <AppText variant="heading" className="font-tajawal-bold text-base">
              الرد للإدارة فقط
            </AppText>
          </View>

          <View
            className="rounded-2xl border p-4 gap-3.5"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="gap-1.5">
              <AppText variant="label" className="font-tajawal-bold text-xs text-right">
                توضيحك
              </AppText>
              <TextInput
                value={responseMessage}
                onChangeText={setResponseMessage}
                multiline
                numberOfLines={4}
                editable={canRespond && !isClosed}
                placeholder="رد موضوعي يستند إلى الوقائع المتاحة"
                placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
                className="w-full rounded-xl p-3 border text-right text-sm"
                style={{
                  backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.foreground,
                  minHeight: 90,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View
              className="p-3 rounded-xl border border-border"
              style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
            >
              <AppText variant="caption" muted className="text-xs text-center leading-relaxed">
                {isSyntheticPreview ? 'هذه معاينة تجريبية لا ترسل ردًا إلى الخادم.' : 'سيُرسل الرد إلى الإدارة فقط بعد التأكيد.'}
              </AppText>
            </View>

            {canRespond ? (
              <View className="gap-2.5">
                <AppText variant="label" className="font-tajawal-bold text-sm text-right">
                  مستندات داعمة للإدارة (اختياري، حتى 3 ملفات)
                </AppText>
                {evidenceFiles.map((file, index) => (
                  <EvidencePicker
                    key={index}
                    value={file}
                    onChange={(next) => changeEvidence(index, next)}
                    disabled={submitting || !canRespond}
                  />
                ))}
              </View>
            ) : null}

            {sendError ? (
              <View className="p-3 rounded-xl bg-rose-500/10 flex-row items-center gap-2">
                <AlertCircle size={16} color="#E11D48" />
                <AppText variant="caption" className="text-rose-600 text-xs flex-1 text-right">
                  {sendError}
                </AppText>
              </View>
            ) : null}

            {sendSuccess ? (
              <View className="p-3 rounded-xl bg-emerald-500/10 flex-row items-center gap-2">
                <CheckCircle2 size={16} color="#16A34A" />
                <AppText variant="caption" className="text-emerald-600 text-xs flex-1 text-right">
                  {sendSuccess}
                </AppText>
              </View>
            ) : null}

            {/* Preview & Submit Action */}
            <AppButton
              title="معاينة إرسال الرد"
              variant="primary"
              size="lg"
              disabled={!canRespond || isClosed || responseMessage.trim().length < 5}
              onPress={handleOpenReview}
            />
          </View>
        </View>

        {/* Return to Complaints */}
        <View className="pt-2">
          <AppButton
            title="رجوع للشكاوى"
            variant="outline"
            size="lg"
            onPress={handleBack}
          />
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={confirmModalOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/60 p-4">
          <View
            className="w-full max-w-sm self-center rounded-2xl border p-5 gap-3.5"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="items-center justify-center w-12 h-12 rounded-full self-center bg-amber-500/10">
              <MessageSquare size={24} color="#D97706" />
            </View>

            <AppText variant="heading" className="font-tajawal-bold text-base text-center">
              تأكيد إرسال الرد للإدارة
            </AppText>

            <View
              className="p-3 rounded-xl border border-border max-h-36"
              style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
            >
              <ScrollView>
                <AppText variant="body" className="text-xs text-right leading-relaxed">
                  {responseMessage}
                </AppText>
              </ScrollView>
            </View>

            <AppText variant="caption" muted className="text-xs text-center leading-relaxed">
              المستلم: إدارة منصة واو فقط. المرفقات: {evidenceFiles.filter(Boolean).length} مستندات خاصة. لن يتم نشر الرد أو مشاركته مع العميل.
            </AppText>

            <View className="flex-row items-center gap-2.5 pt-2">
              <View className="flex-1">
                <AppButton
                  title={submitting ? (submissionPhase === 'uploading' ? 'جارٍ رفع المستندات...' : 'جارٍ الإرسال...') : 'إرسال رسمي'}
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  onPress={handleSendResponse}
                />
              </View>

              <View className="flex-1">
                <AppButton
                  title="تعديل الرد"
                  variant="secondary"
                  size="md"
                  disabled={submitting}
                  onPress={() => setConfirmModalOpen(false)}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </MerchantScaffold>
  );
}
