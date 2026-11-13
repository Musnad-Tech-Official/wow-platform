import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  Home,
  Store,
  Tag,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react-native';
import { useWowColors, useTheme } from '@wow/theme';
import { AppText } from '@wow/ui';
import { useActiveBusiness } from '../business/context/ActiveBusinessContext';

export type MerchantTab = 'home' | 'businesses' | 'offers' | 'complaints' | 'more';

export interface MerchantBottomNavProps {
  currentTab: MerchantTab;
}

export function MerchantBottomNav({ currentTab }: MerchantBottomNavProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { activeBusinessId, isSyntheticPreview } = useActiveBusiness();

  const navParams = {
    ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    ...(isSyntheticPreview ? { preview: '1' } : {}),
  };

  const tabs: {
    key: MerchantTab;
    label: string;
    icon: typeof Home;
    onPress: () => void;
  }[] = [
    {
      key: 'home',
      label: 'الرئيسية',
      icon: Home,
      onPress: () => {
        if (currentTab !== 'home') {
          router.replace({ pathname: '/', params: navParams });
        }
      },
    },
    {
      key: 'businesses',
      label: 'الفروع',
      icon: Store,
      onPress: () => {
        if (currentTab !== 'businesses') {
          router.replace({
            pathname: '/business/branches',
            params: navParams,
          });
        }
      },
    },
    {
      key: 'offers',
      label: 'العروض',
      icon: Tag,
      onPress: () => {
        if (currentTab !== 'offers') {
          router.replace({ pathname: '/offers', params: navParams });
        }
      },
    },
    {
      key: 'complaints',
      label: 'الشكاوى',
      icon: MessageSquare,
      onPress: () => {
        if (currentTab !== 'complaints') {
          router.replace({ pathname: '/complaints', params: navParams });
        }
      },
    },
    {
      key: 'more',
      label: 'المزيد',
      icon: MoreHorizontal,
      onPress: () => {
        if (currentTab !== 'more') {
          router.replace({ pathname: '/business/account', params: navParams });
        }
      },
    },
  ];

  return (
    <View
      accessibilityRole="tablist"
      className="w-full flex-row items-center justify-around border-t border-border px-2 py-2"
      style={{
        backgroundColor: colors.surface,
        minHeight: 64,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === currentTab;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            onPress={tab.onPress}
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center justify-center min-h-[48px] py-1 active:opacity-75"
          >
            {isActive ? (
              <View
                className="w-12 h-9 rounded-2xl items-center justify-center mb-0.5 shadow-sm"
                style={{ backgroundColor: '#FACC15' }}
              >
                <Icon size={20} color="#0F172D" strokeWidth={2.2} />
              </View>
            ) : (
              <View className="w-12 h-9 items-center justify-center mb-0.5">
                <Icon
                  size={20}
                  color={isDark ? '#A1A1AA' : '#64748B'}
                  strokeWidth={1.8}
                />
              </View>
            )}
            <AppText
              variant="caption"
              className={`font-tajawal-bold text-[11px] ${
                isActive ? 'text-foreground font-tajawal-bold' : 'text-muted-foreground'
              }`}
              style={{
                color: isActive
                  ? colors.foreground
                  : isDark
                  ? '#A1A1AA'
                  : '#64748B',
              }}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
