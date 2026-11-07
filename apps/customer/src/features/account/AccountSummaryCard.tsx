import { Platform, Pressable, View } from 'react-native';
import { ChevronLeft, UserRound } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppText, StatusBadge } from '@wow/ui';
import {
  resolveAccountStatusInfo,
  resolveCustomerDisplayName,
  resolveCustomerEmail,
  type CustomerUserLike,
} from './account-display';

export interface AccountSummaryCardProps {
  user?: CustomerUserLike | null;
  accountStatus?: string | null;
  onPressViewProfile?: () => void;
}

export function AccountSummaryCard({
  user,
  accountStatus,
  onPressViewProfile,
}: AccountSummaryCardProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  const displayName = resolveCustomerDisplayName(user);
  const email = resolveCustomerEmail(user);
  const statusInfo = resolveAccountStatusInfo(accountStatus, user);

  return (
    <View
      {...rtlWebProps}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 16,
      }}
    >
      {/* User Header Block */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {/* Avatar Circle */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: wowBrandColors.yellow,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: isDark ? '#3F3F46' : '#FEFCE8',
          }}
          accessibilityRole="image"
          accessibilityLabel="صورة الحساب الشخصي"
        >
          <UserRound size={32} color={wowBrandColors.navy} strokeWidth={2.2} />
        </View>

        {/* User Info Texts */}
        <View style={{ flex: 1, gap: 4, minWidth: 0, alignItems: 'flex-start' }}>
          <AppText
            variant="heading"
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: colors.foreground,
              textAlign: 'right',
            }}
            numberOfLines={1}
          >
            {displayName}
          </AppText>

          {email ? (
            <AppText
              variant="caption"
              muted
              style={{
                fontSize: 13,
                textAlign: 'right',
                direction: 'ltr',
              }}
              numberOfLines={1}
            >
              {email}
            </AppText>
          ) : (
            <AppText variant="caption" muted style={{ fontSize: 13, textAlign: 'right' }}>
              البريد الإلكتروني غير مسجل
            </AppText>
          )}

          {/* Authoritative account status (unconditional security badge and fake sync removed) */}
          <View style={{ marginTop: 2 }}>
            <StatusBadge
              label={statusInfo.label}
              tone={statusInfo.tone}
            />
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.border, width: '100%' }} />

      {/* Permitted Profile Details View Entry (Honest view-only label, no fake edit claim) */}
      <Pressable
        {...rtlWebProps}
        onPress={onPressViewProfile}
        accessibilityRole="button"
        accessibilityLabel="عرض معلومات الحساب"
        accessibilityHint="يعرض تفاصيل البيانات الشخصية المسجلة وتفاصيل الحساب المعتمدة"
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: pressed
            ? isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.04)'
            : isDark
              ? 'rgba(255,255,255,0.02)'
              : '#F8FAFC',
          borderWidth: 1,
          borderColor: isDark ? '#2D2D32' : '#F1F5F9',
        })}
      >
        <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
          <AppText
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.foreground,
              textAlign: 'right',
            }}
          >
            عرض معلومات الحساب
          </AppText>
          <AppText
            variant="caption"
            muted
            style={{
              fontSize: 12,
              textAlign: 'right',
            }}
          >
            الاطلاع على البيانات المسجلة وتفاصيل الحساب المعتمدة
          </AppText>
        </View>

        <ChevronLeft
          size={18}
          color={isDark ? '#94A3B8' : '#64748B'}
          strokeWidth={2}
        />
      </Pressable>
    </View>
  );
}
