import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { AppText } from '@wow/ui';
import { useWowColors, useTheme } from '@wow/theme';

export interface OfferBusinessConflictModalProps {
  visible: boolean;
  draftBusinessName: string;
  onKeepDraft: () => void;
  onSwitchAndReset: () => void;
}

export function OfferBusinessConflictModal({
  visible,
  draftBusinessName,
  onKeepDraft,
  onSwitchAndReset,
}: OfferBusinessConflictModalProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 items-center justify-center p-5">
        <View
          className="w-full max-w-md rounded-2xl p-5 gap-4 border"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: isDark ? '#422006' : '#FEF3C7' }}
            >
              <AlertTriangle size={20} color="#D97706" />
            </View>
            <View className="flex-1 items-start">
              <AppText variant="heading" className="font-tajawal-bold text-base text-right">
                تغيير النشاط التجاري
              </AppText>
              <AppText variant="caption" muted className="text-right">
                مسودة العرض مرتبطة بنشاط محدد
              </AppText>
            </View>
          </View>

          <AppText variant="body" className="font-tajawal text-sm text-right leading-6">
            أنت تقوم حالياً بتحرير مسودة عرض تابعة لنشاط{' '}
            <AppText className="font-tajawal-bold" style={{ color: colors.primary }}>
              «{draftBusinessName}»
            </AppText>
            . لا يمكن نقل العرض آلياً بين الأنشطة التجارية حرصاً على مطابقة التراخيص والفروع المعتمدة.
          </AppText>

          <View className="gap-2.5 mt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="البقاء في النشاط الحالي ومتابعة المسودة"
              onPress={onKeepDraft}
              className="min-h-12 rounded-xl items-center justify-center active:opacity-85"
              style={{ backgroundColor: '#FACC15' }}
            >
              <AppText className="font-tajawal-bold text-sm" style={{ color: '#0F172D' }}>
                البقاء في «{draftBusinessName}»
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="بدء مسودة جديدة للنشاط المختار"
              onPress={onSwitchAndReset}
              className="min-h-12 rounded-xl items-center justify-center border active:opacity-75"
              style={{ borderColor: colors.border }}
            >
              <AppText className="font-tajawal-medium text-sm" style={{ color: colors.foreground }}>
                بدء مسودة جديدة للنشاط المختار
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
