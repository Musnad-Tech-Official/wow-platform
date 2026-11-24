import { useEffect } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Mail, Phone, ShieldAlert, User, X } from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppButton, AppText, InlineNotice } from '@wow/ui';
import {
  resolveAccountStatusInfo,
  resolveCustomerDisplayName,
  resolveCustomerEmail,
  resolveCustomerPhone,
  type CustomerUserLike,
  type AccountStatusSource,
} from './account-display';

export interface AccountInformationModalProps {
  visible: boolean;
  user?: CustomerUserLike | null;
  accountStatus?: string | null;
  accountStatusSource?: AccountStatusSource;
  onClose: () => void;
}

export function AccountInformationModal({
  visible,
  user,
  accountStatus,
  accountStatusSource,
  onClose,
}: AccountInformationModalProps) {
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

  const displayName = resolveCustomerDisplayName(user);
  const email = resolveCustomerEmail(user) ?? 'غير مسجل';
  const phone = resolveCustomerPhone(user) ?? 'غير مسجل';
  const userId = user?.id ?? 'غير متوفر';
  const statusInfo = resolveAccountStatusInfo(accountStatus, accountStatusSource);

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
            maxHeight: '90%',
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
            <AppText
              variant="heading"
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.foreground,
                textAlign: 'right',
                flex: 1,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              معلومات الحساب المعتمدة
            </AppText>

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

          <ScrollView
            style={{ flex: 1, flexShrink: 1 }}
            contentContainerStyle={{ gap: 14, paddingBottom: 4 }}
          >
            {/* Informational Guidance Notice */}
            <InlineNotice
              title="عرض البيانات المسجلة لحسابك. تعديل البيانات الأساسية يتطلب قنوات التحقق الرسمية لضمان أمان الحساب."
              tone="info"
            />

            {/* Field 1: Name */}
            <View
              style={{
                backgroundColor: isDark ? '#1C1C20' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <User size={15} color={colors.mutedForeground} />
                <AppText variant="caption" muted style={{ textAlign: 'right' }}>
                  الاسم المسجل
                </AppText>
              </View>
              <AppText
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                {displayName}
              </AppText>
            </View>

            {/* Field 2: Email */}
            <View
              style={{
                backgroundColor: isDark ? '#1C1C20' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Mail size={15} color={colors.mutedForeground} />
                <AppText variant="caption" muted style={{ textAlign: 'right' }}>
                  البريد الإلكتروني
                </AppText>
              </View>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.foreground,
                  textAlign: 'right',
                  direction: 'ltr',
                }}
              >
                {email}
              </AppText>
            </View>

            {/* Field 3: Phone */}
            <View
              style={{
                backgroundColor: isDark ? '#1C1C20' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Phone size={15} color={colors.mutedForeground} />
                <AppText variant="caption" muted style={{ textAlign: 'right' }}>
                  رقم الهاتف
                </AppText>
              </View>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.foreground,
                  textAlign: 'right',
                  direction: 'ltr',
                }}
              >
                {phone}
              </AppText>
            </View>

            {/* Field 4: Status / ID */}
            <View
              style={{
                backgroundColor: isDark ? '#1C1C20' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={15} color={colors.mutedForeground} />
                <AppText variant="caption" muted style={{ textAlign: 'right' }}>
                  حالة الحساب ومعرّف الهوية
                </AppText>
              </View>
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.foreground,
                  textAlign: 'right',
                }}
              >
                حالة الحساب: {statusInfo.label}
              </AppText>
              <AppText
                variant="caption"
                muted
                style={{
                  fontSize: 11,
                  textAlign: 'right',
                  direction: 'ltr',
                }}
                numberOfLines={1}
              >
                معرّف الحساب: {userId}
              </AppText>
            </View>
          </ScrollView>

          {/* Close Action */}
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
