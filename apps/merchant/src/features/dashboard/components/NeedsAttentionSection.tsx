import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';

export interface AttentionItem {
  id: string;
  title: string;
  subtitle: string;
  actionText: string;
}

export interface NeedsAttentionSectionProps {
  items?: AttentionItem[];
}

export function NeedsAttentionSection({ items }: NeedsAttentionSectionProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { activeBusinessId, isSyntheticPreview } = useActiveBusiness();

  const handleGoOffers = () => {
    router.push({
      pathname: '/offers',
      params: {
        ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
        ...(isSyntheticPreview ? { preview: '1' } : {}),
      },
    });
  };

  const defaultMockItems: AttentionItem[] = [
    {
      id: 'mock-1',
      title: 'فحص وصيانة أجهزة الحاسوب',
      subtitle: 'مسودة عرض لم تُرسل للمراجعة بعد',
      actionText: 'استكمال',
    },
    {
      id: 'mock-2',
      title: 'شاحن أصلي — نسخة مراجعة',
      subtitle: 'مطلوب استكمال مستندات العرض',
      actionText: 'مراجعة',
    },
  ];

  const effectiveItems = items ?? (isSyntheticPreview ? defaultMockItems : []);

  return (
    <View className="w-full gap-3 mb-4">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="عرض كل ما يحتاج انتباهك"
          onPress={handleGoOffers}
          className="p-1 active:opacity-75"
        >
          <AppText
            variant="caption"
            className="font-tajawal-bold text-xs"
            style={{ color: colors.actionForeground || '#744A00' }}
          >
            عرض الكل ←
          </AppText>
        </Pressable>

        <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
          تحتاج انتباهك
        </AppText>
      </View>

      <View
        className="w-full rounded-2xl border divide-y divide-border overflow-hidden"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        {effectiveItems.length === 0 ? (
          <View className="p-4 items-center justify-center">
            <AppText variant="caption" muted className="font-tajawal-medium text-xs text-center">
              لا توجد مهام تتطلب انتباهك حاليًا — جميع عروضك بحالة جيدة.
            </AppText>
          </View>
        ) : (
          effectiveItems.map((item) => (
            <View key={item.id} className="p-3.5 flex-row items-center justify-between gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.actionText} ${item.title}`}
                onPress={handleGoOffers}
                className="px-3.5 py-1.5 rounded-xl active:opacity-80"
                style={{ backgroundColor: '#FACC15' }}
              >
                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-xs"
                  style={{ color: '#0F172D' }}
                >
                  {item.actionText}
                </AppText>
              </Pressable>

              <View className="flex-row items-center gap-3 flex-1 min-w-0 justify-end">
                <View className="items-end flex-1 min-w-0">
                  <AppText
                    variant="label"
                    numberOfLines={1}
                    className="font-tajawal-bold text-sm text-right"
                  >
                    {item.title}
                  </AppText>
                  <AppText
                    variant="caption"
                    muted
                    numberOfLines={1}
                    className="text-[11px] mt-0.5 text-right"
                  >
                    {item.subtitle}
                  </AppText>
                </View>

                <View
                  className="w-9 h-9 rounded-xl items-center justify-center shrink-0"
                  style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
                >
                  <FileText size={18} color="#D97706" />
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
