import React from 'react';
import { View, Pressable } from 'react-native';
import { Sun, Moon, Laptop } from 'lucide-react-native';
import { useTheme, type ThemeMode } from '@wow/theme';
import { AppText } from '@wow/ui';

interface CompactThemeControlProps {
  className?: string;
}

export function CompactThemeControl({ className = '' }: CompactThemeControlProps) {
  const { mode, setMode, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const options: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { id: 'light', label: 'فاتح', Icon: Sun },
    { id: 'system', label: 'تلقائي', Icon: Laptop },
    { id: 'dark', label: 'داكن', Icon: Moon },
  ];

  return (
    <View
      className={`flex-row items-center bg-[#F1F5F9] dark:bg-[#27272A] p-1 rounded-full border border-[#E2E8F0] dark:border-[#3F3F46] ${className}`}
      style={{ alignSelf: 'flex-start' }}
    >
      {options.map((item) => {
        const isSelected = mode === item.id;
        const IconComponent = item.Icon;

        return (
          <Pressable
            key={item.id}
            onPress={() => setMode(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`المظهر: ${item.label}`}
            accessibilityState={{ selected: isSelected }}
            hitSlop={8}
            style={{ minHeight: 40 }}
            className={`flex-row items-center justify-center px-2 sm:px-2.5 py-1 rounded-full transition-all ${
              isSelected
                ? 'bg-white dark:bg-[#18181B] shadow-sm border border-[#E2E8F0] dark:border-[#3F3F46]'
                : 'opacity-70'
            }`}
          >
            <IconComponent
              size={13}
              color={
                isSelected
                  ? isDark
                    ? '#FACC15'
                    : '#0F172D'
                  : isDark
                  ? '#A1A1AA'
                  : '#64748B'
              }
              strokeWidth={2}
            />
            <AppText
              className={`hidden sm:flex text-[11px] font-tajawal-medium mr-1.5 ${
                isSelected
                  ? 'text-[#0F172D] dark:text-white font-tajawal-bold'
                  : 'text-[#64748B] dark:text-[#A1A1AA]'
              }`}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
