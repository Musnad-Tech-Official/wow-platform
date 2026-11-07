import { useEffect } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { FileText, ShieldAlert, X } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppButton, AppText, InlineNotice } from '@wow/ui';

export interface ComplaintsNoticeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ComplaintsNoticeModal({ visible, onClose }: ComplaintsNoticeModalProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  // Escape key handler on Web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          {...rtlWebProps}
          style={{
            width: '100%',
            maxWidth: 460,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
            gap: 16,
          }}
        >
          {/* Header with contained, high-contrast close button */}
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
                flex: 1,
                flexShrink: 1,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(250, 204, 21, 0.15)' : '#FEFCE8',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText size={18} color={wowBrandColors.yellow} />
              </View>
              <AppText
                variant="heading"
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'right',
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                شكاواي ومتابعة البلاغات
              </AppText>
            </View>

            <Pressable
              accessibilityLabel="إغلاق النافذة"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                minWidth: 48,
                minHeight: 48,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#26262B' : '#F1F5F9',
                borderWidth: 1,
                borderColor: isDark ? '#3F3F46' : '#E2E8F0',
                opacity: pressed ? 0.7 : 1,
                flexShrink: 0,
              })}
            >
              <X size={20} color={isDark ? '#F4F4F5' : '#1E293B'} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Body Notice */}
          <View style={{ gap: 12 }}>
            <InlineNotice
              title="مسار متابعة الشكاوى (CUS-08) قيد التطوير والربط وفق المسار المعتمد."
              tone="info"
            />

            <View
              style={{
                backgroundColor: isDark ? '#1E1E22' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={16} color={colors.mutedForeground} />
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  حالة الخدمة وسجلات الشكاوى
                </AppText>
              </View>

              <AppText
                variant="body"
                muted
                style={{
                  fontSize: 13,
                  lineHeight: 22,
                  textAlign: 'right',
                }}
              >
                لا يتم عرض سجلات تجريبية أو وهمية. عند تفعيل مسار الشكاوى رسمياً، ستتمكن من الاطلاع على كافة البلاغات المقدمة وحالات المتابعة بشكل آمن وموثوق.
              </AppText>
            </View>
          </View>

          {/* Close Action */}
          <AppButton
            title="فهمت ذلك"
            variant="primary"
            onPress={onClose}
            style={{ minHeight: 48, borderRadius: 12, marginTop: 4 }}
          />
        </View>
      </View>
    </Modal>
  );
}
