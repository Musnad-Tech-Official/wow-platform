import { Platform, View } from 'react-native';
import { useTheme } from '@wow/theme';
import { AppText } from '@wow/ui';
import type { ComplaintStatus } from '@wow/api';
import { resolveComplaintStatusInfo } from './complaints-list-display';

export interface ComplaintStatusBadgeProps {
  status: ComplaintStatus;
}

export function ComplaintStatusBadge({ status }: ComplaintStatusBadgeProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const info = resolveComplaintStatusInfo(status);
  const colors = isDark ? info.dark : info.light;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`حالة الشكوى: ${info.label}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText
        style={{
          color: colors.text,
          fontSize: 12,
          fontWeight: '700',
          fontFamily: Platform.OS === 'web' ? 'Tajawal, sans-serif' : 'Tajawal_700Bold',
        }}
      >
        {info.label}
      </AppText>
    </View>
  );
}
