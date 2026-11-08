import { View, Platform } from 'react-native';
import { Tag, Building2, MapPin } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppText, Card } from '@wow/ui';

export interface ComplaintOfferSummaryCardProps {
  offerTitle: string;
  businessName: string;
  offerId: string;
  branchesCount?: number;
  selectedBranchName?: string | null;
}

export function ComplaintOfferSummaryCard({
  offerTitle,
  businessName,
  offerId,
  branchesCount = 0,
  selectedBranchName,
}: ComplaintOfferSummaryCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  return (
    <Card
      {...rtlWebProps}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FEFCE8',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Tag size={16} color={wowBrandColors.yellow} />
        </View>
        <AppText
          variant="label"
          muted
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: colors.mutedForeground,
            textAlign: 'right',
          }}
        >
          العرض المعني بالشكوى
        </AppText>
      </View>

      <View style={{ gap: 4 }}>
        <AppText
          variant="heading"
          style={{
            fontSize: 17,
            fontWeight: '800',
            color: colors.foreground,
            textAlign: 'right',
            lineHeight: 24,
          }}
          numberOfLines={2}
        >
          {offerTitle}
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Building2 size={14} color={colors.mutedForeground} />
          <AppText
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.foreground,
              textAlign: 'right',
            }}
          >
            {businessName}
          </AppText>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 10,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppText
            variant="caption"
            muted
            style={{ fontSize: 12, color: colors.mutedForeground }}
          >
            مرجع العرض:
          </AppText>
          <AppText
            variant="caption"
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.foreground,
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            }}
          >
            {offerId.slice(0, 8).toUpperCase()}
          </AppText>
        </View>

        {selectedBranchName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color={wowBrandColors.yellow} />
            <AppText
              variant="caption"
              style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}
            >
              الفرع: {selectedBranchName}
            </AppText>
          </View>
        ) : branchesCount > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color={colors.mutedForeground} />
            <AppText
              variant="caption"
              muted
              style={{ fontSize: 12, color: colors.mutedForeground }}
            >
              {branchesCount} {branchesCount === 1 ? 'فرع مشارك' : 'فروع مشاركة'}
            </AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
