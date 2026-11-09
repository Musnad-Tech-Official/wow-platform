import { View } from 'react-native';
import { CheckCircle2, Info } from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';
import type { ComplaintStatus } from '@wow/api';

export interface ComplaintOutcomeCardProps {
  status: ComplaintStatus;
  publicOutcome: string | null;
}

export function ComplaintOutcomeCard({ status, publicOutcome }: ComplaintOutcomeCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = useWowColors();

  // Only displayed when closed or when public_outcome is populated
  if (status !== 'closed' && !publicOutcome) {
    return null;
  }

  const hasOutcome = Boolean(publicOutcome && publicOutcome.trim());

  return (
    <View
      accessibilityLabel="نتيجة وقرار الشكوى"
      style={{
        width: '100%',
        backgroundColor: hasOutcome
          ? isDark
            ? '#172554' // blue-950
            : '#EFF6FF' // blue-50
          : isDark
            ? '#1E293B' // slate-800
            : '#F8FAFC', // slate-50
        borderColor: hasOutcome
          ? isDark
            ? '#1E40AF' // blue-800
            : '#BFDBFE' // blue-200
          : isDark
            ? '#334155'
            : '#E2E8F0',
        borderWidth: 1,
        borderRadius: 18,
        padding: 18,
        gap: 12,
      }}
    >
      {/* Title Row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {hasOutcome ? (
            <CheckCircle2
              size={20}
              color={isDark ? '#93C5FD' : '#2563EB'}
              strokeWidth={2.2}
            />
          ) : (
            <Info
              size={20}
              color={isDark ? '#94A3B8' : '#64748B'}
              strokeWidth={2.2}
            />
          )}
          <AppText
            variant="heading"
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: hasOutcome
                ? isDark
                  ? '#DBEAFE'
                  : '#1E3A8A'
                : colors.foreground,
              textAlign: 'right',
            }}
          >
            {hasOutcome ? 'القرار والنتيجة الإدارية' : 'إغلاق ملف الشكوى'}
          </AppText>
        </View>

        {hasOutcome ? (
          <View
            style={{
              backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
              borderColor: isDark ? '#3B82F6' : '#93C5FD',
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <AppText
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isDark ? '#BFDBFE' : '#1E40AF',
              }}
            >
              قرار معتمد
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Outcome Text or Neutral State Notice */}
      {hasOutcome ? (
        <AppText
          selectable
          style={{
            fontSize: 14,
            lineHeight: 22,
            color: isDark ? '#E0F2FE' : '#1E293B',
            textAlign: 'right',
            writingDirection: 'rtl',
            fontWeight: '600',
          }}
        >
          {publicOutcome}
        </AppText>
      ) : (
        <AppText
          style={{
            fontSize: 13.5,
            lineHeight: 22,
            color: colors.mutedForeground,
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          تم إغلاق ملف الشكوى إدارياً من قِبل المنصة. لم يتم تدوين قرار علني إضافي لهذا السجل.
        </AppText>
      )}

      {/* Honest Administrative Footnote */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: hasOutcome
            ? isDark
              ? 'rgba(30, 64, 175, 0.4)'
              : 'rgba(191, 219, 254, 0.6)'
            : isDark
              ? '#334155'
              : '#E2E8F0',
          paddingTop: 8,
        }}
      >
        <AppText
          variant="caption"
          style={{
            fontSize: 12,
            lineHeight: 18,
            color: hasOutcome
              ? isDark
                ? '#93C5FD'
                : '#475569'
              : colors.mutedForeground,
            textAlign: 'right',
          }}
        >
          تنويه: إغلاق الشكوى هو حالة إدارية لإنهاء المتابعة ولا يُعد دليلاً تلقائياً على حصول العميل على تسوية أو تعويض.
        </AppText>
      </View>
    </View>
  );
}
