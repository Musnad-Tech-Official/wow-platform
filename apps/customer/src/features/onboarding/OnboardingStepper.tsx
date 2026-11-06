import { View } from 'react-native';

export interface OnboardingStepperProps {
  currentStep: number; // 1, 2, or 3
  totalSteps?: number;
  isDark?: boolean;
}

export function OnboardingStepper({
  currentStep,
  totalSteps = 3,
  isDark = false,
}: OnboardingStepperProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`الخطوة ${currentStep} من ${totalSteps}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
      }}
    >
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;

        return (
          <View
            key={index}
            style={{
              width: isActive ? 24 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: isActive
                ? '#FACC15'
                : isDark
                  ? 'rgba(255, 255, 255, 0.2)'
                  : '#CBD5E1',
            }}
          />
        );
      })}
    </View>
  );
}