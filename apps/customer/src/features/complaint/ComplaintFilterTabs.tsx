import { Platform, Pressable, View } from 'react-native';
import { useTheme } from '@wow/theme';
import { AppText } from '@wow/ui';
import { COMPLAINT_FILTERS, type ComplaintFilter } from './complaints-list-display';

export interface ComplaintFilterTabsProps {
  activeFilter: ComplaintFilter;
  onSelectFilter: (filter: ComplaintFilter) => void;
  disabled?: boolean;
}

export function ComplaintFilterTabs({
  activeFilter,
  onSelectFilter,
  disabled = false,
}: ComplaintFilterTabsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  return (
    <View
      {...rtlWebProps}
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
      }}
    >
      {COMPLAINT_FILTERS.map((option) => {
        const isSelected = activeFilter === option.id;

        return (
          <Pressable
            key={option.id}
            disabled={disabled}
            onPress={() => onSelectFilter(option.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled }}
            accessibilityLabel={`تصفية الشكاوى: ${option.label}`}
            style={({ pressed }) => ({
              minHeight: 48,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isSelected
                ? '#FACC15' // WOW brand yellow
                : pressed
                  ? isDark
                    ? '#334155'
                    : '#E2E8F0'
                  : isDark
                    ? '#1E293B'
                    : '#F1F5F9',
              borderColor: isSelected
                ? '#EAB308'
                : isDark
                  ? '#334155'
                  : '#CBD5E1',
              opacity: disabled ? 0.5 : 1,
            })}
          >
            <AppText
              style={{
                fontSize: 14,
                fontWeight: isSelected ? '800' : '700',
                fontFamily: Platform.OS === 'web' ? 'Tajawal, sans-serif' : isSelected ? 'Tajawal_700Bold' : 'Tajawal_500Medium',
                color: isSelected
                  ? '#0F172A' // Dark slate for WCAG contrast on yellow
                  : isDark
                    ? '#E2E8F0'
                    : '#334155',
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
