import { Pressable, View } from 'react-native';
import { Check, Info, MapPin } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText, BottomSheet } from '@wow/ui';
import { APPROVED_AREAS, type AreaId } from './home-data';

export interface RegionSelectorSheetProps {
  visible: boolean;
  selectedArea: AreaId;
  onSelectArea: (areaId: AreaId) => void;
  onClose: () => void;
}

export function RegionSelectorSheet({
  visible,
  selectedArea,
  onSelectArea,
  onClose,
}: RegionSelectorSheetProps) {
  const colors = useWowColors();

  return (
    <BottomSheet visible={visible} title="اختر المنطقة" onClose={onClose}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          {APPROVED_AREAS.map((area) => {
            const isSelected = selectedArea === area.id;
            return (
              <Pressable
                key={area.id}
                accessibilityRole="button"
                accessibilityLabel={`منطقة ${area.label}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onSelectArea(area.id);
                  onClose();
                }}
                style={{
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: isSelected ? colors.neutralSurface : colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.focusRing : colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MapPin
                    size={18}
                    color={isSelected ? colors.actionForeground : colors.mutedForeground}
                  />
                  <AppText
                    variant="label"
                    style={{
                      fontSize: 15,
                      fontWeight: isSelected ? '800' : '500',
                      color: colors.foreground,
                    }}
                  >
                    {area.label}
                  </AppText>
                </View>

                {isSelected && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={14} color={colors.primaryForeground} strokeWidth={2.6} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Clear, honest unavailable state for granular city/district filtering */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.neutralSurface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Info size={18} color={colors.mutedForeground} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText
              variant="label"
              style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}
            >
              دليل المناطق قيد الاعتماد
            </AppText>
            <AppText
              variant="caption"
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                lineHeight: 18,
              }}
            >
              يتم حالياً استكشاف العروض من كافة المناطق. خاصية تصفية المتاجر حسب المدن والأحياء قيد الاعتماد وستتوفر فور اكتمال دليل المناطق الجغرافية المعتمد.
            </AppText>
          </View>
        </View>

        <AppText
          variant="caption"
          muted
          style={{ textAlign: 'center', marginTop: 4, fontSize: 11 }}
        >
          لا نستخدم موقع جهازك تلقائياً
        </AppText>
      </View>
    </BottomSheet>
  );
}
