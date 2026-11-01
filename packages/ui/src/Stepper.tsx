import { ScrollView, Text, View } from 'react-native';
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
            <View style={{ width: 30, height: 30, borderRadius: 15,
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              backgroundColor: done ? colors.successSurface :
                active ? colors.primaryForeground : colors.border }}>
              {done ? <Check color={colors.success} size={17} strokeWidth={2.5}/> : (
                <Text
                  allowFontScaling
                  maxFontSizeMultiplier={1.3}
                  style={{
                    width: 30,
                    height: 30,
                    fontFamily: 'Tajawal-Bold',
                    fontSize: 15,
                    lineHeight: 30,
                    includeFontPadding: false,
                    textAlign: 'center',
                    textAlignVertical: 'center',
                    writingDirection: 'ltr',
                    color: active ? colors.primary : colors.foreground,
                  }}
                >
                  {String(index + 1)}
                </Text>
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
