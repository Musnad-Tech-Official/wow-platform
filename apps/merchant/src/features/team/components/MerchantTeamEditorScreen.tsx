import React, { useState } from 'react';
import { View, TextInput, Pressable, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Check, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import {
  useBusinessTeam,
  useBusinessBranches,
  useSetEmployeeAccess,
  type BusinessTeamMember,
  type Branch,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';

interface TeamFormProps {
  initialMember?: BusinessTeamMember;
  isEditMode: boolean;
  businessId: string;
  isSyntheticPreview: boolean;
  availableBranches: (Branch | { id: string; name: string; status: string })[];
  onBack: () => void;
}

function TeamEditorForm({
  initialMember,
  isEditMode,
  businessId,
  isSyntheticPreview,
  availableBranches,
  onBack,
}: TeamFormProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const setAccessMutation = useSetEmployeeAccess();

  // Form State initialized from initialMember
  const [employeeIdentifier, setEmployeeIdentifier] = useState(
    initialMember?.user_id || (isSyntheticPreview ? 'موظف جديد' : '')
  );
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(
    initialMember?.branch_ids || (isSyntheticPreview ? ['branch-tahrir-uuid'] : [])
  );
  const [canDraft, setCanDraft] = useState(initialMember ? initialMember.can_draft : true);
  const [canSubmit, setCanSubmit] = useState(initialMember ? initialMember.can_submit : false);
  const [canMonitor, setCanMonitor] = useState(initialMember ? initialMember.can_monitor : true);
  const [canPause, setCanPause] = useState(initialMember ? initialMember.can_pause : false);
  const [confirmedScope, setConfirmedScope] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const isDirty = employeeIdentifier !== (initialMember?.user_id || (isSyntheticPreview ? 'موظف جديد' : ''))
    || [...selectedBranchIds].sort().join(',') !== [...(initialMember?.branch_ids || (isSyntheticPreview ? ['branch-tahrir-uuid'] : []))].sort().join(',')
    || canDraft !== (initialMember ? initialMember.can_draft : true)
    || canSubmit !== (initialMember ? initialMember.can_submit : false)
    || canMonitor !== (initialMember ? initialMember.can_monitor : true)
    || canPause !== (initialMember ? initialMember.can_pause : false);
  const handleCancel = () => {
    if (saving) return;
    if (isDirty) setConfirmCancelOpen(true);
    else onBack();
  };

  const toggleBranch = (bId: string) => {
    if (selectedBranchIds.includes(bId)) {
      setSelectedBranchIds(selectedBranchIds.filter((id) => id !== bId));
    } else {
      setSelectedBranchIds([...selectedBranchIds, bId]);
    }
  };

  const permCount = (canDraft ? 1 : 0) + (canSubmit ? 1 : 0) + (canMonitor ? 1 : 0) + (canPause ? 1 : 0);
  const branchCount = selectedBranchIds.length;

  const handleSave = async () => {
    if (saving) return;
    if (isEditMode && (!initialMember || employeeIdentifier.trim() !== initialMember.user_id)) {
      setFormError('لا يمكن تغيير هوية الموظف عند تعديل التفويض.');
      return;
    }
    if (!employeeIdentifier.trim()) {
      setFormError('يرجى تحديد هوية الموظف.');
      return;
    }
    if (!isSyntheticPreview && !/^user_[A-Za-z0-9]+$/.test(employeeIdentifier.trim())) {
      setFormError('أدخل معرّف مستخدم Clerk مسجّلًا ومزامنًا، وليس الاسم أو البريد.');
      return;
    }
    if (selectedBranchIds.some((id) => !availableBranches.some((branch) => branch.id === id && branch.status === 'approved'))) {
      setFormError('يمكن تفويض الفروع المؤهلة فقط. أزل الفروع غير المؤهلة من التحديد.');
      return;
    }
    if (selectedBranchIds.length === 0) {
      setFormError('يرجى تحديد فرع واحد على الأقل.');
      return;
    }
    if (permCount === 0) {
      setFormError('يرجى اختيار صلاحية تشغيلية واحدة على الأقل.');
      return;
    }
    if (!confirmedScope) {
      setFormError('يرجى تأكيد مراجعة نطاق الفروع والمهام المسموح بها.');
      return;
    }
    if (!businessId) {
      setFormError('لم يتم تحديد النشاط التجاري.');
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    setSaving(true);

    try {
      if (isSyntheticPreview) {
        setFormSuccess('تم حفظ التفويض بنجاح (معاينة)');
        setTimeout(() => onBack(), 1000);
        return;
      }

      await setAccessMutation.mutateAsync({
        businessId,
        userId: employeeIdentifier.trim(),
        action: isEditMode ? 'update' : 'grant',
        permissions: {
          can_draft: canDraft,
          can_submit: canSubmit,
          can_monitor: canMonitor,
          can_pause: canPause,
        },
        branchIds: selectedBranchIds,
      });

      setFormSuccess('تم حفظ التفويض واعتماد الصلاحيات بنجاح.');
      setTimeout(() => onBack(), 1200);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'تعذر حفظ التفويض.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-5 pb-10">
      {/* Banner with Mascot (Matching Reference MER-11-01) */}
      <View
        className="rounded-2xl border p-4 flex-row items-center justify-between"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <View className="flex-1 items-end pr-2">
          <AppText variant="caption" muted className="text-[11px] font-tajawal-bold text-right">
            WOW · FOR BUSINESS
          </AppText>
          <AppText variant="heading" className="font-tajawal-bold text-base text-right mt-0.5">
            صلاحيات مناسبة لكل موظف
          </AppText>
          <AppText variant="body" muted className="text-xs text-right mt-1 leading-relaxed">
            كل تفويض ينطبق على مهام وفروع محددة، ولا ينقل ملكية النشاط.
          </AppText>
        </View>

        <Image
          source={wowIllustrations.merchant.mer1101TeamEditorMascot}
          alt="مساعد واو لصلاحيات الموظف"
          style={{ width: 80, height: 80 }}
          contentFit="contain"
        />
      </View>

      {/* Section 1: Authorized Employee Identity */}
      <View className="gap-2">
        <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
          الموظف المخوّل
        </AppText>

        <View
          className="rounded-2xl border p-4 gap-3.5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <View className="gap-1.5">
            <AppText variant="label" className="font-tajawal-bold text-xs text-right">
              الموظف *
            </AppText>
            <TextInput
              value={employeeIdentifier}
              onChangeText={setEmployeeIdentifier}
              editable={!isEditMode}
              placeholder="معرّف المستخدم المسجل (user_...)"
              placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
              className="w-full rounded-xl p-3 border text-right text-sm"
              style={{
                backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                borderColor: colors.border,
                color: colors.foreground,
              }}
            />
          </View>

          <View
            className="p-3 rounded-xl border border-border"
            style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
          >
            <AppText variant="caption" muted className="text-xs text-center leading-relaxed">
              يلزم وجود حساب موظف مستقل مسجّل بالفعل؛ لا تنشئ هذه الصفحة حسابًا جديدًا.
            </AppText>
          </View>
        </View>
      </View>

      {/* Section 2: Permitted Branches */}
      <View className="gap-2">
        <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
          الفروع المسموح بها
        </AppText>

        <View
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          {availableBranches.map((branch, idx) => {
            const isSelected = selectedBranchIds.includes(branch.id);
            const isLast = idx === availableBranches.length - 1;
            return (
              <Pressable
                key={branch.id}
                accessibilityRole="checkbox"
                accessibilityLabel={branch.name}
                accessibilityState={{ checked: isSelected, disabled: !isSelected && branch.status !== 'approved' }}
                disabled={!isSelected && branch.status !== 'approved'}
                onPress={() => toggleBranch(branch.id)}
                className={`flex-row items-center justify-between p-4 active:opacity-75 ${
                  !isLast ? 'border-b border-border' : ''
                }`}
              >
                <View
                  className="w-6 h-6 rounded-md items-center justify-center border"
                  style={{
                    backgroundColor: isSelected ? '#FACC15' : 'transparent',
                    borderColor: isSelected ? '#EAB308' : colors.border,
                  }}
                >
                  {isSelected ? <Check size={16} color="#0F172D" strokeWidth={3} /> : null}
                </View>

                <View className="items-end">
                  <AppText variant="label" className="font-tajawal-bold text-sm text-right">
                    {branch.name}
                  </AppText>
                  <AppText variant="caption" muted className="text-xs text-right mt-0.5">
                    {branch.status === 'approved' ? 'فرع مؤهل' : 'قيد التأهيل'}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Section 3: Allowed Offer Operations (4 Approved Flags) */}
      <View className="gap-2">
        <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
          مهام العروض المسموحة
        </AppText>

        <View
          className="rounded-2xl border p-4 gap-3.5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          {/* Flag 1: can_draft */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="إعداد مسودات"
            accessibilityState={{ checked: canDraft }}
            onPress={() => setCanDraft(!canDraft)}
            className="flex-row items-center justify-between py-1 active:opacity-75"
          >
            <View
              className="w-6 h-6 rounded-md items-center justify-center border"
              style={{
                backgroundColor: canDraft ? '#FACC15' : 'transparent',
                borderColor: canDraft ? '#EAB308' : colors.border,
              }}
            >
              {canDraft ? <Check size={16} color="#0F172D" strokeWidth={3} /> : null}
            </View>

            <AppText variant="label" className="font-tajawal-bold text-sm text-right">
              إعداد مسودات
            </AppText>
          </Pressable>

          {/* Flag 2: can_submit */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="إرسال عروض للمراجعة"
            accessibilityState={{ checked: canSubmit }}
            onPress={() => setCanSubmit(!canSubmit)}
            className="flex-row items-center justify-between py-1 active:opacity-75"
          >
            <View
              className="w-6 h-6 rounded-md items-center justify-center border"
              style={{
                backgroundColor: canSubmit ? '#FACC15' : 'transparent',
                borderColor: canSubmit ? '#EAB308' : colors.border,
              }}
            >
              {canSubmit ? <Check size={16} color="#0F172D" strokeWidth={3} /> : null}
            </View>

            <AppText variant="label" className="font-tajawal-bold text-sm text-right">
              إرسال عروض للمراجعة
            </AppText>
          </Pressable>

          {/* Flag 3: can_monitor */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="متابعة المراجعة"
            accessibilityState={{ checked: canMonitor }}
            onPress={() => setCanMonitor(!canMonitor)}
            className="flex-row items-center justify-between py-1 active:opacity-75"
          >
            <View
              className="w-6 h-6 rounded-md items-center justify-center border"
              style={{
                backgroundColor: canMonitor ? '#FACC15' : 'transparent',
                borderColor: canMonitor ? '#EAB308' : colors.border,
              }}
            >
              {canMonitor ? <Check size={16} color="#0F172D" strokeWidth={3} /> : null}
            </View>

            <AppText variant="label" className="font-tajawal-bold text-sm text-right">
              متابعة المراجعة
            </AppText>
          </Pressable>

          {/* Flag 4: can_pause */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="إيقاف العروض غير المتاحة"
            accessibilityState={{ checked: canPause }}
            onPress={() => setCanPause(!canPause)}
            className="flex-row items-center justify-between py-1 active:opacity-75"
          >
            <View
              className="w-6 h-6 rounded-md items-center justify-center border"
              style={{
                backgroundColor: canPause ? '#FACC15' : 'transparent',
                borderColor: canPause ? '#EAB308' : colors.border,
              }}
            >
              {canPause ? <Check size={16} color="#0F172D" strokeWidth={3} /> : null}
            </View>

            <AppText variant="label" className="font-tajawal-bold text-sm text-right">
              إيقاف العروض غير المتاحة
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Section 4: Scope Confirmation */}
      <View className="gap-2">
        <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
          تأكيد النطاق
        </AppText>

        <View
          className="rounded-2xl border p-4 gap-3.5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <AppText variant="caption" muted className="text-xs text-right">
            {branchCount} فرع مؤهل • {permCount} صلاحيات تشغيلية
          </AppText>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="راجعت نطاق الفروع والمهام المسموح بها"
            accessibilityState={{ checked: confirmedScope }}
            onPress={() => setConfirmedScope(!confirmedScope)}
            className="flex-row items-center justify-between pt-2 border-t border-border active:opacity-75"
          >
            <View
              className="w-6 h-6 rounded-md items-center justify-center border"
              style={{
                backgroundColor: confirmedScope ? '#FACC15' : 'transparent',
                borderColor: confirmedScope ? '#EAB308' : colors.border,
              }}
            >
              {confirmedScope ? <Check size={16} color="#0F172D" strokeWidth={3} /> : null}
            </View>

            <AppText variant="label" className="font-tajawal-bold text-sm text-right">
              راجعت نطاق الفروع والمهام المسموح بها
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Success / Error Messages */}
      {formSuccess ? (
        <View className="p-3 rounded-xl bg-emerald-500/10 flex-row items-center gap-2">
          <CheckCircle2 size={16} color="#16A34A" />
          <AppText variant="caption" className="text-emerald-600 text-xs flex-1 text-right">
            {formSuccess}
          </AppText>
        </View>
      ) : null}

      {formError ? (
        <View className="p-3 rounded-xl bg-rose-500/10 flex-row items-center gap-2">
          <AlertCircle size={16} color="#E11D48" />
          <AppText variant="caption" className="text-rose-600 text-xs flex-1 text-right">
            {formError}
          </AppText>
        </View>
      ) : null}

      {/* Bottom Actions */}
      <View className="flex-row items-center gap-3 pt-2">
        <View className="flex-1">
          <AppButton
            title={saving ? 'جارٍ الحفظ...' : 'حفظ التفويض'}
            variant="primary"
            size="lg"
            disabled={saving}
            onPress={handleSave}
          />
        </View>

        <View className="flex-1">
          <AppButton
            title="إلغاء"
            variant="secondary"
            size="lg"
            disabled={saving}
            onPress={handleCancel}
          />
        </View>
      </View>
      <Modal transparent animationType="fade" visible={confirmCancelOpen}
        onRequestClose={() => setConfirmCancelOpen(false)}>
        <View className="flex-1 justify-center bg-black/50 p-5">
          <View className="rounded-2xl border p-5 gap-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <AppText variant="heading" className="text-right">إلغاء تعديل الصلاحيات؟</AppText>
            <AppText muted className="text-right">ستفقد التعديلات غير المحفوظة على الفروع والصلاحيات.</AppText>
            <AppButton title="متابعة التحرير" variant="outline"
              onPress={() => setConfirmCancelOpen(false)} />
            <AppButton title="مغادرة دون حفظ" variant="secondary"
              onPress={() => { setConfirmCancelOpen(false); onBack(); }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function MerchantTeamEditorScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    userId?: string;
    businessId?: string;
    preview?: string;
  }>();

  const isEditMode = params.mode === 'edit' || Boolean(params.userId);
  const targetUserId = params.userId;

  const {
    activeBusinessId,
    isSyntheticPreview,
    isOwner,
  } = useActiveBusiness();

  const { data: team = [], isLoading: teamLoading, error: teamError, refetch: refetchTeam } = useBusinessTeam(isOwner ? activeBusinessId : null);
  const { data: branches = [] } = useBusinessBranches(activeBusinessId);

  // Find target member if editing
  const currentMember: BusinessTeamMember | undefined = team.find((m) => m.user_id === targetUserId) || (
    isSyntheticPreview && isEditMode
      ? {
          id: 'member-edit-preview',
          user_id: targetUserId || 'user_sales_rep',
          role: 'employee',
          status: 'active',
          can_draft: true,
          can_submit: false,
          can_monitor: true,
          can_pause: false,
          branch_ids: ['branch-tahrir-uuid'],
        }
      : undefined
  );

  const availableBranches = isSyntheticPreview
    ? [
        { id: 'branch-tahrir-uuid', name: 'فرع التحرير', status: 'approved' },
        { id: 'branch-seina-uuid', name: 'فرع صينة', status: 'under_review' },
      ]
    : branches;

  const handleBack = () => {
    router.replace({
      pathname: '/business/team',
      params: {
        ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  return (
    <MerchantScaffold
      currentTab="more"
      title={isEditMode ? "تعديل صلاحيات الموظف" : "إضافة موظف مفوض"}
      subtitle="تحديد الفروع والصلاحيات المصرحة للموظف"
      showBusinessSelector={false}
    >
      {!isOwner || (isEditMode && !isSyntheticPreview &&
          (!currentMember || currentMember.status !== 'active')) ? (
        <View className="rounded-2xl border border-border p-5 gap-3">
          <AppText variant="heading" className="text-right">
            {!isOwner ? 'إدارة التفويض خاصة بمالك النشاط' :
              teamLoading ? 'جارٍ تحميل الموظف...' :
              teamError ? 'تعذر تحميل الصلاحيات' : 'الموظف غير متاح للتعديل'}
          </AppText>
          <AppText muted className="text-right">
            لا يمكن تعديل تفويض لموظف غير موجود أو لم يعد نشطًا في هذا النشاط.
          </AppText>
          {teamError && isOwner ? <AppButton title="إعادة المحاولة" onPress={() => void refetchTeam()} /> : null}
          <AppButton title="العودة للموظفين" variant="outline" onPress={handleBack} />
        </View>
      ) : <TeamEditorForm
        key={(activeBusinessId || 'no-business') + ':' + (currentMember?.user_id || 'new-member')}
        initialMember={currentMember}
        isEditMode={isEditMode}
        businessId={activeBusinessId || ''}
        isSyntheticPreview={isSyntheticPreview}
        availableBranches={availableBranches}
        onBack={handleBack}
      />}
    </MerchantScaffold>
  );
}
