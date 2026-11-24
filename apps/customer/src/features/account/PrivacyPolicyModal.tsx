import { useEffect } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Lock, ShieldCheck, X } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppButton, AppText, InlineNotice } from '@wow/ui';
import { LegalDocumentLinks } from '../legal/LegalDocumentLinks';

export interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
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
            maxWidth: 520,
            maxHeight: '90%',
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
            gap: 16,
          }}
        >
          {/* Header with contained, high-contrast close button that never overflows in RTL or on 375px */}
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
                <Lock size={18} color={wowBrandColors.yellow} />
              </View>
              <AppText
                variant="heading"
                style={{
                  fontSize: 17,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'right',
                  flexShrink: 1,
                }}
                numberOfLines={2}
              >
                سياسة الخصوصية وحفظ البيانات
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

          {/* Scrollable Content Body */}
          <ScrollView
            style={{ flex: 1, flexShrink: 1 }}
            contentContainerStyle={{ gap: 14, paddingBottom: 6 }}
          >
            <LegalDocumentLinks />
            <AppText variant="caption" muted>الإرشادات التالية ملخص تشغيلي وليست بديلاً عن الوثيقة القانونية المعتمدة.</AppText>
            <InlineNotice
              title="طلب إغلاق الحساب لا يعني الحذف الفوري لسجلات التحقيق أو العمليات المسموح بالاحتفاظ بها نظاماً."
              tone="warning"
            />

            {/* Principle 1 */}
            <View
              style={{
                backgroundColor: isDark ? '#1C1C20' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color={wowBrandColors.yellow} />
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  حماية البيانات الشخصية
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
                تقتصر معالجة بيانات العميل على الأغراض المحددة لتشغيل المنصة، وتوثيق حفظ العروض والمتاجر، وتلقي الشكاوى ومتابعتها دون مشاركة البيانات مع جهات غير مخولة.
              </AppText>
            </View>

            {/* Principle 2 */}
            <View
              style={{
                backgroundColor: isDark ? '#1C1C20' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lock size={16} color={wowBrandColors.yellow} />
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  سجلات التحقيق والنزاعات
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
                في حال وجود بلاغات أو شكاوى جارية، تظل السجلات ذات الصلة محفوظة لضمان حقوق الأطراف والتحقق من الوقائع وفق المتطلبات الرقابية المعمول بها، ولا يتم التعهد بحذفها فورياً.
              </AppText>
            </View>

            {/* Principle 3 */}
            <View
              style={{
                backgroundColor: isDark ? '#1C1C20' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                gap: 6,
              }}
            >
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                قنوات الطلبات المعتمدة
              </AppText>
              <AppText
                variant="body"
                muted
                style={{
                  fontSize: 13,
                  lineHeight: 22,
                  textAlign: 'right',
                }}
              >
                يمكن تقديم طلبات الخصوصية ومتابعتها من الحساب. تسجيل الطلب لا يعني تنفيذه فوراً؛ تخضع المعالجة للتحقق والإجراءات المعتمدة.
              </AppText>
            </View>
          </ScrollView>

          {/* Fixed Footer Close Action */}
          <AppButton
            title="إغلاق"
            variant="secondary"
            onPress={onClose}
            style={{ minHeight: 48, borderRadius: 12, marginTop: 4 }}
          />
        </View>
      </View>
    </Modal>
  );
}
