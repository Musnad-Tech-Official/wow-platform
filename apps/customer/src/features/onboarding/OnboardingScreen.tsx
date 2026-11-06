import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useWowColors, useWowViewport } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import { useOnboardingStore } from '../../state/onboarding-store';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingHeroWelcome } from './OnboardingHeroWelcome';
import { OnboardingHeroDiscovery } from './OnboardingHeroDiscovery';
import { OnboardingStepper } from './OnboardingStepper';

export function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isDesktop } = useWowViewport();

  const [step, setStep] = useState<1 | 2>(1);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  function handleNext() {
    if (step === 1) {
      setStep(2);
    } else {
      // Step 2 completed: persist onboarding state and route to Continuation Options (/access)
      completeOnboarding();
      router.replace('/access');
    }
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Math.max(insets.top, 12),
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      {/* Responsive Desktop Wrapper (max-width 520px centered) */}
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isDesktop ? 520 : 480,
          alignSelf: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* 1. Header with Brand Identity and Conditional Back Arrow */}
        <OnboardingHeader
          onBack={step === 2 ? handleBack : undefined}
          isDark={isDark}
        />

        {/* 2. Main Scrollable Content */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 12,
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            /* Step 1: Welcome */
            <View style={{ alignItems: 'center', width: '100%', gap: 16 }}>
              <OnboardingHeroWelcome isDark={isDark} isDesktop={isDesktop} />

              <View style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
                <AppText
                  style={{
                    fontSize: isDesktop ? 28 : 26,
                    fontWeight: '900',
                    color: colors.foreground,
                    textAlign: 'center',
                  }}
                >
                  أهلاً بك في WOW
                </AppText>

                <AppText
                  style={{
                    fontSize: isDesktop ? 17 : 16,
                    fontWeight: '700',
                    color: colors.foreground,
                    textAlign: 'center',
                  }}
                >
                  كل عرض يستحق نظرة.
                </AppText>

                <AppText
                  style={{
                    fontSize: isDesktop ? 15 : 14,
                    color: isDark ? '#CBD5E1' : '#475569',
                    textAlign: 'center',
                    lineHeight: 24,
                    maxWidth: isDesktop ? 360 : 320,
                  }}
                >
                  مكان واحد لاستكشاف عروض التجار ومقارنة تفاصيلها.
                </AppText>
              </View>
            </View>
          ) : (
            /* Step 2: Discovery Introduction */
            <View style={{ alignItems: 'center', width: '100%', gap: 16 }}>
              <OnboardingHeroDiscovery isDark={isDark} isDesktop={isDesktop} />

              <View style={{ alignItems: 'center', gap: 8, marginTop: 12 }}>
                <AppText
                  style={{
                    fontSize: isDesktop ? 16 : 15,
                    fontWeight: '700',
                    color: colors.foreground,
                    textAlign: 'center',
                    lineHeight: 26,
                    maxWidth: isDesktop ? 360 : 320,
                  }}
                >
                  ابحث حسب التاجر أو التصنيف، واطلع على الأسعار والشروط والفروع المشاركة.
                </AppText>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 3. Stepper & Bottom Action Area */}
        <View style={{ paddingHorizontal: 24, gap: 8 }}>
          <OnboardingStepper currentStep={step} totalSteps={3} isDark={isDark} />

          <AppButton
            title={step === 1 ? 'التالي ←' : 'ابدأ الآن ←'}
            variant="primary"
            onPress={handleNext}
            style={{
              height: 52,
              borderRadius: 26,
            }}
          />
        </View>
      </View>
    </View>
  );
}