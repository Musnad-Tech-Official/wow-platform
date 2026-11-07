import { Platform, Pressable, View } from 'react-native';
import { ChevronLeft, FileSpreadsheet, Lock, ShieldAlert, UserX } from 'lucide-react-native';
import { useTheme, useWowColors, wowBrandColors } from '@wow/theme';
import { AppButton, AppText, InlineNotice } from '@wow/ui';

export interface PrivacyClosureSectionProps {
  onPressViewPolicy: () => void;
  onPressRequestAction: (actionTitle: string, description: string) => void;
}

export function PrivacyClosureSection({
  onPressViewPolicy,
  onPressRequestAction,
}: PrivacyClosureSectionProps) {
  const colors = useWowColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rtlWebProps = Platform.OS === 'web' ? { dir: 'rtl' as const } : {};

  const privacyItems = [
    {
      id: 'access',
      title: 'طلب نسخة من البيانات الشخصية',
      description: 'الحصول على سجل تفصيلي للبيانات المسجلة المرتبطة بحسابك',
      icon: FileSpreadsheet,
    },
    {
      id: 'correct',
      title: 'طلب تصحيح البيانات',
      description: 'تقديم طلب مراجعة أو تعديل للبيانات الرسمية المرتبطة بالحساب',
      icon: ShieldAlert,
    },
    {
      id: 'close',
      title: 'طلب إغلاق الحساب عند السماح',
      description: 'الاطلاع على شروط وآثار إغلاق الحساب وسجلات النزاعات',
      icon: UserX,
    },
  ];

  return (
    <View style={{ gap: 10, width: '100%' }}>
      {/* Section Header */}
      <AppText
        variant="heading"
        style={{
          fontSize: 16,
          fontWeight: '800',
          color: colors.foreground,
          textAlign: 'right',
          paddingHorizontal: 4,
        }}
      >
        طلبات الخصوصية وبيانات الحساب
      </AppText>

      {/* Main Container Card */}
      <View
        {...rtlWebProps}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          gap: 14,
        }}
      >
        {/* Retention & Integrity Warning Notice */}
        <InlineNotice
          title="طلب إغلاق الحساب لا يعني الحذف الفوري لسجلات التحقيق أو النزاعات المسموح بالاحتفاظ بها وفق اللوائح المعتمدة."
          tone="warning"
        />

        {/* View Policy Row */}
        <Pressable
          {...rtlWebProps}
          onPress={onPressViewPolicy}
          accessibilityRole="button"
          accessibilityLabel="عرض سياسة الخصوصية وحفظ البيانات"
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Lock size={16} color={wowBrandColors.yellow} />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: colors.foreground,
                textAlign: 'right',
              }}
            >
              عرض سياسة الخصوصية وحفظ البيانات
            </AppText>
          </View>

          <ChevronLeft
            size={18}
            color={isDark ? '#94A3B8' : '#64748B'}
            strokeWidth={2}
          />
        </Pressable>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border }} />

        {/* Privacy Action Items */}
        <View style={{ gap: 8 }}>
          {privacyItems.map((item) => {
            const IconComponent = item.icon;

            return (
              <Pressable
                key={item.id}
                onPress={() => onPressRequestAction(item.title, item.description)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityHint={item.description}
                style={({ pressed }) => ({
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: pressed
                    ? isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.03)'
                    : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: isDark ? '#2D2D32' : '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComponent
                      size={16}
                      color={isDark ? '#CBD5E1' : '#475569'}
                      strokeWidth={2}
                    />
                  </View>

                  <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: colors.foreground,
                        textAlign: 'right',
                      }}
                    >
                      {item.title}
                    </AppText>
                    <AppText
                      variant="caption"
                      muted
                      style={{
                        fontSize: 11,
                        textAlign: 'right',
                      }}
                    >
                      {item.description}
                    </AppText>
                  </View>
                </View>

                <ChevronLeft
                  size={16}
                  color={isDark ? '#94A3B8' : '#64748B'}
                  strokeWidth={2}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Bottom Submission Actions (Disabled / Honest State) */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <AppButton
            title="تقديم طلب (غير متاح)"
            variant="outline"
            disabled
            style={{ flex: 1, minHeight: 44, borderRadius: 10 }}
          />
          <AppButton
            title="متابعة الطلبات (غير متاح)"
            variant="secondary"
            disabled
            style={{ flex: 1, minHeight: 44, borderRadius: 10 }}
          />
        </View>
      </View>
    </View>
  );
}
