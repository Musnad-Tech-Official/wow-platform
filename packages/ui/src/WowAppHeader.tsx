import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Single WOW mobile top-bar layout shared by customer, merchant and admin.
 * Apps provide the approved brand asset and their own action controls.
 */
export interface WowAppHeaderProps {
  brand: ReactNode;
  actions?: ReactNode;
}

export function WowAppHeader({ brand, actions }: WowAppHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 56,
      }}
    >
      <View style={{ alignItems: 'flex-start', justifyContent: 'center', flexShrink: 0 }}>
        {brand}
      </View>
      <View style={{ flexShrink: 1, alignItems: 'center', justifyContent: 'center' }}>
        {actions}
      </View>
    </View>
  );
}
