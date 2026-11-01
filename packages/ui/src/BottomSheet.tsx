import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useWowColors } from '@wow/theme';
import { AppText } from './AppText';
import { rtlProps } from './rtl';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

/** Accessible sheet with explicit close; no unimplemented swipe-to-dismiss claim. */
export function BottomSheet({ visible, title, children, onClose }: BottomSheetProps) {
  const colors = useWowColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: '#00000088' }}>
        <View {...rtlProps} style={{ width: '100%', maxHeight: '86%', maxWidth: 760,
          alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}>
          <View {...rtlProps} className="min-h-16 flex-row items-center justify-between gap-3 border-b border-border px-5 py-3">
            <AppText variant="heading" accessibilityRole="header">{title}</AppText>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="إغلاق اللوحة"
              className="min-h-12 min-w-12 items-center justify-center rounded-xl">
              <X color={colors.foreground} size={22}/>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
