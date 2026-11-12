import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import {
  ShieldCheck,
  LayoutDashboard,
  Store,
  Tag,
  MessageSquareWarning,
  CreditCard,
  TrendingUp,
  FolderTree,
  UsersRound,
  FileClock,
  Search,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react-native';

import { wowBrand } from '@wow/assets';
import { AppText, Badge } from '@wow/ui';
import { useTheme, useWowColors } from '@wow/theme';
import { getRoleArabicLabel, type AdminRole } from '../auth/admin-access';
import { CompactThemeControl } from '../theme/CompactThemeControl';

interface AdminShellProps {
  currentRole?: AdminRole | null;
  userEmail?: string;
  userName?: string;
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
  pageTitle?: string;
}

export function AdminShell({
  currentRole,
  userName = 'المسؤول المخوّل',
  onSignOut,
  children,
  pageTitle = 'لوحة العمليات',
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { resolvedTheme } = useTheme();
  const colors = useWowColors();
  const isDark = resolvedTheme === 'dark';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboardActive = pathname === '/' || pathname === '/index';
  const isRolesActive = pathname === '/roles' || pathname.includes('roles');

  const navTo = (path: string) => {
    setMobileMenuOpen(false);
    const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
    const target = isDev && params.preview ? `${path}?preview=${encodeURIComponent(params.preview)}` : path;
    router.push(target as any);
  };

  const roleLabel = getRoleArabicLabel(currentRole);

  const renderSidebar = (isDrawer = false) => (
    <View
      className={`h-full flex-col justify-between p-4 ${
        isDark ? 'bg-[#18181B] border-l border-[#27272A]' : 'bg-white border-l border-[#E2E8F0]'
      }`}
      style={{ minWidth: 260, maxWidth: 300, width: isDrawer ? '100%' : 280 }}
    >
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Brand Header */}
        <View className="mb-6 flex-row items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#27272A]">
          <View className="flex-row items-center gap-3">
            <Image
              source={isDark ? wowBrand.logoPrimaryDark : wowBrand.logoPrimary}
              contentFit="contain"
              alt="شعار واو الرسمي"
              style={{ width: 84, height: 44 }}
            />
            <View>
              <AppText className="text-sm font-tajawal-bold tracking-tight leading-tight">
                مركز الإدارة
              </AppText>
              <AppText variant="caption" muted className="text-[10px] font-tajawal tracking-wider">
                CONTROL CENTER
              </AppText>
            </View>
          </View>
          {isDrawer && (
            <Pressable
              onPress={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg bg-surface"
              accessibilityLabel="إغلاق القائمة"
            >
              <X size={18} color={colors.foreground} />
            </Pressable>
          )}
        </View>

        {/* Work Area Badge Card */}
        <View
          className={`mb-6 rounded-2xl p-3 border flex-row items-center gap-3 ${
            isDark ? 'bg-[#27272A]/50 border-[#3F3F46]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}
        >
          <View className="rounded-xl bg-[#FACC15]/20 p-2">
            <ShieldCheck size={20} color="#FACC15" />
          </View>
          <View className="flex-1">
            <AppText className="font-tajawal-bold text-sm text-right">مركز الإدارة</AppText>
            <AppText variant="caption" muted className="text-right">
              مساحة عمل مقيّدة بالخادم
            </AppText>
          </View>
        </View>

        {/* Navigation Sections */}
        <View className="gap-5">
          {/* Section 1: العمليات */}
          <View>
            <AppText
              variant="caption"
              className="mb-2 px-2 font-tajawal-bold text-[#71717A] text-right"
            >
              العمليات
            </AppText>
            <Pressable
              onPress={() => navTo('/')}
              className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                isDashboardActive
                  ? isDark
                    ? 'bg-[#27272A] border-r-4 border-[#FACC15]'
                    : 'bg-[#FEFCE8] border-r-4 border-[#FACC15]'
                  : 'hover:bg-surface'
              }`}
              accessibilityRole="button"
              accessibilityLabel="لوحة العمليات"
            >
              <LayoutDashboard
                size={18}
                color={isDashboardActive ? (isDark ? '#FACC15' : '#854D0E') : colors.mutedForeground}
              />
              <AppText
                className={`flex-1 text-sm text-right ${
                  isDashboardActive ? 'font-tajawal-bold text-[#854D0E] dark:text-[#FACC15]' : 'font-tajawal-medium'
                }`}
              >
                لوحة العمليات
              </AppText>
            </Pressable>
          </View>

          {/* Section 2: المراجعات */}
          <View>
            <AppText
              variant="caption"
              className="mb-2 px-2 font-tajawal-bold text-[#71717A] text-right"
            >
              المراجعات
            </AppText>
            <View className="gap-1">
              <View className="flex-row items-center gap-3 rounded-xl px-3 py-2 opacity-60">
                <Store size={18} color={colors.mutedForeground} />
                <AppText className="flex-1 text-sm text-right font-tajawal-medium" muted>
                  الأنشطة والفروع
                </AppText>
                <Badge label="قريباً" variant="secondary" />
              </View>
              <View className="flex-row items-center gap-3 rounded-xl px-3 py-2 opacity-60">
                <Tag size={18} color={colors.mutedForeground} />
                <AppText className="flex-1 text-sm text-right font-tajawal-medium" muted>
                  مراجعة العروض
                </AppText>
                <Badge label="قريباً" variant="secondary" />
              </View>
              <View className="flex-row items-center gap-3 rounded-xl px-3 py-2 opacity-60">
                <MessageSquareWarning size={18} color={colors.mutedForeground} />
                <AppText className="flex-1 text-sm text-right font-tajawal-medium" muted>
                  الشكاوى والبلاغات
                </AppText>
                <Badge label="قريباً" variant="secondary" />
              </View>
            </View>
          </View>

          {/* Section 3: التجارة */}
          <View>
            <AppText
              variant="caption"
              className="mb-2 px-2 font-tajawal-bold text-[#71717A] text-right"
            >
              التجارة
            </AppText>
            <View className="gap-1">
              <View className="flex-row items-center gap-3 rounded-xl px-3 py-2 opacity-60">
                <CreditCard size={18} color={colors.mutedForeground} />
                <AppText className="flex-1 text-sm text-right font-tajawal-medium" muted>
                  الاشتراكات
                </AppText>
                <Badge label="قريباً" variant="secondary" />
              </View>
              <View className="flex-row items-center gap-3 rounded-xl px-3 py-2 opacity-60">
                <TrendingUp size={18} color={colors.mutedForeground} />
                <AppText className="flex-1 text-sm text-right font-tajawal-medium" muted>
                  الترويج
                </AppText>
                <Badge label="قريباً" variant="secondary" />
              </View>
            </View>
          </View>

          {/* Section 4: الإعدادات */}
          <View>
            <AppText
              variant="caption"
              className="mb-2 px-2 font-tajawal-bold text-[#71717A] text-right"
            >
              الإعدادات
            </AppText>
            <View className="gap-1">
              <View className="flex-row items-center gap-3 rounded-xl px-3 py-2 opacity-60">
                <FolderTree size={18} color={colors.mutedForeground} />
                <AppText className="flex-1 text-sm text-right font-tajawal-medium" muted>
                  التصنيفات
                </AppText>
                <Badge label="قريباً" variant="secondary" />
              </View>

              <Pressable
                onPress={() => navTo('/roles')}
                className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                  isRolesActive
                    ? isDark
                      ? 'bg-[#27272A] border-r-4 border-[#FACC15]'
                      : 'bg-[#FEFCE8] border-r-4 border-[#FACC15]'
                    : 'hover:bg-surface'
                }`}
                accessibilityRole="button"
                accessibilityLabel="الصلاحيات"
              >
                <UsersRound
                  size={18}
                  color={isRolesActive ? (isDark ? '#FACC15' : '#854D0E') : colors.mutedForeground}
                />
                <AppText
                  className={`flex-1 text-sm text-right ${
                    isRolesActive ? 'font-tajawal-bold text-[#854D0E] dark:text-[#FACC15]' : 'font-tajawal-medium'
                  }`}
                >
                  الصلاحيات
                </AppText>
              </Pressable>

              <View className="flex-row items-center gap-3 rounded-xl px-3 py-2 opacity-60">
                <FileClock size={18} color={colors.mutedForeground} />
                <AppText className="flex-1 text-sm text-right font-tajawal-medium" muted>
                  سجل التدقيق
                </AppText>
                <Badge label="قريباً" variant="secondary" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Profile & Sign Out */}
      <View className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#27272A] flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1 overflow-hidden">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#FACC15] shrink-0">
            <AppText className="font-tajawal-bold text-sm text-[#0F172D]">م</AppText>
          </View>
          <View className="flex-1 truncate">
            <AppText className="font-tajawal-bold text-xs truncate text-right">{userName}</AppText>
            <View className="flex-row items-center gap-1 justify-end mt-0.5">
              <Badge label={roleLabel} variant="primary" />
            </View>
          </View>
        </View>
        <Pressable
          onPress={onSignOut}
          className="p-2 rounded-xl hover:bg-surface active:opacity-70"
          accessibilityLabel="تسجيل الخروج"
        >
          <LogOut size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View
      {...(Platform.OS === 'web' ? { dir: 'rtl' as const } : {})}
      className="flex-1 bg-[#F6F7F6] dark:bg-[#101014]"
    >
      <View className="flex-1 flex-row">
        {/* Persistent Desktop Sidebar */}
        <View className="hidden lg:flex">
          {renderSidebar(false)}
        </View>

        {/* Mobile/Tablet Slide-in Overlay */}
        {mobileMenuOpen && (
          <View className="absolute inset-0 z-50 flex-row lg:hidden">
            <Pressable
              onPress={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <View className="w-72 h-full z-10 shadow-2xl">
              {renderSidebar(true)}
            </View>
          </View>
        )}

        {/* Main Content Area */}
        <View className="flex-1 flex-col overflow-hidden">
          {/* Responsive Compact Top Bar */}
          <View
            className={`h-16 flex-row items-center justify-between px-3 sm:px-6 border-b ${
              isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E2E8F0]'
            }`}
          >
            {/* Right: Breadcrumb & Mobile Menu */}
            <View className="flex-row items-center gap-2 sm:gap-3 flex-shrink min-w-0">
              <Pressable
                onPress={() => setMobileMenuOpen(true)}
                className="p-2 rounded-xl bg-surface flex lg:hidden"
                accessibilityLabel="فتح القائمة"
              >
                <Menu size={20} color={colors.foreground} />
              </Pressable>

              <View className="flex-row items-center gap-1.5 sm:gap-2 flex-shrink truncate">
                <AppText variant="caption" muted className="font-tajawal-medium hidden sm:flex">
                  مساحة الإدارة
                </AppText>
                <ChevronLeft size={14} color={colors.mutedForeground} className="hidden sm:flex" />
                <AppText numberOfLines={1} ellipsizeMode="tail" className="font-tajawal-bold text-[11px] sm:text-sm text-[#854D0E] dark:text-[#FACC15] max-w-[125px] sm:max-w-none">
                  {pageTitle}
                </AppText>
              </View>
            </View>

            {/* Left: Compact Theme Control & Avatar */}
            <View className="flex-row items-center gap-2 sm:gap-3 flex-shrink-0">
              <View
                className={`hidden md:flex flex-row items-center gap-2 rounded-full px-3 py-1.5 border w-52 lg:w-64 ${
                  isDark ? 'bg-[#27272A] border-[#3F3F46]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                }`}
              >
                <Search size={14} color={colors.mutedForeground} />
                <AppText variant="caption" muted className="font-tajawal text-xs truncate">
                  البحث في النظام...
                </AppText>
              </View>

              <CompactThemeControl />

              <View className="h-8 w-8 items-center justify-center rounded-full bg-[#FACC15]">
                <AppText className="font-tajawal-bold text-xs text-[#0F172D]">م</AppText>
              </View>
            </View>
          </View>

          {/* Page Body */}
          <ScrollView
            className="flex-1"
            contentContainerClassName="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
