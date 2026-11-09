import { Platform, View } from 'react-native';
import {
  Calendar,
  Clock,
  Equal,
  FileText,
  HelpCircle,
  Layers,
  MapPin,
  ShieldAlert,
  Tag,
  Zap,
} from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';
import { usePublicOffer, type ComplaintType, type CustomerComplaint } from '@wow/api';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import {
  formatComplaintDate,
  formatComplaintReference,
  getComplaintTypeShortLabel,
} from './complaints-list-display';

export interface ComplaintSummaryCardProps {
  complaint: CustomerComplaint;
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

export function ComplaintSummaryCard({ complaint }: ComplaintSummaryCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = useWowColors();

  // Safely resolve public offer context if available from authorized discovery
  const offerQuery = usePublicOffer(complaint.offer_id);
  const publicOffer = offerQuery.data;

  const typeLabel = getComplaintTypeShortLabel(complaint.complaint_type);
  const referenceHash = formatComplaintReference(complaint.id, 'hash');
  const formattedCreatedDate = formatComplaintDate(complaint.created_at);
  const formattedIncidentDate = complaint.incident_at
    ? formatComplaintDate(complaint.incident_at)
    : 'غير محدد';

  // Branch resolution
  const resolvedBranch =
    complaint.branch_id && publicOffer?.branches
      ? publicOffer.branches.find((b) => b.id.toLowerCase() === complaint.branch_id?.toLowerCase())
      : null;
  const branchLabel = resolvedBranch?.name ?? (complaint.branch_id ? `فرع (${complaint.branch_id.slice(0, 8)})` : 'غير محدد');

  const offerTitle = publicOffer?.title ?? `معرّف العرض: ${complaint.offer_id.slice(0, 8)}...`;
  const merchantName = publicOffer?.business?.name;

  const iconColor = isDark ? '#F8FAFC' : '#0F172A';

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`ملخص الشكوى، ${referenceHash}، ${typeLabel}`}
      style={{
        width: '100%',
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        borderColor: isDark ? '#2C2C2E' : '#E2E8F0',
        borderWidth: 1,
        borderRadius: 18,
        padding: 18,
        gap: 16,
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
      {/* Header Row: Type Icon & Label + Status Badge */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flexShrink: 1,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {renderComplaintTypeIcon(complaint.complaint_type, iconColor, 20)}
          </View>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <AppText
              variant="caption"
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                textAlign: 'right',
              }}
            >
              نوع الشكوى
            </AppText>
            <AppText
              variant="heading"
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.foreground,
                textAlign: 'right',
              }}
            >
              {typeLabel}
            </AppText>
          </View>
        </View>

        <ComplaintStatusBadge status={complaint.status} />
      </View>

      {/* Case Identifier Row */}
      <View
        style={{
          backgroundColor: isDark ? '#262629' : '#F8FAFC',
          borderColor: isDark ? '#333338' : '#EDF2F7',
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 6,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <AppText
            variant="caption"
            style={{
              fontSize: 12.5,
              fontWeight: '600',
              color: colors.mutedForeground,
            }}
          >
            معرّف الشكوى
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: colors.foreground,
              fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
            }}
            selectable
          >
            {referenceHash}
          </AppText>
        </View>

        {/* Complete UUID access */}
        <AppText
          variant="caption"
          style={{
            fontSize: 11,
            color: colors.mutedForeground,
            fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
            textAlign: 'left',
          }}
          selectable
        >
          {complaint.id}
        </AppText>
      </View>

      {/* Structured Details Grid / Key-Value Rows */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: isDark ? '#262629' : '#F1F5F9',
          paddingTop: 12,
          gap: 12,
        }}
      >
        {/* Related Offer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Tag size={15} color={colors.mutedForeground} strokeWidth={2} />
            <AppText
              variant="caption"
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
              }}
            >
              العرض المرتبط:
            </AppText>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <AppText
              numberOfLines={2}
              style={{
                fontSize: 13.5,
                fontWeight: '700',
                color: colors.foreground,
                textAlign: 'left',
              }}
            >
              {offerTitle}
            </AppText>
            {merchantName && (
              <AppText
                variant="caption"
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  color: colors.mutedForeground,
                  textAlign: 'left',
                }}
              >
                {merchantName}
              </AppText>
            )}
          </View>
        </View>

        {/* Branch */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={15} color={colors.mutedForeground} strokeWidth={2} />
            <AppText
              variant="caption"
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
              }}
            >
              الفرع:
            </AppText>
          </View>
          <AppText
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.foreground,
            }}
          >
            {branchLabel}
          </AppText>
        </View>

        {/* Submission Date */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={15} color={colors.mutedForeground} strokeWidth={2} />
            <AppText
              variant="caption"
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
              }}
            >
              تاريخ تقديم الشكوى:
            </AppText>
          </View>
          <AppText
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.foreground,
            }}
          >
            {formattedCreatedDate}
          </AppText>
        </View>

        {/* Incident Date */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={15} color={colors.mutedForeground} strokeWidth={2} />
            <AppText
              variant="caption"
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
              }}
            >
              تاريخ الواقعة:
            </AppText>
          </View>
          <AppText
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: complaint.incident_at ? colors.foreground : colors.mutedForeground,
            }}
          >
            {formattedIncidentDate}
          </AppText>
        </View>
      </View>
    </View>
  );
}
