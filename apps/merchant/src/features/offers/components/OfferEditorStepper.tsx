import React from 'react';
import { View, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { useTheme } from '@wow/theme';

export interface OfferEditorStepperProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  onStepPress?: (step: 1 | 2 | 3 | 4 | 5) => void;
}

export function OfferEditorStepper({ currentStep, onStepPress }: OfferEditorStepperProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const steps: { number: 1 | 2 | 3 | 4 | 5; label: string }[] = [
    { number: 1, label: 'التعريف' },
    { number: 2, label: 'القيمة' },
    { number: 3, label: 'الفروع' },
    { number: 4, label: 'المستندات' },
    { number: 5, label: 'المراجعة' },
  ];

  return (
    <View className="w-full gap-2 mb-4">
      {/* Header Caption */}
      <View className="flex-row items-center justify-between">
        <AppText
          variant="caption"
          className="font-tajawal-bold text-xs"
          style={{ color: isDark ? '#A1A1AA' : '#64748B' }}
        >
          الخطوة {currentStep} من 5
        </AppText>
        <AppText
          variant="caption"
          className="font-tajawal-bold text-xs"
          style={{ color: isDark ? '#A1A1AA' : '#64748B' }}
        >
          إنشاء / تعديل عرض
        </AppText>
      </View>

      {/* Stepper Dots & Labels Row */}
      <View className="flex-row items-center justify-between py-2 px-1">
        {steps.map((step, idx) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isAccessible = isCompleted && onStepPress;

          return (
            <React.Fragment key={step.number}>
              {/* Step Circle & Label */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`خطوة ${step.number}: ${step.label} (${
                  isActive ? 'الحالية' : isCompleted ? 'مكتملة' : 'قادمة'
                })`}
                disabled={!isAccessible}
                onPress={() => onStepPress?.(step.number)}
                className="items-center gap-1.5"
                style={{ opacity: isAccessible || isActive ? 1 : 0.6 }}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center border"
                  style={{
                    backgroundColor: isActive
                      ? '#FACC15'
                      : isCompleted
                      ? isDark
                        ? '#064E3B'
                        : '#DCFCE7'
                      : isDark
                      ? '#27272A'
                      : '#F1F5F9',
                    borderColor: isActive
                      ? '#EAB308'
                      : isCompleted
                      ? '#22C55E'
                      : isDark
                      ? '#3F3F46'
                      : '#E2E8F0',
                  }}
                >
                  {isCompleted ? (
                    <Check size={16} color="#15803D" strokeWidth={2.5} />
                  ) : (
                    <AppText
                      className="font-tajawal-bold text-xs"
                      style={{
                        color: isActive
                          ? '#0F172D'
                          : isDark
                          ? '#D4D4D8'
                          : '#64748B',
                      }}
                    >
                      {step.number}
                    </AppText>
                  )}
                </View>

                <AppText
                  variant="caption"
                  className="font-tajawal-bold text-[11px]"
                  style={{
                    color: isActive
                      ? isDark
                        ? '#FFFFFF'
                        : '#0F172D'
                      : isCompleted
                      ? isDark
                        ? '#A1A1AA'
                        : '#475569'
                      : isDark
                      ? '#71717A'
                      : '#94A3B8',
                  }}
                >
                  {step.label}
                </AppText>
              </Pressable>

              {/* Connecting line between steps */}
              {idx < steps.length - 1 && (
                <View
                  className="flex-1 h-0.5 mx-1.5 -mt-5"
                  style={{
                    backgroundColor: step.number < currentStep
                      ? '#22C55E'
                      : isDark
                      ? '#3F3F46'
                      : '#E2E8F0',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
