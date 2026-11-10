import React, { useState } from 'react';
import { View, Pressable, Modal, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, ChevronDown, Store, Check, Plus, X, Building2 } from 'lucide-react-native';
import { wowBrand } from '@wow/assets';
import { useWowColors, useTheme } from '@wow/theme';
import { AppText, WowAppHeader } from '@wow/ui';
import { useActiveBusiness } from '../business/context/ActiveBusinessContext';

export interface MerchantAppHeaderProps {
  title?: string;
  subtitle?: string;
  showBusinessSelector?: boolean;
  extraRightBadge?: React.ReactNode;
}

/**
 * Merchant variant of the customer header shell.
 * Official yellow WOW logo on navy app-icon background; no surrogate W monogram.
 */
export function MerchantAppHeader({
  showBusinessSelector = true,
}: MerchantAppHeaderProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { activeBusiness, businesses, setActiveBusinessId, isSyntheticPreview } = useActiveBusiness();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const businessDisplayName = activeBusiness?.name || 'اختر النشاط التجاري';

  return (
    <>
      <WowAppHeader
        brand={
          <Image
            source={wowBrand.appIcon}
            contentFit="contain"
            alt="شعار واو الأصفر على خلفية كحلية"
            style={{ width: 50, height: 50, borderRadius: 13 }}
          />
        }
        actions={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            {showBusinessSelector ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={'النشاط الحالي: ' + businessDisplayName}
                onPress={() => setSelectorOpen(true)}
                style={{
                  height: 44,
                  maxWidth: 216,
                  flexShrink: 1,
                  minWidth: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Store size={17} color="#FACC15" />
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={{ flexShrink: 1, fontWeight: '700', color: colors.foreground }}
                >
                  {businessDisplayName}
                </AppText>
                <ChevronDown size={16} color={isDark ? '#A1A1AA' : '#0F172D'} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="التنبيهات (قيد التطوير)"
              disabled
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Bell size={18} color={colors.foreground} />
            </Pressable>
          </View>
        }
      />
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
    </>
  );
}
