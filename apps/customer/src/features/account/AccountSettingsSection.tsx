import { Platform, Pressable, View } from 'react-native';
import { Bell, Laptop, Moon, Palette, Sun } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors, type ThemeMode } from '@wow/theme';
import { AppText, StatusBadge } from '@wow/ui';

export function AccountSettingsSection() {
  const colors = useWowColors();
  const { mode, setMode, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'light', label: 'فاتح', icon: Sun },
    { mode: 'dark', label: 'داكن', icon: Moon },
    { mode: 'system', label: 'تلقائي', icon: Laptop },
  ];

  return (
    <View style={{ gap: 10, width: '100%' }}>
      {/* Section Header */}
      <AppText
        variant="heading"
        style={{
          fontSize: 16,
          fontWeight: '800',
          color: colors.foreground,
          textAlign: 'right',
          paddingHorizontal: 4,
        }}
      >
        إعدادات الحساب
      </AppText>

      {/* Settings Card */}
      <View
        {...rtlWebProps}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          gap: 16,
        }}
      >
        {/* Item 1: Theme Switcher */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Palette size={18} color={isDark ? '#E2E8F0' : '#334155'} strokeWidth={2} />
            </View>

            <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                مظهر التطبيق
              </AppText>
              <AppText
                variant="caption"
                muted
                style={{
                  fontSize: 12,
                  textAlign: 'right',
                }}
              >
                التبديل بين الوضع الفاتح والداكن أو اتباع نظام الجهاز
              </AppText>
            </View>
          </View>

          {/* Theme Mode Selector Buttons */}
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              backgroundColor: isDark ? '#1C1C20' : '#F1F5F9',
              padding: 4,
              borderRadius: 12,
            }}
          >
            {themeOptions.map((opt) => {
              const isSelected = mode === opt.mode;
              const IconComponent = opt.icon;

              return (
                <Pressable
                  key={opt.mode}
                  onPress={() => setMode(opt.mode)}
                  accessibilityRole="button"
                  accessibilityLabel={`تغيير المظهر إلى ${opt.label}`}
                  accessibilityState={{ selected: isSelected }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRadius: 8,
                    backgroundColor: isSelected
                      ? isDark
                        ? '#2D2D35'
                        : '#FFFFFF'
                      : 'transparent',
                    borderWidth: isSelected ? 1 : 0,
                    borderColor: isSelected
                      ? isDark
                        ? '#3F3F46'
                        : '#E2E8F0'
                      : 'transparent',
                    shadowColor: isSelected ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isSelected ? 0.08 : 0,
                    shadowRadius: 2,
                    elevation: isSelected ? 1 : 0,
                  }}
                >
                  <IconComponent
                    size={16}
                    color={
                      isSelected
                        ? isDark
                          ? wowBrandColors.yellow
                          : '#0F172D'
                        : colors.mutedForeground
                    }
                    strokeWidth={isSelected ? 2.2 : 1.8}
                  />
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? colors.foreground : colors.mutedForeground,
                      textAlign: 'center',
                    }}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border }} />

        {/* Item 2: Push Notifications (Honest Unconfigured State) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} color={isDark ? '#E2E8F0' : '#334155'} strokeWidth={2} />
            </View>

            <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                إشعارات التنبيهات
              </AppText>
              <AppText
                variant="caption"
                muted
                style={{
                  fontSize: 12,
                  textAlign: 'right',
                }}
              >
                خدمة الإشعارات الفورية غير متصلة على هذا الجهاز
              </AppText>
            </View>
          </View>

          {/* Honest status badge: no fake working toggle */}
          <StatusBadge
            label="غير متوفرة"
            tone="neutral"
          />
        </View>
      </View>
    </View>
  );
}
