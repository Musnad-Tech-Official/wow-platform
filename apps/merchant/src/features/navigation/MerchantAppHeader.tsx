import React, { useState } from 'react';
import { View, Pressable, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  MessageSquare,
  ChevronDown,
  Store,
  Check,
  Plus,
  X,
  Building2,
} from 'lucide-react-native';
import { useWowColors, useTheme } from '@wow/theme';
import { AppText } from '@wow/ui';
import { useActiveBusiness } from '../business/context/ActiveBusinessContext';

export interface MerchantAppHeaderProps {
  title?: string;
  subtitle?: string;
  showBusinessSelector?: boolean;
  extraRightBadge?: React.ReactNode;
}

export function MerchantAppHeader({
  title,
  subtitle,
  showBusinessSelector = true,
  extraRightBadge,
}: MerchantAppHeaderProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { activeBusiness, businesses, setActiveBusinessId, isSyntheticPreview } = useActiveBusiness();
  const [selectorOpen, setSelectorOpen] = useState(false);

  const businessDisplayName = activeBusiness?.name || 'اختر النشاط التجاري';

  return (
    <View className="w-full bg-background pt-2 pb-3 px-4 border-b border-border">
      {/* Top row: Brand & Action Icons */}
      <View className="flex-row items-center justify-between gap-3 mb-2">
        <View className="flex-row items-center gap-2">
          {/* WOW Brand Monogram Badge */}
          <View
            className="w-9 h-9 rounded-xl items-center justify-center shadow-sm"
            style={{ backgroundColor: '#FACC15' }}
          >
            <AppText
              variant="label"
              className="font-tajawal-bold text-base"
              style={{ color: '#0F172D' }}
            >
              W
            </AppText>
          </View>
          <View className="items-start">
            <AppText
              variant="caption"
              className="font-tajawal-bold text-xs"
              style={{ color: isDark ? '#A1A1AA' : '#5C6B80' }}
            >
              WOW • للتاجر
            </AppText>
            <AppText
              variant="label"
              className="font-tajawal-bold text-sm"
              style={{ color: colors.foreground }}
            >
              مساحة التاجر
            </AppText>
          </View>
        </View>

        {/* Action Icons: Notifications, Messages, Extra */}
        <View className="flex-row items-center gap-2">
          {extraRightBadge}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الرسائل"
            className="w-10 h-10 rounded-xl items-center justify-center active:opacity-75"
            style={{
              backgroundColor: isDark ? '#202024' : '#FFFFFF',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <MessageSquare size={18} color={colors.foreground} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="التنبيهات"
            className="w-10 h-10 rounded-xl items-center justify-center active:opacity-75 relative"
            style={{
              backgroundColor: isDark ? '#202024' : '#FFFFFF',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Bell size={18} color={colors.foreground} />
            <View
              className="absolute top-2 right-2 w-2 h-2 rounded-full"
              style={{ backgroundColor: '#FACC15' }}
            />
          </Pressable>
        </View>
      </View>

      {/* Screen Title & Subtitle (if specified) */}
      {title && (
        <View className="items-start mt-1 mb-2">
          <AppText
            variant="heading"
            className="font-tajawal-bold text-2xl"
            accessibilityRole="header"
            style={{ color: colors.foreground }}
          >
            {title}
          </AppText>
          {subtitle && (
            <AppText
              variant="caption"
              className="font-tajawal-medium text-xs mt-0.5"
              style={{ color: isDark ? '#A1A1AA' : '#5C6B80' }}
            >
              {subtitle}
            </AppText>
          )}
        </View>
      )}

      {/* Business Selector Dropdown */}
      {showBusinessSelector && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`النشاط الحالي: ${businessDisplayName}`}
          onPress={() => setSelectorOpen(true)}
          className="flex-row items-center justify-between p-2.5 rounded-xl active:opacity-80"
          style={{
            backgroundColor: isDark ? '#202024' : '#FFFFFF',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
            <View
              className="w-8 h-8 rounded-lg items-center justify-center"
              style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
            >
              <Store size={16} color="#D97706" />
            </View>
            <View className="items-start flex-1 min-w-0">
              <AppText
                variant="caption"
                className="font-tajawal-medium text-[11px]"
                style={{ color: isDark ? '#A1A1AA' : '#5C6B80' }}
              >
                النشاط الحالي
              </AppText>
              <AppText
                variant="label"
                numberOfLines={1}
                className="font-tajawal-bold text-sm"
                style={{ color: colors.foreground }}
              >
                {businessDisplayName}
              </AppText>
            </View>
          </View>
          <ChevronDown size={18} color={isDark ? '#A1A1AA' : '#5C6B80'} />
        </Pressable>
      )}

      {/* Business Switcher Modal */}
      <Modal
        visible={selectorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setSelectorOpen(false)}
        >
          <Pressable
            className="w-full max-w-sm rounded-2xl p-4 shadow-xl"
            style={{ backgroundColor: colors.surface }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <AppText variant="heading" className="font-tajawal-bold text-base">
                تبديل النشاط التجاري
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
                onPress={() => setSelectorOpen(false)}
                className="p-1 rounded-lg active:opacity-70"
              >
                <X size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <FlatList
              data={businesses}
              keyExtractor={(item) => item.id}
              className="my-2 max-h-60"
              renderItem={({ item }) => {
                const isSelected = item.id === activeBusiness?.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    onPress={() => {
                      setActiveBusinessId(item.id);
                      setSelectorOpen(false);
                    }}
                    className="flex-row items-center justify-between p-3 rounded-xl mb-1.5 active:opacity-75"
                    style={{
                      backgroundColor: isSelected
                        ? isDark
                          ? '#422006'
                          : '#FEF3C7'
                        : isDark
                        ? '#27272A'
                        : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: isSelected ? '#FACC15' : 'transparent',
                    }}
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                      <Building2
                        size={18}
                        color={isSelected ? '#D97706' : colors.foreground}
                      />
                      <AppText
                        variant="body"
                        className="font-tajawal-bold text-sm"
                        numberOfLines={1}
                        style={{ color: colors.foreground }}
                      >
                        {item.name}
                      </AppText>
                    </View>
                    {isSelected && <Check size={18} color="#D97706" />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View className="py-4 items-center">
                  <AppText variant="caption" muted>
                    لا توجد أنشطة تجارية مسجلة.
                  </AppText>
                </View>
              }
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إضافة نشاط تجاري جديد"
              onPress={() => {
                setSelectorOpen(false);
                router.push({
                  pathname: '/business/onboarding',
                  params: isSyntheticPreview ? { preview: '1' } : {},
                });
              }}
              className="flex-row items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border mt-1 active:opacity-75"
            >
              <Plus size={16} color={colors.foreground} />
              <AppText variant="label" className="font-tajawal-bold text-sm">
                + تسجيل نشاط تجاري جديد
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
