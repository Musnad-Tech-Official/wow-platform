import { Linking, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';
import type { PublicBranch } from '@wow/api';
import { getDirectionsUrl, hasValidCoordinates } from './business-display';

export interface BusinessBranchCardProps {
  branch: PublicBranch;
  isDark: boolean;
}

export function BusinessBranchCard({ branch, isDark }: BusinessBranchCardProps) {
  const colors = useWowColors();

  const canNavigate = hasValidCoordinates(branch.latitude, branch.longitude);

  function handleDirections() {
    if (canNavigate && typeof branch.latitude === 'number' && typeof branch.longitude === 'number') {
      const url = getDirectionsUrl(branch.latitude, branch.longitude);
      Linking.openURL(url).catch(() => {});
    }
  }

  const locationParts: string[] = [];
  if (branch.city) locationParts.push(branch.city);
  if (branch.district) locationParts.push(branch.district);
  if (branch.address_line) locationParts.push(branch.address_line);
  const locationString = locationParts.join(' • ');

  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        gap: 10,
      }}
    >
      {/* Branch Header: Name + Primary badge */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <AppText
          variant="label"
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.foreground,
            flex: 1,
            textAlign: 'right',
          }}
        >
          {branch.name}
        </AppText>

        {branch.is_primary ? (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FEF9C3',
            }}
          >
            <AppText
              variant="caption"
              style={{
                fontSize: 11,
                color: isDark ? '#FACC15' : '#854D0E',
                fontWeight: '700',
              }}
            >
              الفرع الرئيسي
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Address Details */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
        <MapPin
          size={16}
          color={isDark ? '#94A3B8' : colors.mutedForeground}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <AppText
          variant="caption"
          style={{
            fontSize: 13,
            lineHeight: 20,
            color: isDark ? '#CBD5E1' : colors.mutedForeground,
            flex: 1,
            textAlign: 'right',
          }}
        >
          {locationString || 'العنوان غير محدد'}
        </AppText>
      </View>

      {/* Conditional Directions CTA (Only when valid coordinates exist) */}
      {canNavigate ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingTop: 2 }}>
          <AppButton
            title="الاتجاهات"
            variant="outline"
            size="sm"
            onPress={handleDirections}
          />
        </View>
      ) : null}
    </View>
  );
}
