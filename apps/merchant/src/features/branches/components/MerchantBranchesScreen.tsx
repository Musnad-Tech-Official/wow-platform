import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { MapPin, AlertCircle } from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import { useBusinessBranches, type Branch } from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';
import { MerchantScaffold } from '../../navigation/MerchantScaffold';

// Synthetic fallback branches for dev preview matching reference
const PREVIEW_BRANCHES: Branch[] = [
  {
    id: 'branch-tahrir-uuid',
    name: 'فرع التحرير',
    business_id: 'dev-synthetic-business-uuid',
    city: 'تعز',
    address_line: 'عنوان توضيحي',
    status: 'approved',
    is_primary: true,
  },
  {
    id: 'branch-seina-uuid',
    name: 'فرع صينة',
    business_id: 'dev-synthetic-business-uuid',
    city: 'تعز',
    address_line: 'عنوان توضيحي',
    status: 'under_review',
    is_primary: false,
  },
];

export function MerchantBranchesScreen() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const {
    activeBusinessId,
    isOwner,
    isSyntheticPreview,
  } = useActiveBusiness();

  const { data: serverBranches = [], isLoading, error } = useBusinessBranches(activeBusinessId);

  const branches = isSyntheticPreview ? PREVIEW_BRANCHES : serverBranches;

  const navParams = {
    ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    ...(isSyntheticPreview ? { preview: '1' } : {}),
  };

  const handleAddBranch = () => {
    router.push({
      pathname: '/business/branches/editor',
      params: { ...navParams, mode: 'new' },
    });
  };

  const handleEditBranch = (branchId: string) => {
    router.push({
      pathname: '/business/branches/editor',
      params: { ...navParams, mode: 'edit', branchId },
    });
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'مؤهل', bg: isDark ? '#064E3B' : '#DCFCE7', text: '#16A34A' };
      case 'under_review':
      case 'submitted':
      case 'pending':
        return { label: 'قيد التأهيل', bg: isDark ? '#451A03' : '#FEF3C7', text: '#D97706' };
      case 'rejected':
        return { label: 'مرفوض', bg: isDark ? '#4C0519' : '#FFE4E6', text: '#E11D48' };
      default:
        return { label: status, bg: isDark ? '#27272A' : '#F4F4F5', text: colors.foreground };
    }
  };

  return (
    <MerchantScaffold
      currentTab="businesses"
      title="فروع النشاط"
      subtitle="بيانات مواقعك وحالات التأهيل المرتبطة بها."
    >
      <View className="gap-5 pb-8">
        {/* Section Header with Add Branch Button */}
        <View className="flex-row items-center justify-between">
          <View>
            <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
              الفروع المصرح بها
            </AppText>
            <AppText variant="caption" muted className="text-right">
              {branches.length} مواقع مسجلة للنشاط التجاري
            </AppText>
          </View>

          {isOwner ? (
            <AppButton
              title="+ إضافة فرع"
              variant="primary"
              size="sm"
              onPress={handleAddBranch}
            />
          ) : null}
        </View>

        {/* Loading state */}
        {isLoading && !isSyntheticPreview ? (
          <View className="py-12 items-center justify-center gap-2">
            <ActivityIndicator size="small" color="#FACC15" />
            <AppText muted className="text-xs">جارٍ تحميل الفروع المصرح بها...</AppText>
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
              تعذر تحميل قائمة الفروع. يرجى التحقق من الاتصال بالشبكة والمحاولة مجدداً.
            </AppText>
          </View>
        ) : null}

        {/* Empty state with Mascot */}
        {!isLoading && branches.length === 0 ? (
          <View
            className="rounded-2xl border p-6 items-center justify-center gap-3.5 text-center"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Image
              source={wowIllustrations.merchant.mer07BranchesMascot}
              alt="مساعد واو للفروع"
              style={{ width: 90, height: 90 }}
              contentFit="contain"
            />
            <AppText variant="heading" className="font-tajawal-bold text-base text-center">
              لا توجد فروع مسجلة حتى الآن
            </AppText>
            <AppText variant="body" muted className="text-xs text-center max-w-xs leading-relaxed">
              أضف فرعك الرئيسي أو فروعك التشغيلية لتمكين نشر العروض الجغرافية المعتمدة للعملاء.
            </AppText>
            {isOwner ? (
              <AppButton
                title="إضافة فرع جديد"
                variant="primary"
                size="md"
                onPress={handleAddBranch}
              />
            ) : null}
          </View>
        ) : null}

        {/* Branch Cards List */}
        {branches.length > 0 ? (
          <View
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            {branches.map((branch, index) => {
              const statusInfo = formatStatus(branch.status);
              const isLast = index === branches.length - 1;
              return (
                <Pressable
                  key={branch.id}
                  accessibilityRole="button"
                  accessibilityLabel={`فرع: ${branch.name}`}
                  accessibilityState={{ disabled: !isOwner }}
                  disabled={!isOwner}
                  onPress={() => handleEditBranch(branch.id)}
                  className={`flex-row items-center justify-between p-4 active:opacity-75 ${
                    !isLast ? 'border-b border-border' : ''
                  }`}
                >
                  {/* Status Badge */}
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: statusInfo.bg }}
                  >
                    <AppText
                      variant="caption"
                      className="font-tajawal-bold text-xs"
                      style={{ color: statusInfo.text }}
                    >
                      {statusInfo.label}
                    </AppText>
                  </View>

                  {/* Branch Name & Address */}
                  <View className="flex-row items-center gap-3">
                    <View className="items-end">
                      <AppText variant="label" className="font-tajawal-bold text-sm text-right">
                        {branch.name}
                      </AppText>
                      <AppText variant="caption" muted className="text-xs text-right mt-0.5">
                        {branch.address_line ? `${branch.address_line} • ` : ''}{branch.city || 'مدينة غير محددة'}
                      </AppText>
                    </View>

                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: isDark ? '#1E293B' : '#FEF9C3' }}
                    >
                      <MapPin size={18} color="#FACC15" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Factual Info Note at Bottom */}
        <View
          className="p-3.5 rounded-xl border border-border"
          style={{ backgroundColor: isDark ? '#18181B' : '#F8FAFC' }}
        >
          <AppText variant="caption" muted className="text-xs text-center leading-relaxed">
            إنشاء فرع جديد أو تغيير موقعه لا يمنح الفرع تأهيلاً تلقائياً.
          </AppText>
        </View>
      </View>
    </MerchantScaffold>
  );
}
