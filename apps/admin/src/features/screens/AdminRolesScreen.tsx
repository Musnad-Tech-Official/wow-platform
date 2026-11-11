import React, { useState } from 'react';
import {
  View,
  Pressable,
  TextInput,
} from 'react-native';
import {
  ShieldCheck,
  Search,
  ChevronLeft,
  Sparkles,
  AlertTriangle,
  UserCheck,
} from 'lucide-react-native';

import { AppText, Card, Badge, AppButton } from '@wow/ui';
import { useTheme, useWowColors } from '@wow/theme';
import {
  type AdminMemberRecord,
  type AdminRole,
  FIXTURE_ADMIN_MEMBERS,
  getRoleArabicLabel,
  canManageRoles,
} from '../auth/admin-access';

interface AdminRolesScreenProps {
  currentRole?: AdminRole | null;
  userEmail?: string;
  isFixture?: boolean;
  highlightGap?: boolean;
}

export function AdminRolesScreen({
  currentRole,
  userEmail,
  isFixture = false,
  highlightGap = false,
}: AdminRolesScreenProps) {
  const { resolvedTheme } = useTheme();
  const colors = useWowColors();
  const isDark = resolvedTheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('USR-112');
  const [proposedRole, setProposedRole] = useState<AdminRole>('reviewer');
  const [justificationReason, setJustificationReason] = useState('');

  // Truthful data boundary:
  // In production, the private table wow_private.admin_members does not have a public list RPC.
  // Fictitious accounts must NEVER be displayed in production.
  const liveAdminUser: AdminMemberRecord = {
    id: 'CURRENT-SESSION',
    userId: 'auth_current_user',
    displayName: 'حساب الإدارة الحالي',
    email: userEmail || 'admin@wow.local',
    role: currentRole ?? 'reviewer',
    scope: 'العمليات المعتمدة بالخادم',
    isActive: true,
  };

  const members: AdminMemberRecord[] = isFixture
    ? FIXTURE_ADMIN_MEMBERS
    : [liveAdminUser];

  const filteredMembers = members.filter(
    (m) =>
      m.displayName.includes(searchQuery.trim()) ||
      m.id.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      m.scope.includes(searchQuery.trim())
  );

  const selectedMember =
    members.find((m) => m.id === selectedMemberId) ?? members[0];

  const handleSelectMember = (member: AdminMemberRecord) => {
    setSelectedMemberId(member.id);
    setProposedRole(member.role);
  };

  const handleProposedRoleChange = (role: AdminRole) => {
    setProposedRole(role);
  };

  // Authoritative check: canManageRoles requires proven super_admin authority
  const userCanManage = canManageRoles(currentRole);

  return (
    <View className="gap-8">
      {/* Development Fixture Mode Advisory Banner */}
      {isFixture && (
        <View className="rounded-2xl p-4 bg-[#FEFCE8] dark:bg-[#422E12]/60 border border-[#FDE047] dark:border-[#854D0E] flex-row items-center gap-3">
          <Sparkles size={18} color="#CA8A04" />
          <View className="flex-1">
            <AppText className="text-xs font-tajawal-bold text-[#854D0E] dark:text-[#FEF08A] text-right">
              وضع المعاينة التطويرية (Fixture Mode)
            </AppText>
            <AppText className="text-[11px] font-tajawal text-[#A16207] dark:text-[#FDE047] text-right leading-tight mt-0.5">
              الحسابات المعروضة تجريبية لغرض الفحص المرئي لواجهة الصلاحيات فقط وليست أعضاء فعليين في المنظومة.
            </AppText>
          </View>
        </View>
      )}

      {/* Production Private Schema Security Banner (when not fixture) */}
      {!isFixture && (
        <View className="rounded-2xl p-4 bg-[#F8FAFC] dark:bg-[#27272A]/40 border border-[#E2E8F0] dark:border-[#3F3F46] flex-row items-center gap-3">
          <ShieldCheck size={18} color="#FACC15" />
          <View className="flex-1">
            <AppText className="text-xs font-tajawal-bold text-right">
              دليل المشرفين محمي على مستوى الخادم
            </AppText>
            <AppText variant="caption" muted className="text-[11px] font-tajawal text-right leading-relaxed mt-0.5">
              جدول الأعضاء محفوظ في مخطط آمن (wow_private.admin_members). لا توجد دالة استعلام عامة (RPC) لسرد الأعضاء لضمان سرية الهويات الإدارية.
            </AppText>
          </View>
        </View>
      )}

      {/* Prominent Contract Gap Alert (active when highlighted or in gap review mode) */}
      {(highlightGap || !userCanManage) && (
        <View className="rounded-2xl p-4 bg-[#FFFBEB] dark:bg-[#451A03]/50 border-2 border-[#F59E0B] dark:border-[#D97706] flex-row items-center gap-3">
          <AlertTriangle size={22} color="#D97706" />
          <View className="flex-1">
            <AppText className="text-sm font-tajawal-bold text-[#B45309] dark:text-[#FDE68A] text-right">
              عقد الخادم غير متوفر: تعديل الأدوار معطّل برمجياً
            </AppText>
            <AppText className="text-xs font-tajawal text-[#92400E] dark:text-[#FCD34D] text-right leading-relaxed mt-1">
              دالة تحديث الأدوار (wow_admin_update_member_role) غير متوفرة في قاعدة البيانات الحالية. تم قفل إجراءات الحفظ لمنع أي تصعيد غير موثق أو كتابة وهمية على الخادم.
            </AppText>
          </View>
        </View>
      )}

      {/* Page Header */}
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <AppText variant="caption" className="font-tajawal-bold text-[#FACC15]">
            WOW / مركز العمليات
          </AppText>
        </View>
        <AppText className="text-2xl sm:text-3xl font-tajawal-bold text-right tracking-tight">
          المشرفون وأدوار الإدارة
        </AppText>
        <AppText variant="caption" muted className="font-tajawal text-right text-sm">
          صلاحيات محددة بالنطاق والمهام، دون تصعيد المستخدم لصلاحياته بنفسه.
        </AppText>
      </View>

      {/* Main Table Card: حسابات الإدارة ونطاقها */}
      <Card className="p-4 sm:p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-5">
        <View className="flex-row flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#27272A]">
          <View className="items-end">
            <AppText className="text-xl font-tajawal-bold text-right">
              حسابات الإدارة ونطاقها
            </AppText>
            <AppText variant="caption" muted className="font-tajawal text-xs text-right">
              عرض المشرفين المعتمدين وتفويضاتهم التشغيلية
            </AppText>
          </View>

          {/* Search Input */}
          <View
            className={`flex-row items-center gap-2 rounded-xl px-3 py-1.5 border w-full sm:w-64 ${
              isDark ? 'bg-[#27272A] border-[#3F3F46]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
            }`}
          >
            <Search size={14} color={colors.mutedForeground} />
            <TextInput
              placeholder="البحث بالاسم أو المعرف..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-xs font-tajawal text-right"
              style={{ color: colors.foreground }}
            />
          </View>
        </View>

        {/* 1. Desktop Layout (Table) - Hidden on Mobile (< md) */}
        <View className="hidden md:flex w-full overflow-x-auto">
          {/* Table Head */}
          <View className="flex-row items-center justify-between py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#27272A]/40 rounded-xl mb-2">
            <AppText variant="caption" muted className="w-20 font-tajawal-bold text-xs text-right">
              المعرّف
            </AppText>
            <AppText variant="caption" muted className="flex-1 font-tajawal-bold text-xs text-right px-2">
              المستخدم الإداري
            </AppText>
            <AppText variant="caption" muted className="w-28 font-tajawal-bold text-xs text-right px-2">
              الدور
            </AppText>
            <AppText variant="caption" muted className="w-36 font-tajawal-bold text-xs text-right px-2">
              النطاق
            </AppText>
            <View className="w-8" />
          </View>

          {/* Table Rows */}
          <View className="gap-1.5">
            {filteredMembers.map((member) => {
              const isSelected = member.id === selectedMemberId;
              const roleTitle = getRoleArabicLabel(member.role);

              return (
                <Pressable
                  key={member.id}
                  onPress={() => handleSelectMember(member)}
                  className={`flex-row items-center justify-between py-3.5 px-4 rounded-xl border transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-[#27272A] border-[#FACC15]'
                        : 'bg-[#FEFCE8] border-[#FACC15]'
                      : 'border-transparent hover:bg-surface'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={`اختيار ${member.displayName}`}
                >
                  <AppText className="w-20 font-tajawal-bold text-xs text-right tracking-wider">
                    {member.id}
                  </AppText>

                  <View className="flex-1 px-2 items-end">
                    <AppText className="font-tajawal-bold text-sm text-right">
                      {member.displayName}
                    </AppText>
                    <AppText variant="caption" muted className="text-[11px] font-tajawal text-right">
                      {member.email}
                    </AppText>
                  </View>

                  <View className="w-28 px-2 items-end">
                    <Badge
                      label={roleTitle}
                      variant={member.role === 'super_admin' ? 'primary' : 'secondary'}
                    />
                  </View>

                  <AppText variant="caption" className="w-36 px-2 font-tajawal text-xs text-right" muted>
                    {member.scope}
                  </AppText>

                  <View className="w-8 items-center">
                    <ChevronLeft
                      size={18}
                      color={isSelected ? '#FACC15' : colors.mutedForeground}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. Responsive Mobile Layout (Cards) - Shown only on Mobile (< md) */}
        <View className="flex md:hidden gap-3">
          {filteredMembers.map((member) => {
            const isSelected = member.id === selectedMemberId;
            const roleTitle = getRoleArabicLabel(member.role);

            return (
              <Pressable
                key={member.id}
                onPress={() => handleSelectMember(member)}
                className={`p-4 rounded-2xl border transition-all gap-3 ${
                  isSelected
                    ? isDark
                      ? 'bg-[#27272A] border-[#FACC15]'
                      : 'bg-[#FEFCE8] border-[#FACC15]'
                    : isDark
                    ? 'bg-[#18181B] border-[#27272A]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0]'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`اختيار ${member.displayName}`}
              >
                {/* Card Top: ID & Selection Status */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    {isSelected && (
                      <View className="h-2 w-2 rounded-full bg-[#FACC15]" />
                    )}
                    <AppText className="font-tajawal-bold text-xs tracking-wider text-[#FACC15]">
                      {member.id}
                    </AppText>
                  </View>
                  <Badge
                    label={roleTitle}
                    variant={member.role === 'super_admin' ? 'primary' : 'secondary'}
                  />
                </View>

                {/* Card Middle: Identity & Email */}
                <View className="items-end gap-0.5">
                  <AppText className="font-tajawal-bold text-base text-right">
                    {member.displayName}
                  </AppText>
                  <AppText variant="caption" muted className="text-xs font-tajawal text-right">
                    {member.email}
                  </AppText>
                </View>

                {/* Card Bottom: Scope & Selection Button */}
                <View className="flex-row items-center justify-between pt-2 border-t border-[#E2E8F0] dark:border-[#27272A]">
                  <View className="flex-row items-center gap-1 text-xs">
                    <UserCheck size={14} color={isSelected ? '#FACC15' : colors.mutedForeground} />
                    <AppText className={`text-xs font-tajawal ${isSelected ? 'font-tajawal-bold text-[#FACC15]' : 'text-muted-foreground'}`}>
                      {isSelected ? 'محدد للمراجعة' : 'اضغط للتحديد'}
                    </AppText>
                  </View>
                  <AppText variant="caption" muted className="text-xs font-tajawal text-right">
                    {member.scope}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Two-Column Bottom Cards: Selected Member Detail & Modification Request */}
      <View className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): نطاق الموظف المحدد */}
        <Card className="lg:col-span-7 p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-5">
          <View className="items-end pb-3 border-b border-[#E2E8F0] dark:border-[#27272A]">
            <AppText className="text-lg font-tajawal-bold text-right">
              نطاق الموظف المحدد
            </AppText>
            <AppText variant="caption" muted className="font-tajawal text-xs text-right">
              بيانات الصلاحية الفعلية المقيدة بالخادم
            </AppText>
          </View>

          {/* 4-Field Grid */}
          <View className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <View className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#27272A] bg-background">
              <AppText variant="caption" muted className="font-tajawal text-xs text-right mb-1">
                المستخدم
              </AppText>
              <AppText className="font-tajawal-bold text-sm text-right">
                {selectedMember.displayName}
              </AppText>
            </View>

            <View className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#27272A] bg-background">
              <AppText variant="caption" muted className="font-tajawal text-xs text-right mb-1">
                الدور الحالي
              </AppText>
              <AppText className="font-tajawal-bold text-sm text-right text-[#FACC15]">
                {getRoleArabicLabel(selectedMember.role)}
              </AppText>
            </View>

            <View className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#27272A] bg-background">
              <AppText variant="caption" muted className="font-tajawal text-xs text-right mb-1">
                المرجع
              </AppText>
              <AppText className="font-tajawal-bold text-sm text-right tracking-wider">
                {selectedMember.id}
              </AppText>
            </View>

            <View className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#27272A] bg-background">
              <AppText variant="caption" muted className="font-tajawal text-xs text-right mb-1">
                نطاق العمل
              </AppText>
              <AppText className="font-tajawal-bold text-sm text-right">
                {selectedMember.scope}
              </AppText>
            </View>
          </View>

          {/* Proposed Role Selector */}
          <View className="gap-2 pt-2">
            <AppText variant="caption" className="font-tajawal-bold text-xs text-right">
              الدور المقترح
            </AppText>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => handleProposedRoleChange('super_admin')}
                className={`flex-1 py-2.5 px-3 rounded-xl border items-center ${
                  proposedRole === 'super_admin'
                    ? 'border-[#FACC15] bg-[#FEFCE8] dark:bg-[#422E12]'
                    : 'border-[#E2E8F0] dark:border-[#27272A] bg-background'
                }`}
              >
                <AppText
                  className={`text-xs ${
                    proposedRole === 'super_admin'
                      ? 'font-tajawal-bold text-[#FACC15]'
                      : 'font-tajawal'
                  }`}
                >
                  مشرف عام
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => handleProposedRoleChange('reviewer')}
                className={`flex-1 py-2.5 px-3 rounded-xl border items-center ${
                  proposedRole === 'reviewer'
                    ? 'border-[#FACC15] bg-[#FEFCE8] dark:bg-[#422E12]'
                    : 'border-[#E2E8F0] dark:border-[#27272A] bg-background'
                }`}
              >
                <AppText
                  className={`text-xs ${
                    proposedRole === 'reviewer'
                      ? 'font-tajawal-bold text-[#FACC15]'
                      : 'font-tajawal'
                  }`}
                >
                  مراجع
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => handleProposedRoleChange('viewer')}
                className={`flex-1 py-2.5 px-3 rounded-xl border items-center ${
                  proposedRole === 'viewer'
                    ? 'border-[#FACC15] bg-[#FEFCE8] dark:bg-[#422E12]'
                    : 'border-[#E2E8F0] dark:border-[#27272A] bg-background'
                }`}
              >
                <AppText
                  className={`text-xs ${
                    proposedRole === 'viewer'
                      ? 'font-tajawal-bold text-[#FACC15]'
                      : 'font-tajawal'
                  }`}
                >
                  مراقب
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* Guard Notice Card */}
          <View
            className={`rounded-2xl p-3.5 border flex-row items-center gap-3 ${
              isDark ? 'bg-[#27272A]/40 border-[#3F3F46]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
            }`}
          >
            <ShieldCheck size={18} color="#FACC15" />
            <AppText variant="caption" muted className="flex-1 text-xs font-tajawal text-right leading-relaxed">
              لا يمكن للمستخدم منح نفسه صلاحيات أعلى من صلاحياته المعتمدة على الخادم.
            </AppText>
          </View>
        </Card>

        {/* Right (5 cols): طلب تعديل الصلاحيات */}
        <Card className="lg:col-span-5 p-6 border border-[#E2E8F0] dark:border-[#27272A] bg-surface gap-5">
          <View className="items-end pb-3 border-b border-[#E2E8F0] dark:border-[#27272A]">
            <AppText className="text-lg font-tajawal-bold text-right">
              طلب تعديل الصلاحيات
            </AppText>
            <AppText variant="caption" muted className="font-tajawal text-xs text-right">
              مبرر التفويض أو الإلغاء
            </AppText>
          </View>

          <View className="gap-3">
            <AppText variant="caption" className="font-tajawal-bold text-xs text-right">
              سبب التعديل الموثق
            </AppText>

            <TextInput
              placeholder="اكتب سبباً واضحاً ومبرراً يمكن مراجعته في سجل التدقيق..."
              placeholderTextColor={colors.mutedForeground}
              value={justificationReason}
              onChangeText={setJustificationReason}
              multiline
              numberOfLines={4}
              className="w-full p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#27272A] bg-background text-sm font-tajawal text-right"
              style={{ color: colors.foreground, textAlignVertical: 'top', minHeight: 90 }}
            />

            <AppText variant="caption" muted className="text-[11px] font-tajawal text-right">
              يُحفظ التفسير مع سجل التدقيق عند توفر عقد التعديل بالخادم.
            </AppText>
          </View>

          {/* Functional & Visual Action Boundary */}
          <View className="gap-2">
            <AppButton
              title="تعديل الصلاحيات معطّل (عقد الخادم غير متوفر)"
              variant="secondary"
              disabled={true}
              onPress={() => {}}
              className="opacity-60"
            />
            <AppText variant="caption" muted className="text-[11px] font-tajawal text-center text-amber-700 dark:text-amber-400">
              دالة التعديل (wow_admin_update_member_role) غير متوفرة في قاعدة البيانات.
            </AppText>
          </View>

          {/* Security & Truthful Boundary Notice */}
          <View
            className={`rounded-2xl p-3.5 border flex-row items-center gap-3 ${
              isDark ? 'bg-[#27272A]/40 border-[#3F3F46]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
            }`}
          >
            <ShieldCheck size={18} color="#FACC15" />
            <AppText variant="caption" muted className="flex-1 text-xs font-tajawal text-right leading-relaxed">
              الأمان الأساسي: لا تُنشئ هذه الشاشة حسابات ولا تعدّل قواعد RLS دون موافقة مسبقة وعقد موثق.
            </AppText>
          </View>
        </Card>
      </View>
    </View>
  );
}
