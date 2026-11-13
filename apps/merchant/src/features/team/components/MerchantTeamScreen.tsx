import React, { useState } from 'react';
import { View, Pressable, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import {
  useBusinessTeam,
  useSetEmployeeAccess,
  type BusinessTeamMember,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';

// Synthetic fallback team for dev preview matching reference
const PREVIEW_TEAM: BusinessTeamMember[] = [
  {
    id: 'member-sales-uuid',
    user_id: 'user_sales_rep',
    role: 'employee',
    status: 'active',
    can_draft: true,
    can_submit: true,
    can_monitor: true,
    can_pause: false,
    branch_ids: ['branch-tahrir-uuid'],
  },
  {
    id: 'member-former-uuid',
    user_id: 'user_former_rep',
    role: 'employee',
    status: 'revoked',
    can_draft: true,
    can_submit: false,
    can_monitor: false,
    can_pause: false,
    branch_ids: ['branch-tahrir-uuid'],
  },
];

export function MerchantTeamScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const {
    activeBusinessId,
    isOwner,
    isSyntheticPreview,
  } = useActiveBusiness();

  const { data: serverTeam = [], isLoading, error } = useBusinessTeam(activeBusinessId);
  const setAccessMutation = useSetEmployeeAccess();

  const team = isSyntheticPreview ? PREVIEW_TEAM : serverTeam;

  // Revocation modal state
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<BusinessTeamMember | null>(null);
  const [statusTab, setStatusTab] = useState<'active' | 'revoked'>('active');
  const [revoking, setRevoking] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const navParams = {
    ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    ...(isSyntheticPreview ? { preview: '1' } : {}),
  };

  const handleAddMember = () => {
    router.push({
      pathname: '/business/team/editor',
      params: { ...navParams, mode: 'new' },
    });
  };

  const handleEditMember = (userId: string) => {
    router.push({
      pathname: '/business/team/editor',
      params: { ...navParams, mode: 'edit', userId },
    });
  };

  const handleOpenRevoke = (member: BusinessTeamMember) => {
    setTargetMember(member);
    setRevokeSuccess(null);
    setRevokeError(null);
    setRevokeModalOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!targetMember || !activeBusinessId) return;
    setRevoking(true);
    setRevokeSuccess(null);
    setRevokeError(null);

    try {
      if (isSyntheticPreview) {
        setRevokeSuccess('تم إلغاء التفويض بنجاح (معاينة)');
        setTimeout(() => setRevokeModalOpen(false), 1200);
        return;
      }

      await setAccessMutation.mutateAsync({
        businessId: activeBusinessId,
        userId: targetMember.user_id,
        action: 'revoke',
      });

      setRevokeSuccess('تم إلغاء التفويض وإيقاف صلاحيات الموظف فورياً.');
      setTimeout(() => setRevokeModalOpen(false), 1400);
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : 'تعذر إلغاء التفويض.');
    } finally {
      setRevoking(false);
    }
  };

  const countPermissions = (m: BusinessTeamMember) => {
    let count = 0;
    if (m.can_draft) count++;
    if (m.can_submit) count++;
    if (m.can_monitor) count++;
    if (m.can_pause) count++;
    return count;
  };

  return (
    <MerchantScaffold
      currentTab="more"
      title="الموظفون المفوضون"
      subtitle="صلاحيات واضحة ومحددة للفرع والعمل."
    >
      <View className="gap-5 pb-10">
        {/* Section Header with Add/Authorize Button */}
        <View className="flex-row items-center justify-between">
          <View>
            <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
              الموظفون المفوضون
            </AppText>
            <AppText variant="caption" muted className="text-right">
              صلاحيات واضحة ومحددة للفرع والعمل.
            </AppText>
          </View>

          {isOwner ? (
            <AppButton
              title="تفويض"
              variant="primary"
              size="sm"
              onPress={handleAddMember}
            />
          ) : null}
        </View>

        {/* Warning Info Banner */}
        <View
          className="p-3.5 rounded-xl border border-border"
          style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
        >
          <AppText variant="caption" muted className="text-xs text-center leading-relaxed">
            التفويض لا ينقل ملكية النشاط أو التحكم بالاشتراك أو حق الرد الرسمي على الشكاوى.
          </AppText>
        </View>

        {/* Loading state */}
        {isLoading && !isSyntheticPreview ? (
          <View className="py-12 items-center justify-center gap-2">
            <ActivityIndicator size="small" color="#FACC15" />
            <AppText muted className="text-xs">جارٍ تحميل قائمة فريق العمل...</AppText>
          </View>
        ) : null}

        {/* Error state */}
        {error && !isSyntheticPreview ? (
          <View
            className="p-4 rounded-2xl border flex-row items-center gap-3"
            style={{ backgroundColor: isDark ? '#4C0519' : '#FFE4E6', borderColor: '#FDA4AF' }}
          >
            <AlertCircle size={20} color="#E11D48" />
            <AppText variant="caption" className="text-rose-700 dark:text-rose-300 flex-1 text-right">
              تعذر تحميل بيانات الفريق. يرجى التحقق من الاتصال والمحاولة لاحقاً.
            </AppText>
          </View>
        ) : null}

        {/* Empty state with Mascot */}
        {!isLoading && team.length === 0 ? (
          <View
            className="rounded-2xl border p-6 items-center justify-center gap-3.5 text-center"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Image
              source={wowIllustrations.merchant.mer11TeamMascot}
              alt="مساعد واو لفريق العمل"
              style={{ width: 90, height: 90 }}
              contentFit="contain"
            />
            <AppText variant="heading" className="font-tajawal-bold text-base text-center">
              لا يوجد موظفون مفوضون بعد
            </AppText>
            <AppText variant="body" muted className="text-xs text-center max-w-xs leading-relaxed">
              يمكنك تفويض موظفيك بمهام محددة كإعداد مسودات العروض أو إيقافها، مع تحديد الفروع المسموح بها.
            </AppText>
            {isOwner ? (
              <AppButton
                title="إضافة موظف مفوض"
                variant="primary"
                size="md"
                onPress={handleAddMember}
              />
            ) : null}
          </View>
        ) : null}

        {/* Team Members List (Matching Reference MER-11) */}
        {team.length > 0 ? (
          <View className="gap-2">
            <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
              أفراد الفريق
            </AppText>
            <View className="flex-row gap-2">
              {(['active', 'revoked'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: statusTab === tab }}
                  onPress={() => setStatusTab(tab)}
                  className="flex-1 rounded-xl border p-2.5 items-center"
                  style={{
                    borderColor: statusTab === tab ? '#EAB308' : colors.border,
                    backgroundColor: statusTab === tab ? (isDark ? '#422006' : '#FEF9C3') : colors.surface,
                  }}>
                  <AppText variant="caption" className="font-tajawal-bold">
                    {tab === 'active' ? 'النشطون' : 'السابقون'} ({team.filter((m) => m.status === tab).length})
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View
              className="rounded-2xl border p-4 gap-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              {team.filter((member) => member.status === statusTab).map((member, idx) => {
                const isActive = member.status === 'active';
                const branchCount = member.branch_ids?.length ?? 0;
                const permCount = countPermissions(member);
                // The owner-facing API does not currently supply verified display names.
                // Show a stable partial user ID rather than invent an employee name.
                const displayName = isSyntheticPreview
                  ? (member.status === 'active' ? 'موظف المبيعات' : 'موظف سابق')
                  : 'معرف الموظف • ' + member.user_id.slice(-8);

                return (
                  <View
                    key={member.id || member.user_id}
                    className={`gap-3 ${idx > 0 ? 'pt-4 border-t border-border' : ''}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View
                        className="rounded-md px-2.5 py-0.5"
                        style={{
                          backgroundColor: isActive
                            ? isDark
                              ? '#064E3B'
                              : '#DCFCE7'
                            : isDark
                            ? '#27272A'
                            : '#F1F5F9',
                        }}
                      >
                        <AppText
                          variant="caption"
                          className="font-tajawal-bold text-xs"
                          style={{ color: isActive ? '#16A34A' : isDark ? '#A1A1AA' : '#64748B' }}
                        >
                          {isActive ? 'فعال' : 'ملغى'}
                        </AppText>
                      </View>

                      <View className="items-end">
                        <AppText variant="label" className="font-tajawal-bold text-sm">
                          {displayName}
                        </AppText>
                        <AppText variant="caption" muted className="text-xs mt-0.5">
                          {branchCount} فرع • {permCount} صلاحيات تشغيلية
                        </AppText>
                      </View>
                    </View>

                    {/* Member action buttons */}
                    {isOwner ? (
                      <View className="flex-row items-center gap-2 pt-1">
                        {isActive ? (
                          <View className="flex-1">
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="إلغاء التفويض"
                              onPress={() => handleOpenRevoke(member)}
                              className="w-full py-2 rounded-xl items-center justify-center active:opacity-75"
                              style={{ backgroundColor: isDark ? '#4C0519' : '#FFE4E6' }}
                            >
                              <AppText
                                variant="caption"
                                className="font-tajawal-bold text-xs"
                                style={{ color: '#E11D48' }}
                              >
                                إلغاء التفويض
                              </AppText>
                            </Pressable>
                          </View>
                        ) : null}

                        <View className="flex-1">
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="التفويض"
                            onPress={() => handleEditMember(member.user_id)}
                            className="w-full py-2 rounded-xl items-center justify-center border border-border active:opacity-75"
                            style={{ backgroundColor: colors.surface }}
                          >
                            <AppText variant="caption" className="font-tajawal-bold text-xs">
                              التفويض
                            </AppText>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Work Guidelines Note */}
        <View className="gap-2">
          <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
            ضوابط العمل
          </AppText>

          <View
            className="rounded-2xl border p-4 gap-2"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <AppText variant="caption" muted className="text-xs text-right leading-relaxed">
              كل موظف له هوية مستقلة وسجل إجراءات قابل للمراجعة.
            </AppText>
            <AppText variant="caption" muted className="text-xs text-right leading-relaxed">
              الاشتراكات والتفويض والرد الرسمي على الشكاوى للمالك.
            </AppText>
          </View>
        </View>

        {/* Go to Account Bottom Action */}
        <View className="pt-2">
          <AppButton
            title="الحساب"
            variant="outline"
            size="lg"
            onPress={() => router.replace({ pathname: '/business/account', params: navParams })}
          />
        </View>
      </View>

      {/* Revocation Confirmation Modal */}
      <Modal visible={revokeModalOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/60 p-4">
          <View
            className="w-full max-w-sm self-center rounded-2xl border p-5 gap-3.5"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="items-center justify-center w-12 h-12 rounded-full self-center bg-rose-500/10">
              <ShieldAlert size={24} color="#E11D48" />
            </View>

            <AppText variant="heading" className="font-tajawal-bold text-base text-center">
              تأكيد إلغاء التفويض
            </AppText>

            <AppText variant="body" muted className="text-xs text-center leading-relaxed">
              سيتم سحب جميع الصلاحيات التشغيلية عن الموظف فورياً، ولن يتمكن من الدخول أو تعديل العروض.
            </AppText>

            {revokeSuccess ? (
              <View className="p-3 rounded-xl bg-emerald-500/10 flex-row items-center gap-2">
                <CheckCircle2 size={16} color="#16A34A" />
                <AppText variant="caption" className="text-emerald-600 text-xs flex-1 text-right">
                  {revokeSuccess}
                </AppText>
              </View>
            ) : null}

            {revokeError ? (
              <View className="p-3 rounded-xl bg-rose-500/10 flex-row items-center gap-2">
                <AlertCircle size={16} color="#E11D48" />
                <AppText variant="caption" className="text-rose-600 text-xs flex-1 text-right">
                  {revokeError}
                </AppText>
              </View>
            ) : null}

            <View className="flex-row items-center gap-2.5 pt-2">
              <View className="flex-1">
                <AppButton
                  title={revoking ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
                  variant="danger"
                  size="md"
                  disabled={revoking}
                  onPress={handleConfirmRevoke}
                />
              </View>

              <View className="flex-1">
                <AppButton
                  title="تراجع"
                  variant="secondary"
                  size="md"
                  disabled={revoking}
                  onPress={() => setRevokeModalOpen(false)}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </MerchantScaffold>
  );
}
