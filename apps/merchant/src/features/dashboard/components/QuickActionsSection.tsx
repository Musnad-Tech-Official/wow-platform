import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppText } from '@wow/ui';
import { useCreateOffer } from '@wow/api';
import { useActiveBusiness } from '../../business/context/ActiveBusinessContext';

export function QuickActionsSection() {
  const { activeBusinessId, isSyntheticPreview } = useActiveBusiness();
  const create = useCreateOffer();
  const creating = useRef(false);
  const [error,setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!activeBusinessId || creating.current) return;
    creating.current = true; setError(null);
    try {
      // Creating a draft is the explicit action; the existing RPC enforces owner/employee branch permission.
      const offerId = isSyntheticPreview ? null : await create.mutateAsync({ businessId: activeBusinessId });
      router.push({ pathname: '/offers/editor', params: { businessId: activeBusinessId,
        ...(offerId ? { offerId } : {}), ...(isSyntheticPreview ? { preview: '1' } : {}) } });
    } catch {
      setError('تعذّر تأكيد إنشاء العرض. تحقق من صلاحية إعداد المسودات وقائمة العروض قبل إعادة المحاولة.');
    } finally { creating.current = false; }
  }

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
            title="إنشاء عرض"
            variant="primary"
            size="lg"
            disabled={!activeBusinessId || create.isPending}
            loading={create.isPending}
            onPress={() => void handleCreate()}
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
      {error && <AppText accessibilityLiveRegion="polite">{error}</AppText>}
    </View>
  );
}
