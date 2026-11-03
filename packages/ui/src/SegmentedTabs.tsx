import { Pressable, ScrollView } from 'react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export type WowTabOption = { value: string; label: string; disabled?: boolean };
export interface SegmentedTabsProps {
  tabs: readonly WowTabOption[];
  value: string;
  onValueChange: (value: string) => void;
  accessibilityLabel?: string;
}

/** On narrow phones tabs scroll; their text/tap target never shrink to fit. */
export function SegmentedTabs({ tabs, value, onValueChange, accessibilityLabel = 'التبويبات' }: SegmentedTabsProps) {
  const colors = useWowColors();
  return (
    <ScrollView {...rtlProps} horizontal showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}>
      {tabs.map(tab => {
        const selected = tab.value === value;
        return (
          <Pressable {...rtlProps} key={tab.value} accessibilityRole="tab"
            accessibilityLabel={tab.label} accessibilityState={{ selected, disabled: !!tab.disabled }}
            disabled={tab.disabled} onPress={() => onValueChange(tab.value)}
            style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center',
              paddingHorizontal: 18, borderRadius: 12, opacity: tab.disabled ? .5 : 1,
              backgroundColor: selected ? colors.primary : colors.surface,
              borderColor: selected ? colors.focusRing : colors.controlBorder, borderWidth: 1.5 }}>
            <AppText variant="label" style={{ color: selected ? colors.primaryForeground : colors.foreground }}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
