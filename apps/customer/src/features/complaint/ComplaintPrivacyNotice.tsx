import { View } from 'react-native';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { useTheme, useWowColors } from '@wow/theme';
import { AppText } from '@wow/ui';

export function ComplaintPrivacyNotice() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = useWowColors();

  return (
    <View
      accessibilityLabel="سياسة الخصوصية والمتابعة"
      style={{
        width: '100%',
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        borderColor: isDark ? '#2C2C2E' : '#E2E8F0',
        borderWidth: 1,
        borderRadius: 18,
        padding: 18,
        gap: 12,
        ...(isDark
          ? {}
          : {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#262629' : '#F1F5F9',
          paddingBottom: 10,
        }}
      >
        <Lock size={16} color={isDark ? '#FACC15' : '#CA8A04'} strokeWidth={2.2} />
        <AppText
          variant="heading"
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.foreground,
            textAlign: 'right',
          }}
        >
          خصوصية الشكوى والمتابعة
        </AppText>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <ShieldCheck size={14} color="#10B981" strokeWidth={2.5} style={{ marginTop: 3 }} />
          <AppText
            variant="caption"
            style={{
              flex: 1,
              fontSize: 12.5,
              lineHeight: 19,
              color: colors.mutedForeground,
              textAlign: 'right',
            }}
          >
            الملاحظات والتقارير الإدارية الداخلية محجوبة وتقتصر على فريق التدقيق والمطابقة بالمنصة.
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <ShieldCheck size={14} color="#10B981" strokeWidth={2.5} style={{ marginTop: 3 }} />
          <AppText
            variant="caption"
            style={{
              flex: 1,
              fontSize: 12.5,
              lineHeight: 19,
              color: colors.mutedForeground,
              textAlign: 'right',
            }}
          >
            ردود المتجر المرسلة إلى إدارة المنصة لا تُنشر مباشرة، وتخضع للمراجعة والتدقيق الإداري.
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <ShieldCheck size={14} color="#10B981" strokeWidth={2.5} style={{ marginTop: 3 }} />
          <AppText
            variant="caption"
            style={{
              flex: 1,
              fontSize: 12.5,
              lineHeight: 19,
              color: colors.mutedForeground,
              textAlign: 'right',
            }}
          >
            لا يُعرض في هذا السجل سوى التحديثات والقرارات المعتمدة والمصرح بمشاركتها مع المستفيد.
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <ShieldCheck size={14} color="#10B981" strokeWidth={2.5} style={{ marginTop: 3 }} />
          <AppText
            variant="caption"
            style={{
              flex: 1,
              fontSize: 12.5,
              lineHeight: 19,
              color: colors.mutedForeground,
              textAlign: 'right',
            }}
          >
            لا تتيح المنصة أي محادثات جانبية غير مدققة بين المتجر والعميل حفاظاً على الحياد والشفافية.
          </AppText>
        </View>
      </View>
    </View>
  );
}
