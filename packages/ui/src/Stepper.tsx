import { ScrollView, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface StepperProps {
  steps: readonly string[];
  currentStep: number; // 0-based
}

/** Read-only progress through a workflow; actions live in the parent feature. */
export function Stepper({ steps, currentStep }: StepperProps) {
  const colors = useWowColors();
  return (
    <ScrollView {...rtlProps} horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 5 }}>
      {steps.map((label, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <View {...rtlProps} key={`${index}-${label}`} className="min-h-12 flex-row items-center gap-2 rounded-xl px-3"
            style={{ backgroundColor: active ? colors.primary : colors.surface,
              borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
            <View style={{ height: 25, width: 25, borderRadius: 13, alignItems: 'center',
              justifyContent: 'center', backgroundColor: done ? colors.successSurface :
                active ? colors.primaryForeground : colors.border }}>
              {done ? <Check color={colors.success} size={17} strokeWidth={2.5}/> : (
                <AppText variant="caption" style={{ color: active ? colors.primary : colors.foreground }}>
                  {index + 1}
                </AppText>
              )}
            </View>
            <AppText variant="label" style={{ color: active ? colors.primaryForeground : colors.foreground }}>
              {label}
            </AppText>
          </View>
        );
      })}
    </ScrollView>
  );
}
