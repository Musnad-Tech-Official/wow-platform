import { View } from 'react-native';
import { AlignRight } from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';

export interface ComplaintDescriptionCardProps {
  description: string;
}

export function ComplaintDescriptionCard({ description }: ComplaintDescriptionCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = useWowColors();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`نص ومحتوى الشكوى: ${description}`}
      style={{
        width: '100%',
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        borderColor: isDark ? '#2C2C2E' : '#E2E8F0',
        borderWidth: 1,
        borderRadius: 18,
        padding: 18,
        gap: 12,
        ...(isDark
          ? {}
          : {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }),
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#262629' : '#F1F5F9',
          paddingBottom: 10,
        }}
      >
        <AlignRight size={18} color={isDark ? '#FACC15' : '#CA8A04'} strokeWidth={2.2} />
        <AppText
          variant="heading"
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.foreground,
            textAlign: 'right',
          }}
        >
          نص الشكوى المقدمة
        </AppText>
      </View>

      {/* Description Content - Supports Long Text with No Truncation */}
      <AppText
        variant="body"
        selectable
        style={{
          fontSize: 14.5,
          lineHeight: 24,
          color: isDark ? '#E2E8F0' : '#1E293B',
          textAlign: 'right',
          writingDirection: 'rtl',
        }}
      >
        {description}
      </AppText>
    </View>
  );
}
