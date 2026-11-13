import React, { useEffect, useState } from 'react';
import { View, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  Store,
  ChevronLeft,
  MapPin,
  CreditCard,
  Users,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import { useAuth } from '@wow/auth';
import {
  useBusinessBranches,
  useBusinessBilling,
  useBusinessTeam,
  useMyProfileRevisions,
  useSubmitProfileRevision,
  useUploadWowMedia,
  useBusinessMediaSignedUrl,
  type MerchantProfileRevision,
} from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';
import { ProfileMediaPicker, type ProfileImageSelection } from './ProfileMediaPicker';

export function MerchantAccountScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { signOut } = useAuth();

  const {
    activeBusiness,
    activeBusinessId,
    isOwner,
    isSyntheticPreview,
  } = useActiveBusiness();

  // Scoped queries
  const { data: branches = [] } = useBusinessBranches(activeBusinessId);
  const { data: billing } = useBusinessBilling(isOwner ? activeBusinessId : null);
  const { data: team = [] } = useBusinessTeam(isOwner ? activeBusinessId : null);
  const { data: revisions = [] } = useMyProfileRevisions(isOwner ? activeBusinessId : null);
  const submitRevisionMutation = useSubmitProfileRevision();
  const mediaUploadMutation = useUploadWowMedia();
  const { data: approvedLogoUrl } = useBusinessMediaSignedUrl(activeBusiness?.logo_url);
  const { data: approvedCoverUrl } = useBusinessMediaSignedUrl(activeBusiness?.cover_url);

  // Synthetic fallbacks for preview mode
  const effectiveBranchCount = isSyntheticPreview ? 2 : branches.length;
  const effectiveTeamCount = isSyntheticPreview ? 2 : team.filter((m) => m.status === 'active').length;
  const effectiveBillingStatus = isSyntheticPreview ? 'تجربة نشطة' : (billing?.has_publication_entitlement ? 'مؤهل للنشر' : 'غير مفعل');

  // Pending revision check
  const latestRevision: MerchantProfileRevision | undefined = revisions[0];
  const hasPendingRevision = latestRevision?.status === 'submitted';

  // State for administrative requests collapse
  const [adminRequestsOpen, setAdminRequestsOpen] = useState(false);

  // Edit profile modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [draftDesc, setDraftDesc] = useState(activeBusiness?.description || '');
  const [draftPhone, setDraftPhone] = useState(activeBusiness?.contact_phone || '');
  const [draftLogo, setDraftLogo] = useState<ProfileImageSelection | null>(null);
  const [draftCover, setDraftCover] = useState<ProfileImageSelection | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submittingRev, setSubmittingRev] = useState(false);
  const [revSuccessMsg, setRevSuccessMsg] = useState<string | null>(null);
  const [revErrorMsg, setRevErrorMsg] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Switching the selected business invalidates pending visual/upload drafts.
  // Never carry a logo, cover, contact number or revision text across businesses.
  useEffect(() => {
    setEditModalOpen(false);
    setPreviewModalOpen(false);
    setDraftDesc('');
    setDraftPhone('');
    setDraftLogo(null);
    setDraftCover(null);
    setRevErrorMsg(null);
    setRevSuccessMsg(null);
  }, [activeBusinessId]);

  const navParams = {
    ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    ...(isSyntheticPreview ? { preview: '1' } : {}),
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSignOutError(null);
    if (isSyntheticPreview) {
      setSignOutError('لا توجد جلسة فعلية لتسجيل الخروج في وضع المعاينة.');
      return;
    }
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSignOutError('تعذر تسجيل الخروج. تحقق من الاتصال وحاول مجددًا.');
    } finally {
      setSigningOut(false);
    }
  };

  const handleOpenEdit = () => {
    setDraftDesc(activeBusiness?.description || '');
    setDraftPhone(activeBusiness?.contact_phone || '');
    setDraftLogo(null);
    setDraftCover(null);
    setRevSuccessMsg(null);
    setRevErrorMsg(null);
    setEditModalOpen(true);
  };

  const handleSubmitRevision = async () => {
    if (!activeBusinessId) return;
    setSubmittingRev(true);
    setRevSuccessMsg(null);
    setRevErrorMsg(null);
    try {
      if (isSyntheticPreview) {
        setRevSuccessMsg('تم تقديم مقترح التعديل بنجاح للمراجعة الإدارية (معاينة)');
        setTimeout(() => setEditModalOpen(false), 1200);
        return;
      }
      const patch: {
        description: string | null;
        contact_phone: string | null;
        logo_url?: string;
        cover_url?: string;
      } = { description: draftDesc.trim() || null, contact_phone: draftPhone.trim() || null };
      for (const [kind, selected] of [['logo', draftLogo], ['cover', draftCover]] as const) {
        if (!selected) continue;
        let key = selected.uploadedKey;
        if (!key) {
          setUploadingMedia(true);
          const uploaded = await mediaUploadMutation.mutateAsync({
            scope: { kind: 'business', businessId: activeBusinessId },
            bytes: selected.bytes,
            contentType: selected.mimeType,
          });
          key = uploaded.key;
          const persist = (previous: ProfileImageSelection | null) =>
            previous ? { ...previous, uploadedKey: uploaded.key } : previous;
          if (kind === 'logo') setDraftLogo(persist);
          else setDraftCover(persist);
        }
        if (kind === 'logo') patch.logo_url = key;
        else patch.cover_url = key;
      }
      setUploadingMedia(false);
      await submitRevisionMutation.mutateAsync({ businessId: activeBusinessId, patch });
      setRevSuccessMsg('تم تقديم مقترح التعديل بنجاح، وستظل النسخة المعتمدة ظاهرة حتى الموافقة.');
      setTimeout(() => setEditModalOpen(false), 1500);
    } catch (err: unknown) {
      setRevErrorMsg(err instanceof Error ? err.message : 'تعذر تقديم طلب التعديل.');
    } finally {
      setUploadingMedia(false);
      setSubmittingRev(false);
    }
  };

  return (
    <MerchantScaffold
      currentTab="more"
      title="حساب النشاط"
      subtitle="إدارة الحساب المصرح والملف العام والصلاحيات"
    >
      <View className="gap-5 pb-8">
        {/* 1. Compact Active Business Selection Card */}
        <View
          className="rounded-2xl border p-4 gap-3.5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: isDark ? '#1E293B' : '#FEF9C3' }}
              >
                {approvedLogoUrl ? (
                <Image source={{ uri: approvedLogoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : <Store size={22} color="#FACC15" />}
              </View>
              <View>
                <AppText variant="heading" className="font-tajawal-bold text-base text-right">
                  {activeBusiness?.name || 'نشاط تجاري غير محدد'}
                </AppText>
                <AppText variant="caption" muted className="text-right">
                  {activeBusiness?.requested_category_id ? 'إلكترونيات وأجهزة' : 'نشاط تجاري معتمد'}
                </AppText>
              </View>
            </View>

            <View
              className="rounded-full px-3 py-1"
              style={{
                backgroundColor:
                  activeBusiness?.status === 'approved'
                    ? isDark
                      ? '#064E3B'
                      : '#DCFCE7'
                    : isDark
                    ? '#451A03'
                    : '#FEF3C7',
              }}
            >
              <AppText
                variant="caption"
                className="font-tajawal-bold text-xs"
                style={{
                  color:
                    activeBusiness?.status === 'approved'
                      ? '#16A34A'
                      : '#D97706',
                }}
              >
                {activeBusiness?.status === 'approved' ? 'مؤهل' : 'قيد المراجعة'}
              </AppText>
            </View>
          </View>

          {/* Add Independent Business Distinct Action */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إضافة نشاط تجاري مستقل"
            onPress={() => router.push({ pathname: '/business/onboarding', params: navParams })}
            className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border active:opacity-75"
            style={{ backgroundColor: isDark ? '#18181B' : '#FAFAFA' }}
          >
            <Plus size={16} color={colors.foreground} />
            <AppText variant="caption" className="font-tajawal-bold text-xs">
              إضافة نشاط تجاري مستقل (يخضع لتأهيل واشتراك خاصين)
            </AppText>
          </Pressable>
        </View>

        {/* 2. Public Profile Management Card with Mascot Helper */}
        <View
          className="rounded-2xl border p-4 gap-4"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <View className="flex-row items-center justify-between">
            <AppText variant="heading" className="font-tajawal-bold text-base text-right">
              الملف العام للنشاط
            </AppText>

            {hasPendingRevision ? (
              <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10">
                <Clock size={13} color="#D97706" />
                <AppText variant="caption" className="text-amber-600 font-tajawal-bold text-[11px]">
                  مقترح تعديل قيد المراجعة
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Compact Cover & Logo Preview */}
          <View className="rounded-xl overflow-hidden border border-border" style={{ height: 110, backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }}>
            <View className="w-full h-full items-center justify-center">
              {approvedCoverUrl ? (
                <Image source={{ uri: approvedCoverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : <Building2 size={32} color={isDark ? '#64748B' : '#94A3B8'} />}
            </View>
            {/* Logo thumbnail overlay */}
            <View
              className="absolute bottom-2 right-3 w-12 h-12 rounded-xl border-2 border-surface items-center justify-center overflow-hidden"
              style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}
            >
              <Store size={22} color="#FACC15" />
            </View>
          </View>

          {/* Approved Description */}
          <View className="gap-1">
            <AppText variant="label" className="font-tajawal-bold text-xs text-right">
              وصف النشاط العام المعتمد:
            </AppText>
            <AppText variant="body" muted className="text-xs text-right leading-relaxed">
              {activeBusiness?.description || 'منتجات وخدمات مختارة مع معلومات واضحة عن العروض.'}
            </AppText>
          </View>

          {/* Mascot Info Tile */}
          <View
            className="flex-row items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC', borderWidth: 1, borderColor: colors.border }}
          >
            <Image
              source={wowIllustrations.merchant.mer12AccountMascot}
              alt="مساعد واو لحساب النشاط"
              style={{ width: 44, height: 44 }}
              contentFit="contain"
            />
            <View className="flex-1">
              <AppText variant="caption" className="text-xs text-right font-tajawal-bold">
                تعديلات الملف العام تخضع للمراجعة الإدارية
              </AppText>
              <AppText variant="caption" muted className="text-[11px] text-right">
                تبقى بياناتك الحالية منشورة للعملاء حتى اعتماد المقترح الجديد رسمياً.
              </AppText>
            </View>
          </View>

          {/* Profile Action Buttons */}
          <View className="flex-row items-center gap-2.5">
            <View className="flex-1">
              <AppButton
                title="طلب تعديل الملف"
                variant="primary"
                size="md"
                onPress={handleOpenEdit}
                disabled={!isOwner}
              />
            </View>
            <View className="flex-1">
              <AppButton
                title="معاينة الملف"
                variant="secondary"
                size="md"
                onPress={() => setPreviewModalOpen(true)}
              />
            </View>
          </View>
        </View>

        {/* 3. Business Management Rows (Three Equal Rows) */}
        <View className="gap-2.5">
          <AppText variant="heading" className="font-tajawal-bold text-base text-right px-1">
            إدارة النشاط
          </AppText>

          {/* Row 1: Branches */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الفروع"
            onPress={() => router.push({ pathname: '/business/branches', params: navParams })}
            className="flex-row items-center justify-between p-4 rounded-2xl border active:opacity-75"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <ChevronLeft size={18} color={isDark ? '#A1A1AA' : '#64748B'} />

            <View className="flex-row items-center gap-3">
              <View className="items-end">
                <AppText variant="label" className="font-tajawal-bold text-sm">
                  الفروع
                </AppText>
                <AppText variant="caption" muted className="text-xs">
                  {effectiveBranchCount > 0 ? `${effectiveBranchCount} فروع مسجلة` : 'المواقع وحالات التأهيل'}
                </AppText>
              </View>

              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: isDark ? '#1E293B' : '#FEF3C7' }}
              >
                <MapPin size={20} color="#D97706" />
              </View>
            </View>
          </Pressable>

          {/* Row 2: Subscriptions & Entitlements */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الاشتراكات والاستحقاقات"
            accessibilityState={{ disabled: !isOwner }}
            disabled={!isOwner}
            onPress={() => router.push({ pathname: '/business/subscription', params: navParams })}
            className="flex-row items-center justify-between p-4 rounded-2xl border active:opacity-75"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <ChevronLeft size={18} color={isDark ? '#A1A1AA' : '#64748B'} />

            <View className="flex-row items-center gap-3">
              <View className="items-end">
                <AppText variant="label" className="font-tajawal-bold text-sm">
                  الاشتراكات والاستحقاقات
                </AppText>
                <AppText variant="caption" muted className="text-xs">
                  {isOwner ? effectiveBillingStatus : 'للمالك فقط'}
                </AppText>
              </View>

              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: isDark ? '#1E293B' : '#E0E7FF' }}
              >
                <CreditCard size={20} color="#4F46E5" />
              </View>
            </View>
          </Pressable>

          {/* Row 3: Employees & Permissions */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الموظفون والصلاحيات"
            accessibilityState={{ disabled: !isOwner }}
            disabled={!isOwner}
            onPress={() => router.push({ pathname: '/business/team', params: navParams })}
            className="flex-row items-center justify-between p-4 rounded-2xl border active:opacity-75"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <ChevronLeft size={18} color={isDark ? '#A1A1AA' : '#64748B'} />

            <View className="flex-row items-center gap-3">
              <View className="items-end">
                <AppText variant="label" className="font-tajawal-bold text-sm">
                  الموظفون والصلاحيات
                </AppText>
                <AppText variant="caption" muted className="text-xs">
                  {isOwner ? (effectiveTeamCount > 0 ? `${effectiveTeamCount} أعضاء مصرحون` : 'إدارة التفويض بحسب الفرع') : 'للمالك فقط'}
                </AppText>
              </View>

              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: isDark ? '#1E293B' : '#DCFCE7' }}
              >
                <Users size={20} color="#16A34A" />
              </View>
            </View>
          </Pressable>
        </View>

        {/* 4. Administrative Requests (Collapsible Section) */}
        <View
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الطلبات الإدارية"
            onPress={() => setAdminRequestsOpen(!adminRequestsOpen)}
            className="flex-row items-center justify-between p-4"
          >
            {adminRequestsOpen ? (
              <ChevronUp size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
            ) : (
              <ChevronDown size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
            )}

            <View className="flex-row items-center gap-2.5">
              <AppText variant="label" className="font-tajawal-bold text-sm">
                الطلبات الإدارية (توسيع أو نقل ملكية)
              </AppText>
              <ShieldCheck size={18} color="#D97706" />
            </View>
          </Pressable>

          {adminRequestsOpen ? (
            <View className="p-4 pt-0 gap-3 border-t border-border">
              <View
                className="p-3 rounded-xl gap-1.5"
                style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
              >
                <AppText variant="label" className="font-tajawal-bold text-xs text-right">
                  توسيع النشاط المعتمد
                </AppText>
                <AppText variant="caption" muted className="text-xs text-right leading-relaxed">
                  إضافة تصنيفات رئيسية أو تغيير طبيعة النشاط يتطلب تقديم إثباتات تجارية جديدة عبر القنوات الإدارية المعتمدة.
                </AppText>
              </View>

              <View
                className="p-3 rounded-xl gap-1.5"
                style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
              >
                <AppText variant="label" className="font-tajawal-bold text-xs text-right">
                  تغيير المالك أو الممثل
                </AppText>
                <AppText variant="caption" muted className="text-xs text-right leading-relaxed">
                  نقل ملكية النشاط التجاري إجراء إداري موثق يتم عبر إدارة منصة واو ولا يمكن تفويضه أو إتمامه من داخل الحساب.
                </AppText>
              </View>
            </View>
          ) : null}
        </View>

        {/* 5. Sign Out Button */}
        <View className="pt-2 gap-2">
          {signOutError ? (
            <AppText variant="caption" tone="danger" className="text-xs text-right">{signOutError}</AppText>
          ) : null}
          <AppButton
            title={signingOut ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
            variant="outline"
            size="lg"
            disabled={signingOut}
            onPress={handleSignOut}
          />
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={editModalOpen} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="w-full max-w-lg self-center rounded-t-3xl border-t p-5 gap-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '88%' }}
          >
            <View className="flex-row items-center justify-between pb-2 border-b border-border">
              <AppText variant="heading" className="font-tajawal-bold text-base">
                طلب تعديل بيانات الملف
              </AppText>
              <Pressable onPress={() => setEditModalOpen(false)} className="p-1">
                <XCircle size={20} color={isDark ? '#A1A1AA' : '#64748B'} />
              </Pressable>
            </View>

            <AppText variant="caption" muted className="text-xs text-right">
              التعديلات المقترحة ستخضع لمراجعة إدارة المنصة ولن تُنشر للجمهور مباشرة.
            </AppText>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
            <View className="gap-2">
              <AppText variant="label" className="font-tajawal-bold text-xs text-right">
                الوصف العام للنشاط
              </AppText>
              <TextInput
                value={draftDesc}
                onChangeText={setDraftDesc}
                multiline
                numberOfLines={3}
                placeholder="اكتب وصفاً موجزاً لنشاطك التجاري..."
                placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
                className="w-full rounded-xl p-3 border text-right text-sm"
                style={{
                  backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.foreground,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View className="gap-2">
              <AppText variant="label" className="font-tajawal-bold text-xs text-right">
                رقم التواصل التشغيلي
              </AppText>
              <TextInput
                value={draftPhone}
                onChangeText={setDraftPhone}
                placeholder="05xxxxxxxx أو +966..."
                placeholderTextColor={isDark ? '#71717A' : '#A1A1AA'}
                keyboardType="phone-pad"
                className="w-full rounded-xl p-3 border text-right text-sm"
                style={{
                  backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.foreground,
                }}
              />
            </View>

            <ProfileMediaPicker label="الشعار المقترح" value={draftLogo} onChange={setDraftLogo} disabled={submittingRev} />
            <ProfileMediaPicker label="الغلاف المقترح" value={draftCover} onChange={setDraftCover} disabled={submittingRev} />
            {revSuccessMsg ? (
              <View className="p-3 rounded-xl bg-emerald-500/10 flex-row items-center gap-2">
                <CheckCircle2 size={16} color="#16A34A" />
                <AppText variant="caption" className="text-emerald-600 text-xs flex-1 text-right">
                  {revSuccessMsg}
                </AppText>
              </View>
            ) : null}

            {revErrorMsg ? (
              <View className="p-3 rounded-xl bg-rose-500/10 flex-row items-center gap-2">
                <AlertCircle size={16} color="#E11D48" />
                <AppText variant="caption" className="text-rose-600 text-xs flex-1 text-right">
                  {revErrorMsg}
                </AppText>
              </View>
            ) : null}

            </ScrollView>
            <View className="flex-row items-center gap-3 pt-2">
              <View className="flex-1">
                <AppButton
                  title={submittingRev ? (uploadingMedia ? 'جارٍ رفع الصور...' : 'جارٍ إرسال الطلب...') : 'إرسال للمراجعة'}
                  variant="primary"
                  size="lg"
                  disabled={submittingRev}
                  onPress={handleSubmitRevision}
                />
              </View>
              <View className="flex-1">
                <AppButton
                  title="إلغاء"
                  variant="secondary"
                  size="lg"
                  disabled={submittingRev}
                  onPress={() => setEditModalOpen(false)}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preview Profile Modal */}
      <Modal visible={previewModalOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/60 p-4">
          <View
            className="w-full max-w-md self-center rounded-2xl border p-5 gap-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between border-b border-border pb-2">
              <AppText variant="heading" className="font-tajawal-bold text-base">
                معاينة الملف العام (كما يظهر للعملاء)
              </AppText>
              <Pressable onPress={() => setPreviewModalOpen(false)}>
                <XCircle size={20} color={isDark ? '#A1A1AA' : '#64748B'} />
              </Pressable>
            </View>

            <View className="rounded-xl overflow-hidden border border-border h-24 items-center justify-center bg-slate-200 dark:bg-slate-800">
              <Building2 size={36} color={isDark ? '#64748B' : '#94A3B8'} />
            </View>

            <View className="items-end gap-1">
              <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
                {activeBusiness?.name}
              </AppText>
              <AppText variant="body" muted className="text-sm text-right leading-relaxed">
                {activeBusiness?.description || 'لا يوجد وصف عام منشور حالياً.'}
              </AppText>
              {activeBusiness?.contact_phone ? (
                <AppText variant="caption" muted className="text-xs text-right mt-1">
                  هاتف التواصل: {activeBusiness.contact_phone}
                </AppText>
              ) : null}
            </View>

            <AppButton
              title="إغلاق المعاينة"
              variant="secondary"
              size="md"
              onPress={() => setPreviewModalOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </MerchantScaffold>
  );
}
