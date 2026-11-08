import { Platform, Pressable, View } from 'react-native';
import {
  Equal,
  FileText,
  HelpCircle,
  Layers,
  ShieldAlert,
  Zap,
} from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';
import type { ComplaintType, CustomerComplaint } from '@wow/api';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import {
  formatComplaintDate,
  formatComplaintReference,
  getComplaintTypeShortLabel,
  resolveComplaintStatusInfo,
} from './complaints-list-display';

export interface ComplaintCardProps {
  complaint: CustomerComplaint;
  onPress?: (complaint: CustomerComplaint) => void;
  disabled?: boolean;
}

function renderComplaintTypeIcon(type: ComplaintType, color: string, size = 18) {
  switch (type) {
    case 'price_mismatch':
      return <Equal size={size} color={color} strokeWidth={2.2} />;
    case 'unavailable':
      return <Zap size={size} color={color} strokeWidth={2.2} />;
    case 'misleading_terms':
      return <FileText size={size} color={color} strokeWidth={2.2} />;
    case 'product_mismatch':
      return <Layers size={size} color={color} strokeWidth={2.2} />;
    case 'business_conduct':
      return <ShieldAlert size={size} color={color} strokeWidth={2.2} />;
    case 'other':
    default:
      return <HelpCircle size={size} color={color} strokeWidth={2.2} />;
  }
}

export function ComplaintCard({ complaint, onPress, disabled = false }: ComplaintCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = useWowColors();
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  const typeLabel = getComplaintTypeShortLabel(complaint.complaint_type);
  const statusInfo = resolveComplaintStatusInfo(complaint.status);
  const referenceText = formatComplaintReference(complaint.id);
  const formattedDate = formatComplaintDate(complaint.created_at);

  const iconColor = isDark ? '#F8FAFC' : '#0F172A';

  const accessibilityLabel = `${typeLabel}، حالة الشكوى: ${statusInfo.label}، ${referenceText}، ${formattedDate}`;

  return (
    <Pressable
      {...rtlWebProps}
      disabled={disabled}
      onPress={() => onPress?.(complaint)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="يعرض تفاصيل وإشعار متابعة الشكوى"
      style={({ pressed }) => ({
        width: '100%',
        minHeight: 110,
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        borderColor: pressed
          ? isDark
            ? '#475569'
            : '#CBD5E1'
          : isDark
            ? '#2C2C2E'
            : '#E2E8F0',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        // Responsive card elevation/shadow on mobile & web
        ...(isDark
          ? {}
          : {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }),
        transform: [{ scale: pressed ? 0.995 : 1 }],
      })}
    >
      {/* Top Header Row: Status Badge (left/end) & Type with Icon (right/start) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 12,
        }}
      >
        {/* Right side in RTL: Icon + Complaint Type Title */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexShrink: 1,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {renderComplaintTypeIcon(complaint.complaint_type, iconColor, 18)}
          </View>

          <AppText
            variant="heading"
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.foreground,
              textAlign: 'right',
            }}
          >
            {typeLabel}
          </AppText>
        </View>

        {/* Left side in RTL: Status Badge */}
        <ComplaintStatusBadge status={complaint.status} />
      </View>

      {/* Middle Row: Description Preview */}
      <AppText
        variant="body"
        numberOfLines={2}
        ellipsizeMode="tail"
        style={{
          fontSize: 13.5,
          lineHeight: 20,
          color: colors.mutedForeground,
          textAlign: 'right',
          width: '100%',
        }}
      >
        {complaint.description}
      </AppText>

      {/* Bottom Meta Row: Reference Code & Submission Date */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: isDark ? '#262629' : '#F1F5F9',
        }}
      >
        {/* Reference Code */}
        <AppText
          variant="caption"
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
            fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
            fontWeight: '600',
          }}
        >
          {referenceText}
        </AppText>

        {/* Date */}
        <AppText
          variant="caption"
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
            fontWeight: '600',
          }}
        >
          {formattedDate}
        </AppText>
      </View>
    </Pressable>
  );
}
