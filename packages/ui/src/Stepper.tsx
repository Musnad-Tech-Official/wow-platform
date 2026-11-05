import { ScrollView, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface StepperProps {
  steps: readonly string[];
  currentStep: number; // 0-based
  variant?: 'pills' | 'connected';
}

/** Read-only progress through a workflow; actions live in the parent feature. */
export function Stepper({ steps, currentStep, variant = 'pills' }: StepperProps) {
  const colors = useWowColors();

  if (variant === 'connected') {
    return (
      <View
        {...rtlProps}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: steps.length, now: currentStep + 1 }}
        accessibilityLabel={`الخطوة ${currentStep + 1} من ${steps.length}: ${steps[currentStep] ?? ''}`}
        className="w-full py-2"
      >
        <View style={{ position: 'relative', width: '100%' }}>
          {/* Connecting track line behind circles */}
          <View
            style={{
              position: 'absolute',
              top: 18,
              left: 28,
              right: 28,
              height: 2,
              backgroundColor: colors.border,
              zIndex: 0,
            }}
          />

          <View
            {...rtlProps}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              width: '100%',
              zIndex: 1,
            }}
          >
            {steps.map((label, index) => {
              const done = index < currentStep;
              const active = index === currentStep;

              return (
                <View
                  {...rtlProps}
                  key={`${index}-${label}`}
                  style={{ flex: 1, alignItems: 'center' }}
                  accessibilityLabel={`الخطوة ${index + 1}: ${label}${active ? ' (الحالية)' : done ? ' (مكتملة)' : ''}`}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active
                        ? colors.primary
                        : done
                          ? colors.successSurface
                          : colors.surface,
                      borderWidth: active ? 0 : 1.5,
                      borderColor: done ? colors.success : colors.border,
                    }}
                  >
                    {done ? (
                      <Check color={colors.success} size={18} strokeWidth={2.5} />
                    ) : (
                      <Text
                        allowFontScaling
                        maxFontSizeMultiplier={1.3}
                        style={{
                          fontFamily: active ? 'Tajawal-Bold' : 'Tajawal-Medium',
                          fontSize: 15,
                          lineHeight: 20,
                          includeFontPadding: false,
                          textAlign: 'center',
                          color: active ? colors.primaryForeground : colors.mutedForeground,
                        }}
                      >
                        {String(index + 1)}
                      </Text>
                    )}
                  </View>
                  <AppText
                    variant="caption"
                    style={{
                      marginTop: 8,
                      textAlign: 'center',
                      fontFamily: active ? 'Tajawal-Bold' : 'Tajawal-Regular',
                      color: active ? colors.foreground : colors.mutedForeground,
                    }}
                  >
                    {label}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

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
