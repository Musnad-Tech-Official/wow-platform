import { View, Pressable } from 'react-native';
import { Check, ShieldCheck } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText, BottomSheet } from '@wow/ui';
import type { RepresentativeRole } from '@wow/api';

export interface RepresentativeRoleOption {
  id: RepresentativeRole;
  label: string;
  description: string;
}

export const REPRESENTATIVE_ROLE_OPTIONS: readonly RepresentativeRoleOption[] = [
  {
    id: 'owner',
    label: 'مالك النشاط',
    description: 'مالك المنشأة وصاحب الصلاحية الأساسية في إدارة النشاط.',
  },
  {
    id: 'authorized_representative',
    label: 'مفوض رسمي',
    description: 'مفوض رسمي بموجب تفويض صادر من المنشأة لتمثيلها.',
  },
  {
    id: 'legal_agent',
    label: 'وكيل شرعي',
    description: 'وكيل بموجب وكالة شرعية أو نظامية سارية تخوله بالإدارة.',
  },
  {
    id: 'manager',
    label: 'مدير مفوض',
    description: 'مدير تنفيذي أو مفوض بالإدارة والتشغيل والتمثيل الرسمي.',
  },
] as const;

export interface RoleSelectSheetProps {
  visible: boolean;
  selectedRole: RepresentativeRole;
  onSelect: (role: RepresentativeRole) => void;
  onClose: () => void;
}

export function RoleSelectSheet({
  visible,
  selectedRole,
  onSelect,
  onClose,
}: RoleSelectSheetProps) {
  const colors = useWowColors();

  return (
    <BottomSheet
      visible={visible}
      title="اختيار صفة التمثيل"
      onClose={onClose}
    >
      <View className="gap-3 py-2">
        <AppText variant="caption" muted className="leading-5 text-right">
          حدد صفة تمثيل المفوض للنشاط التجاري وفق الوثائق والمستندات الرسمية.
        </AppText>

        <View className="gap-2.5 pt-1">
          {REPRESENTATIVE_ROLE_OPTIONS.map((option) => {
            const isSelected = option.id === selectedRole;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${option.label}: ${option.description}`}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
                className="min-h-12 flex-row items-center justify-between rounded-xl px-4 py-3 active:opacity-80"
                style={{
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? `${colors.primary}15` : colors.surface,
                }}
              >
                {/* Right side in RTL: Title & Subtitle */}
                <View className="min-w-0 flex-1 items-start gap-1 pr-2">
                  <View className="flex-row items-center gap-2">
                    <ShieldCheck
                      size={18}
                      color={isSelected ? colors.primary : colors.mutedForeground}
                      strokeWidth={1.8}
                    />
                    <AppText
                      className={isSelected ? 'font-tajawal-bold' : 'font-tajawal-medium'}
                      style={{
                        fontSize: 15,
                        color: isSelected ? colors.foreground : colors.foreground,
                      }}
                    >
                      {option.label}
                    </AppText>
                  </View>
                  <AppText variant="caption" muted style={{ fontSize: 12, lineHeight: 18 }}>
                    {option.description}
                  </AppText>
                </View>

                {/* Left side in RTL: Radio Indicator */}
                {isSelected ? (
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
                    <Check size={16} color={colors.primaryForeground} strokeWidth={2.5} />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: colors.border,
                      backgroundColor: 'transparent',
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}
