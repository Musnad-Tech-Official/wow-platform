import { View, Image, Platform } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { wowIllustrations } from '@wow/assets';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText, StatusBadge } from '@wow/ui';

export function ComplaintEvidenceNotice() {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  return (
    <View
      {...rtlWebProps}
      style={{
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: isDark ? '#3F3F46' : '#CBD5E1',
        borderRadius: 16,
        padding: 20,
        backgroundColor: isDark ? 'rgba(39, 39, 42, 0.4)' : '#F8FAFC',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Guidance illustration or icon */}
      <View
        style={{
          width: 80,
          height: 80,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
          backgroundColor: isDark ? 'rgba(250, 204, 21, 0.08)' : '#FEFCE8',
          overflow: 'hidden',
        }}
      >
        <Image
          source={wowIllustrations.customer.complaintGuidance}
          style={{ width: 70, height: 70 }}
          resizeMode="contain"
          accessibilityLabel="رسم توضيحي لإرشادات تقديم الشكوى"
        />
      </View>

      <View style={{ alignItems: 'center', gap: 6, width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <AppText
            variant="heading"
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.foreground,
              textAlign: 'center',
            }}
          >
            المرفقات والأدلة الداعمة
          </AppText>
          <StatusBadge label="بعد إرسال الشكوى" tone="neutral" />
        </View>

        <AppText
          variant="body"
          muted
          style={{
            fontSize: 13,
            lineHeight: 20,
            color: colors.mutedForeground,
            textAlign: 'center',
            maxWidth: 380,
          }}
        >
          يمكنك إرفاق الأدلة من تفاصيل الشكوى بعد تسجيلها. لن تُرفع ملفات أثناء إرسال النموذج.
        </AppText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: isDark ? '#1E1E22' : '#F1F5F9',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
        }}
      >
        <ShieldAlert size={14} color={colors.mutedForeground} />
        <AppText
          variant="caption"
          muted
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
            textAlign: 'center',
          }}
        >
          أرفق المستندات اللازمة فقط، واحجب المعلومات الحساسة غير المتعلقة بالشكوى.
        </AppText>
      </View>
    </View>
  );
}
