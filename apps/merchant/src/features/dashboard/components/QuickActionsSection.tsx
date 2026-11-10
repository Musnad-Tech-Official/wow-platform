import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppText } from '@wow/ui';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';

export function QuickActionsSection() {
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

  return (
    <View className="w-full gap-3 mb-4">
      <AppText variant="heading" className="font-tajawal-bold text-lg text-right">
        إجراءات سريعة
      </AppText>

      <View className="w-full flex-row items-center gap-3">
        <View className="flex-1">
          <AppButton
            title="إنشاء عرض (قيد التطوير)"
            variant="primary"
            size="lg"
            disabled
          />
        </View>

        <View className="flex-1">
          <AppButton
            title="إدارة العروض"
            variant="secondary"
            size="lg"
            onPress={handleGoOffers}
          />
        </View>
      </View>
    </View>
  );
}
