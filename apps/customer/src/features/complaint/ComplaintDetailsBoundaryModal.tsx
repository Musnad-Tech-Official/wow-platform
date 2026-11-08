import { useEffect } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText, InlineNotice } from '@wow/ui';
import type { CustomerComplaint } from '@wow/api';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import {
  formatComplaintDate,
  formatComplaintReference,
  getComplaintTypeShortLabel,
} from './complaints-list-display';

export interface ComplaintDetailsBoundaryModalProps {
  visible: boolean;
  complaint: CustomerComplaint | null;
  onClose: () => void;
}

export function ComplaintDetailsBoundaryModal({
  visible,
  complaint,
  onClose,
}: ComplaintDetailsBoundaryModalProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  // Escape key support on Web
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

  if (!complaint) return null;

  const typeLabel = getComplaintTypeShortLabel(complaint.complaint_type);
  const referenceHash = formatComplaintReference(complaint.id, 'hash');
  const createdDate = formatComplaintDate(complaint.created_at);

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
            maxWidth: 480,
            maxHeight: '85%',
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
            gap: 16,
          }}
        >
          {/* Header Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            {/* Title container */}
            <View style={{ flex: 1, flexShrink: 1, gap: 4 }}>
              <AppText
                variant="heading"
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                بيانات الشكوى
              </AppText>
              <AppText
                variant="caption"
                muted
                style={{
                  fontSize: 12,
                  textAlign: 'right',
                }}
              >
                {referenceHash}
              </AppText>
            </View>

            {/* Close button with 48pt touch target */}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="إغلاق نافذة تفاصيل الشكوى"
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: pressed
                  ? isDark
                    ? '#334155'
                    : '#E2E8F0'
                  : isDark
                    ? '#1E293B'
                    : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <X size={20} color={isDark ? '#E2E8F0' : '#475569'} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Status & Type */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ gap: 2 }}>
                <AppText
                  variant="caption"
                  muted
                  style={{ fontSize: 11, textAlign: 'right' }}
                >
                  نوع البلاغ
                </AppText>
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  {typeLabel}
                </AppText>
              </View>

              <ComplaintStatusBadge status={complaint.status} />
            </View>

            {/* Date */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 4,
              }}
            >
              <AppText variant="caption" muted style={{ fontSize: 12 }}>
                تاريخ تقديم البلاغ:
              </AppText>
              <AppText
                style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}
              >
                {createdDate}
              </AppText>
            </View>

            {/* Description */}
            <View style={{ gap: 6 }}>
              <AppText
                variant="caption"
                muted
                style={{ fontSize: 12, textAlign: 'right' }}
              >
                تفاصيل الشكوى المسجلة:
              </AppText>
              <View
                style={{
                  backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <AppText
                  variant="body"
                  style={{
                    fontSize: 13,
                    lineHeight: 20,
                    color: colors.foreground,
                    textAlign: 'right',
                  }}
                >
                  {complaint.description}
                </AppText>
              </View>
            </View>

            {/* CUS-09 Honest Boundary Notice */}
            <InlineNotice
              tone="info"
              title="متابعة التفاصيل الكاملة (CUS-09)"
              description="تفاصيل الشكوى الموسعة، والجدول الزمني للإجراءات، ومتابعة التواصل المباشر مع إدارة المنصة قيد التطوير وستتوفر ضمن التحديث القادم."
            />
          </ScrollView>

          {/* Action button */}
          <AppButton
            title="إغلاق"
            variant="secondary"
            onPress={onClose}
            accessibilityLabel="إغلاق"
            style={{ width: '100%', minHeight: 48 }}
          />
        </View>
      </View>
    </Modal>
  );
}
