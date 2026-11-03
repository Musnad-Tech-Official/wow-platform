import { Pressable, View } from 'react-native';
import { Check, MapPin } from 'lucide-react-native';
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
      <View style={{ gap: 12 }}>
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
                      color: isSelected ? colors.foreground : colors.foreground,
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

        <AppText
          variant="caption"
          muted
          style={{ textAlign: 'center', marginTop: 8, fontSize: 11 }}
        >
          لا نستخدم موقع جهازك تلقائياً
        </AppText>
      </View>
    </BottomSheet>
  );
}
