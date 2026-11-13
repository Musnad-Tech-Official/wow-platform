import React, { useEffect, useState } from 'react';
import { View, Pressable, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  Crown,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import {
  useBusinessBilling,
  useSubscriptionPlans,
  useActivateBusinessTrial,
  useRequestPaidSubscription,
  useSubmitSubscriptionPayment,
  type PlanCode,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';

export function MerchantSubscriptionScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const {
    activeBusinessId,
    isOwner,
    isSyntheticPreview,
  } = useActiveBusiness();

  const { data: billing, isLoading: billingLoading, error: billingError } = useBusinessBilling(isOwner ? activeBusinessId : null);
  const { data: availablePlans = [], isLoading: plansLoading, error: plansError } = useSubscriptionPlans();

  const activateTrialMutation = useActivateBusinessTrial();
  const requestPaidMutation = useRequestPaidSubscription();
  const submitPaymentMutation = useSubmitSubscriptionPayment();

  // Synthetic preview fallbacks
  const currentSub = billing?.subscriptions?.find((sub) => sub.status === 'active')
    ?? billing?.subscriptions?.find((sub) => sub.status === 'pending')
    ?? billing?.subscriptions?.[0];
  const hasTrial = billing?.subscriptions?.some((s) => s.kind === 'trial');
  const pendingPaid = billing?.subscriptions?.find(
    (s) => s.kind === 'paid' && s.status === 'pending'
  );
  const paymentAlreadySubmitted = !!pendingPaid && !!billing?.payments?.some(
    (p) => p.subscription_id === pendingPaid.id && p.status === 'submitted'
  );
  const isTrialActive = isSyntheticPreview ? true : (currentSub?.kind === 'trial' && currentSub?.status === 'active');
  const isPaidActive = currentSub?.kind === 'paid' && currentSub?.status === 'active';
  const isPendingVerification = !!pendingPaid && !!billing?.payments?.some(
    (p) => p.subscription_id === pendingPaid.id && p.status === 'submitted'
  );

  // Status computation
  let statusChip = isTrialActive ? 'تجربة نشطة' : 'غير مفعّل';
  if (isPendingVerification) statusChip = 'دفعة قيد التحقق';
  else if (isPaidActive) statusChip = 'اشتراك فعّال';
  else if (pendingPaid) statusChip = 'طلب مدفوع معلّق';
  else if (currentSub?.status === 'expired') statusChip = 'منتهٍ';

  // Request / Payment Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>('BASIC');
  const pendingPlanCode = pendingPaid?.plan_snapshot?.code;
  const selectedPlanAvailable = isSyntheticPreview || availablePlans.some((p) => p.code === selectedPlan);
  const planOptions = isSyntheticPreview
    ? [{ code: 'BASIC' as PlanCode, name: 'الباقة الأساسية', detail: 'معاينة دون أسعار معتمدة' },
       { code: 'ADVANCED' as PlanCode, name: 'الباقة المتقدمة', detail: 'معاينة دون أسعار معتمدة' }]
    : availablePlans.map((p) => ({
        code: p.code, name: p.name,
        detail: String(p.price) + ' ' + p.currency + ' / ' + p.duration_days + ' يوم',
      }));
  if (!isSyntheticPreview && pendingPaid && pendingPlanCode &&
      !planOptions.some((p) => p.code === pendingPlanCode)) {
    planOptions.push({ code: pendingPlanCode, name: 'الباقة المطلوبة مسبقًا', detail: 'الطلب قيد المراجعة' });
  }
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // A manual payment reference must never carry over to another business.
  useEffect(() => {
    setRequestModalOpen(false);
    setSelectedPlan('BASIC');
    setPaymentRef('');
    setActionSuccess(null);
    setActionError(null);
  }, [activeBusinessId]);

  const paymentStatusLabel = isSyntheticPreview
    ? 'معاينة فقط'
    : billingLoading ? 'جارٍ تحميل الحالة'
    : billingError || !billing ? 'تعذر تأكيد حالة الدفع'
    : isPendingVerification ? 'بانتظار مراجعة الدفعة'
    : pendingPaid ? 'طلب اشتراك معلّق'
    : billing.payments?.some((p) => p.status === 'verified') ? 'دفعة مؤكدة'
    : billing.payments?.some((p) => p.status === 'rejected') ? 'مرجع دفع مرفوض'
    : 'لا توجد دفعات معلّقة';
  const paymentStatusDescription = isSyntheticPreview
    ? 'البيانات توضيحية في المعاينة، ولا تُنفذ معاملات مالية.'
    : isPendingVerification
      ? 'استُلم المرجع المقدم وتنتظر الدفعة تحقق الإدارة المستقل؛ لا يُفعّل الاشتراك المدفوع تلقائيًا.'
      : pendingPaid
        ? 'يوجد طلب اشتراك قيد المراجعة. يمكن تقديم مرجع تحويل للمطابقة مع الإدارة.'
        : 'تُسجّل مراجع التحويل للمراجعة الإدارية فقط، وإرسالها ليس إثباتًا للتحصيل أو موافقة على الاشتراك.';

  const navParams = {
    ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    ...(isSyntheticPreview ? { preview: '1' } : {}),
  };

  const handleOpenAction = () => {
    if (!isOwner || submitting) return;
    const pendingCode = pendingPaid?.plan_snapshot?.code;
    if (pendingCode === 'BASIC' || pendingCode === 'ADVANCED') {
      setSelectedPlan(pendingCode);
    } else if (!isSyntheticPreview && availablePlans.length && !availablePlans.some((p) => p.code === selectedPlan)) {
      setSelectedPlan(availablePlans[0].code);
    }
    setActionSuccess(null);
    setActionError(null);
    setRequestModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (submitting || !isOwner || !activeBusinessId) return;
    if (!isSyntheticPreview && (billingLoading || billingError || !billing)) {
      setActionError('تعذر تأكيد حالة الاستحقاق. أعد تحميل بيانات النشاط قبل الإرسال.');
      return;
    }
    if (!isSyntheticPreview && hasTrial && !pendingPaid && (plansLoading || plansError || !selectedPlanAvailable)) {
      setActionError('الباقة المختارة غير متاحة أو لم تعتمد الإدارة بياناتها بعد.');
      return;
    }
    setSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      if (isSyntheticPreview) {
        setActionSuccess('تم تسجيل طلب الاشتراك بنجاح (معاينة)');
        setTimeout(() => setRequestModalOpen(false), 1200);
        return;
      }

      if (!hasTrial) {
        if (isPaidActive) throw new Error('الاشتراك المدفوع فعّال بالفعل؛ لا تبدأ تجربة جديدة.');
        await activateTrialMutation.mutateAsync(activeBusinessId);
        setActionSuccess('تم تسجيل تفعيل الفترة التجريبية وفق الاستحقاق المؤكد.');
      } else {
        if (paymentAlreadySubmitted) {
          throw new Error('هناك دفعة مقدمة بانتظار مراجعة الإدارة؛ لا ترسل مرجعًا جديدًا.');
        }
        const pendingCode = pendingPaid?.plan_snapshot?.code;
        if (pendingPaid && pendingCode !== selectedPlan) {
          throw new Error('يوجد طلب باقة مدفوعة قيد المراجعة. لا يمكن تبديل باقته قبل حسم الطلب.');
        }
        // Reuse the already-created pending subscription if a previous payment
        // upload failed. The server also forbids duplicate pending requests.
        const subId = pendingPaid?.id ?? await requestPaidMutation.mutateAsync({
          businessId: activeBusinessId,
          planCode: selectedPlan,
        });
        if (paymentRef.trim()) {
          await submitPaymentMutation.mutateAsync({
            subscriptionId: subId,
            method: 'bank_transfer',
            reference: paymentRef.trim(),
          });
        }
        setActionSuccess(paymentRef.trim()
          ? 'قُدم مرجع الدفعة للمراجعة الإدارية؛ لم يُفعّل الاشتراك بعد.'
          : 'سُجل طلب الاشتراك؛ سيبقى معلقًا حتى إتمام إجراءات الدفع والمراجعة.');
      }

      setTimeout(() => setRequestModalOpen(false), 1500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'تعذر إتمام طلب الاشتراك.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOwner && !isSyntheticPreview) {
    return (
      <MerchantScaffold currentTab="more" title="الاشتراكات والاستحقاقات خاصة بمالك النشاط">
        <View className="rounded-2xl border border-border p-5 gap-3">
          <AppText variant="heading" className="text-right">هذه الصفحة للمالك فقط</AppText>
          <AppText muted className="text-right">
            لا يسمح التفويض التشغيلي بإدارة الاشتراكات أو تفويض الموظفين.
          </AppText>
          <AppButton title="العودة إلى حساب النشاط" variant="outline"
            onPress={() => router.replace({ pathname: '/business/account',
              params: activeBusinessId ? { businessId: activeBusinessId } : {} })} />
        </View>
      </MerchantScaffold>
    );
  }

  return (
    <MerchantScaffold
      currentTab="more"
      title="الاشتراك والصلاحية"
      subtitle="حالة الاستحقاق وباقات الظهور للنشاط التجاري"
    >
      <View className="gap-5 pb-10">
        {/* Banner with Mascot (Matching Reference MER-10) */}
        <View
          className="rounded-2xl border p-4 flex-row items-center justify-between"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <View className="flex-1 items-end pr-2">
            <AppText variant="caption" muted className="text-[11px] font-tajawal-bold text-right">
              WOW · FOR BUSINESS
            </AppText>
            <AppText variant="heading" className="font-tajawal-bold text-base text-right mt-0.5">
              استحقاق نشاطك التجاري
            </AppText>
            <AppText variant="body" muted className="text-xs text-right mt-1 leading-relaxed">
              الاشتراك مرتبط بالنشاط المؤهل، لا بهوية الدخول أو بعدد الفروع.
            </AppText>
          </View>

          <Image
            source={wowIllustrations.merchant.mer10SubscriptionMascot}
            alt="مساعد واو للاشتراك"
            style={{ width: 80, height: 80 }}
            contentFit="contain"
          />
        </View>

        {/* Section 1: Current Status Card */}
        <View className="gap-2">
          <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
            الحالة الحالية
          </AppText>

          <View
            className="rounded-2xl border p-4 gap-3.5"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between">
              <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: isDark ? '#1E293B' : '#FEF9C3' }}
              >
                <Crown size={22} color="#D97706" />
              </View>

              <View className="items-end">
                <AppText variant="caption" muted className="text-xs">
                  نموذج الاستحقاق
                </AppText>
                <AppText variant="heading" className="font-tajawal-bold text-lg">
                  {isTrialActive ? 'تجربة نشطة' : isPaidActive ? 'اشتراك مدفوع' : 'غير مفعل'}
                </AppText>
              </View>
            </View>

            <AppText variant="caption" muted className="text-xs text-right leading-relaxed">
              التجربة صالحة لمدة 30 يوماً لكل نشاط حقيقي مؤهل.
            </AppText>

            {/* Current confirmed status, not multiple decorative statuses. */}
            <View className="flex-row justify-end pt-1">
              <View className="px-3 py-1.5 rounded-xl border"
                style={{ backgroundColor: '#FACC15', borderColor: '#EAB308' }}>
                <AppText variant="caption" className="font-tajawal-bold text-xs"
                  style={{ color: '#0F172D' }}>{statusChip}</AppText>
              </View>
            </View>

            {/* Eligibility Note Card */}
            <View
              className="p-3 rounded-xl border border-border"
              style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
            >
              <AppText variant="caption" muted className="text-xs text-center leading-relaxed">
                الموافقة على المحتوى، والفرع، والفترة، والتوفر تظل شروطاً منفصلة.
              </AppText>
            </View>
          </View>
        </View>

        {/* Section 2: Plan Details Card */}
        <View className="gap-2">
          <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
            تفاصيل الباقة
          </AppText>

          <View
            className="rounded-2xl border p-4 gap-3.5"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            {/* Row 1: Plan Code & Info Badge */}
            <View className="flex-row items-center justify-between gap-3 pb-3 border-b border-border">
              <View
                className="rounded-lg px-2.5 py-1"
                style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}
              >
                <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  معلومات
                </AppText>
              </View>

              <View className="items-end flex-1 min-w-0">
                <AppText variant="label" className="font-tajawal-bold text-sm text-right">
                  {currentSub?.plan_snapshot?.code ? 'الباقة: ' + currentSub.plan_snapshot.code : 'تفاصيل الخطط'}
                </AppText>
                <AppText variant="caption" muted className="text-xs mt-0.5 text-right">
                  {currentSub?.plan_snapshot?.price != null
                    ? 'السعر المعتمد: ' + String(currentSub.plan_snapshot.price)
                    : 'تُعرض الأسعار المعتمدة عند توفرها من النظام.'}
                </AppText>
              </View>
            </View>

            {/* Row 2: Duration */}
            <View className="items-end">
              <AppText variant="label" className="font-tajawal-bold text-sm">
                بداية ونهاية الاشتراك
              </AppText>
              <AppText variant="caption" muted className="text-xs mt-0.5">
                {currentSub?.starts_at && currentSub?.ends_at
                  ? new Date(currentSub.starts_at).toLocaleDateString('ar')
                    + ' — ' + new Date(currentSub.ends_at).toLocaleDateString('ar')
                  : 'لا تتوفر تواريخ اشتراك مؤكدة بعد.'}
              </AppText>
            </View>
          </View>
        </View>

        {/* Section 3: Payment Verification Review */}
        <View className="gap-2">
          <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
            مراجعة الدفعات
          </AppText>

          <View
            className="rounded-2xl border p-4 gap-2.5"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between">
              <View
                className="rounded-lg px-2.5 py-1"
                style={{ backgroundColor: isDark ? '#451A03' : '#FEF3C7' }}
              >
                <AppText variant="caption" className="font-tajawal-bold text-xs" style={{ color: '#D97706' }}>
                  {paymentStatusLabel}
                </AppText>
              </View>

              <AppText variant="label" className="font-tajawal-bold text-sm">
                حالة التأكيد
              </AppText>
            </View>

            <AppText variant="caption" muted className="text-xs text-right leading-relaxed">
              {paymentStatusDescription}
            </AppText>
          </View>
        </View>

        {/* Bottom Actions */}
        <View className="flex-row items-center gap-3 pt-2">
          <View className="flex-1">
            <AppButton
              title="طلب تفعيل / تجديد"
              variant="primary"
              size="lg"
              disabled={!isOwner || (!isSyntheticPreview && (billingLoading || !!billingError || !billing))}
              onPress={handleOpenAction}
            />
          </View>

          <View className="flex-1">
            <AppButton
              title="الرئيسية"
              variant="secondary"
              size="lg"
              onPress={() => router.replace({ pathname: '/', params: navParams })}
            />
          </View>
        </View>
      </View>

      {/* Subscription Action Modal */}
      <Modal visible={requestModalOpen} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="w-full max-w-lg self-center rounded-t-3xl border-t p-5 gap-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between pb-2 border-b border-border">
              <AppText variant="heading" className="font-tajawal-bold text-base">
                طلب تفعيل أو تجديد الاشتراك
              </AppText>
              <Pressable onPress={() => setRequestModalOpen(false)} className="p-1">
                <XCircle size={20} color={isDark ? '#A1A1AA' : '#64748B'} />
              </Pressable>
            </View>

            <AppText variant="caption" muted className="text-xs text-right leading-relaxed">
              {!hasTrial
                ? 'يحق لكل نشاط مؤهل تجربة مجانية لمدة 30 يوماً عند توفر عرض مؤهل وفرع معتمد.'
                : 'طلب الاشتراك المدفوع يتطلب تدقيق ومراجعة الإدارة قبل التفعيل.'}
            </AppText>

            {hasTrial ? (
              <View className="gap-2">
                <AppText variant="label" className="font-tajawal-bold text-xs text-right">
                  اختر الباقة المطلوبة
                </AppText>
                {planOptions.length === 0 ? (
                  <AppText variant="caption" muted className="text-xs text-right">
                    لا توجد باقات مفعّلة بأسعار معتمدة. لا يمكن إرسال طلب مدفوع جديد الآن.
                  </AppText>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {planOptions.map((plan) => {
                      const selected = selectedPlan === plan.code;
                      return (
                        <Pressable key={plan.code}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected, disabled: !!pendingPaid }}
                          disabled={!!pendingPaid}
                          onPress={() => setSelectedPlan(plan.code)}
                          className="flex-1 min-w-[115px] rounded-xl border p-3 items-end"
                          style={{
                            backgroundColor: selected ? '#FEF9C3' : isDark ? '#18181B' : '#F8FAFC',
                            borderColor: selected ? '#EAB308' : colors.border,
                          }}>
                          <AppText variant="label" className="font-tajawal-bold text-xs text-right"
                            style={{ color: selected ? '#0F172D' : colors.foreground }}>
                            {plan.name}
                          </AppText>
                          <AppText variant="caption" className="text-[11px] text-right"
                            style={{ color: selected ? '#334155' : colors.mutedForeground }}>
                            {plan.detail}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <View className="gap-1 mt-2">
                  <AppText variant="label" className="font-tajawal-bold text-xs text-right">
                    المرجع أو الحوالة (إن وجدت)
                  </AppText>
                  <TextInput
                    value={paymentRef}
                    onChangeText={setPaymentRef}
                    placeholder="رقم مرجع الإيداع أو الحوالة للمطابقة..."
                    placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
                    className="w-full rounded-xl p-3 border text-right text-sm"
                    style={{
                      backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                      borderColor: colors.border,
                      color: colors.foreground,
                    }}
                  />
                </View>
              </View>
            ) : null}

            {actionSuccess ? (
              <View className="p-3 rounded-xl bg-emerald-500/10 flex-row items-center gap-2">
                <CheckCircle2 size={16} color="#16A34A" />
                <AppText variant="caption" className="text-emerald-600 text-xs flex-1 text-right">
                  {actionSuccess}
                </AppText>
              </View>
            ) : null}

            {actionError ? (
              <View className="p-3 rounded-xl bg-rose-500/10 flex-row items-center gap-2">
                <AlertCircle size={16} color="#E11D48" />
                <AppText variant="caption" className="text-rose-600 text-xs flex-1 text-right">
                  {actionError}
                </AppText>
              </View>
            ) : null}

            <View className="flex-row items-center gap-3 pt-2">
              <View className="flex-1">
                <AppButton
                  title={submitting ? 'جارٍ المعالجة...' : !hasTrial ? 'بدء الفترة التجريبية' : 'إرسال الطلب'}
                  variant="primary"
                  size="lg"
                  disabled={submitting || (!isSyntheticPreview && !!hasTrial && (!planOptions.length || paymentAlreadySubmitted))}
                  onPress={handleExecuteAction}
                />
              </View>

              <View className="flex-1">
                <AppButton
                  title="إلغاء"
                  variant="secondary"
                  size="lg"
                  disabled={submitting}
                  onPress={() => setRequestModalOpen(false)}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </MerchantScaffold>
  );
}
