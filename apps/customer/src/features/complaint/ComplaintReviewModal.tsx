import { useEffect } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppButton, AppText } from '@wow/ui';

export interface ComplaintReviewModalProps {
  visible: boolean;
  offerTitle: string;
  businessName: string;
  complaintTypeLabel: string;
  description: string;
  branchName?: string | null;
  incidentDate?: string | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ComplaintReviewModal({
  visible,
  offerTitle,
  businessName,
  complaintTypeLabel,
  description,
  branchName,
  incidentDate,
  isSubmitting,
  onConfirm,
  onCancel,
}: ComplaintReviewModalProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  // Escape key handler on Web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, isSubmitting, onCancel]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isSubmitting) onCancel();
      }}
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
            maxWidth: 480,
            maxHeight: '90%',
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
            gap: 16,
          }}
        >
          {/* Header */}
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
                <AlertTriangle size={18} color={wowBrandColors.yellow} />
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
                مراجعة تفاصيل الشكوى
              </AppText>
            </View>

            <Pressable
              accessibilityLabel="إغلاق والتعديل"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onCancel}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#26262B' : '#F1F5F9',
                borderWidth: 1,
                borderColor: isDark ? '#3F3F46' : '#E2E8F0',
                opacity: isSubmitting ? 0.4 : pressed ? 0.7 : 1,
                flexShrink: 0,
              })}
            >
              <X size={18} color={isDark ? '#F4F4F5' : '#1E293B'} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Details Scroll Area */}
          <ScrollView
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Offer & Business */}
            <View
              style={{
                backgroundColor: isDark ? '#1E1E22' : '#F8FAFC',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 12,
                gap: 4,
              }}
            >
              <AppText variant="caption" muted style={{ fontSize: 12, textAlign: 'right' }}>
                العرض والمتجر
              </AppText>
              <AppText
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                {offerTitle}
              </AppText>
              <AppText
                variant="caption"
                muted
                style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'right' }}
              >
                {businessName}
              </AppText>
            </View>

            {/* Complaint Type */}
            <View
              style={{
                backgroundColor: isDark ? '#1E1E22' : '#F8FAFC',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 12,
                gap: 4,
              }}
            >
              <AppText variant="caption" muted style={{ fontSize: 12, textAlign: 'right' }}>
                نوع المشكلة
              </AppText>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: isDark ? '#FACC15' : '#854D0E',
                  textAlign: 'right',
                }}
              >
                {complaintTypeLabel}
              </AppText>
            </View>

            {/* Branch (if selected) */}
            {branchName ? (
              <View
                style={{
                  backgroundColor: isDark ? '#1E1E22' : '#F8FAFC',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  gap: 4,
                }}
              >
                <AppText variant="caption" muted style={{ fontSize: 12, textAlign: 'right' }}>
                  الفرع المعني
                </AppText>
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  {branchName}
                </AppText>
              </View>
            ) : null}

            {/* Incident Date (if provided) */}
            {incidentDate ? (
              <View
                style={{
                  backgroundColor: isDark ? '#1E1E22' : '#F8FAFC',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  gap: 4,
                }}
              >
                <AppText variant="caption" muted style={{ fontSize: 12, textAlign: 'right' }}>
                  تاريخ حدوث المشكلة
                </AppText>
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  {incidentDate}
                </AppText>
              </View>
            ) : null}

            {/* Description */}
            <View
              style={{
                backgroundColor: isDark ? '#1E1E22' : '#F8FAFC',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 12,
                gap: 4,
              }}
            >
              <AppText variant="caption" muted style={{ fontSize: 12, textAlign: 'right' }}>
                تفاصيل ما حدث
              </AppText>
              <AppText
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                {description}
              </AppText>
            </View>

            {/* Confirmation Note */}
            <AppText
              variant="caption"
              muted
              style={{
                fontSize: 12,
                lineHeight: 18,
                color: colors.mutedForeground,
                textAlign: 'center',
                paddingHorizontal: 8,
              }}
            >
              بالضغط على تأكيد الإرسال، سيتم تسجيل الشكوى رسمياً وإحالتها إلى إدارة منصة واو للتحقيق مع المتجر المعني.
            </AppText>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ gap: 8, paddingTop: 4 }}>
            <AppButton
              title="تأكيد إرسال الشكوى"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={onConfirm}
              style={{ minHeight: 48, borderRadius: 12 }}
            />
            <AppButton
              title="تعديل البيانات"
              variant="secondary"
              disabled={isSubmitting}
              onPress={onCancel}
              style={{ minHeight: 48, borderRadius: 12 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
