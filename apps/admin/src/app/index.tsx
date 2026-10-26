
import {
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';

import {
  Users,
  Store,
  ShoppingBag,
  ClipboardCheck,
  ShieldCheck,
  ArrowLeft,
  UserRoundPlus,
  BadgePercent,
  MessageSquareWarning,
  Clock3,
  Settings,
} from 'lucide-react-native';

import { AppButton, ThemeSwitcher } from '@wow/ui';
import { useTheme } from '@wow/theme';

const stats = [
  {
    id: 'users',
    title: 'إجمالي المستخدمين',
    value: '٢٬٤٥٠',
    icon: Users,
  },
  {
    id: 'merchants',
    title: 'التجار',
    value: '١٢٥',
    icon: Store,
  },
  {
    id: 'orders',
    title: 'إجمالي الطلبات',
    value: '٨٬٤٢٠',
    icon: ShoppingBag,
  },
  {
    id: 'pending',
    title: 'طلبات بانتظار المراجعة',
    value: '١٤',
    icon: ClipboardCheck,
  },
];

const activities = [
  {
    id: '1',
    message: 'تسجيل تاجر جديد',
    time: 'منذ ٥ دقائق',
    icon: UserRoundPlus,
  },
  {
    id: '2',
    message: 'تم تقديم عرض جديد',
    time: 'منذ ١٢ دقيقة',
    icon: BadgePercent,
  },
  {
    id: '3',
    message: 'تم استلام بلاغ من أحد العملاء',
    time: 'منذ ٣٠ دقيقة',
    icon: MessageSquareWarning,
  },
];

export default function AdminHome() {
  const { resolvedTheme } = useTheme();

  // Temporary bridge until icons use shared
  // NativeWind semantic classes directly.
  const primaryColor =
    resolvedTheme === 'dark' ? '#FFD23F' : '#F5B700';

  const foregroundColor =
    resolvedTheme === 'dark' ? '#FAFAFA' : '#18181B';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-10"
    >
      <View className="gap-7 px-5 pt-10">

        {/* Header */}
        <View className="flex-row-reverse items-center justify-between gap-3">
          <View className="flex-1 items-end gap-1">
            <Text className="font-tajawal text-sm text-muted-foreground">
              نظرة عامة على المنصة
            </Text>

            <Text
              className="font-tajawal-bold text-3xl text-foreground"
              style={{ textAlign: 'right' }}
            >
              لوحة تحكم الإدارة
            </Text>

            <Text
              className="font-tajawal text-sm text-muted-foreground"
              style={{ textAlign: 'right' }}
            >
              راقب أداء منصة واو وأدر جميع العمليات بسهولة.
            </Text>
          </View>

          <View className="rounded-2xl bg-surface p-3">
            <ShieldCheck
              size={28}
              color={primaryColor}
              strokeWidth={1.8}
            />
          </View>
        </View>

        {/* Theme Switcher */}
        <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
          <Text
            className="font-tajawal-bold text-base text-foreground"
            style={{ textAlign: 'right' }}
          >
            مظهر التطبيق
          </Text>

          <ThemeSwitcher />

          <Text
            className="font-tajawal text-xs text-muted-foreground"
            style={{ textAlign: 'right' }}
          >
            الوضع الحالي: {resolvedTheme === 'dark' ? 'داكن' : 'فاتح'}
          </Text>
        </View>

        {/* Platform Statistics */}
        <View className="gap-4">
          <Text
            className="font-tajawal-bold text-xl text-foreground"
            style={{ textAlign: 'right' }}
          >
            إحصائيات المنصة
          </Text>

          <View className="flex-row-reverse flex-wrap gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <View
                  key={stat.id}
                  className="min-w-36 flex-1 items-end gap-3 rounded-2xl border border-border bg-surface p-4"
                >
                  <View className="rounded-xl bg-background p-2.5">
                    <Icon
                      size={22}
                      color={primaryColor}
                      strokeWidth={1.8}
                    />
                  </View>

                  <Text
                    className="font-tajawal text-sm text-muted-foreground"
                    style={{ textAlign: 'right' }}
                  >
                    {stat.title}
                  </Text>

                  <Text className="font-tajawal-bold text-2xl text-foreground">
                    {stat.value}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Administrative Actions */}
        <View className="gap-4">
          <Text
            className="font-tajawal-bold text-xl text-foreground"
            style={{ textAlign: 'right' }}
          >
            إدارة المنصة
          </Text>

          <AppButton
            title="إدارة التجار"
            onPress={() =>
              Alert.alert('إدارة التجار', 'عرض وإدارة حسابات التجار')
            }
          />

          <AppButton
            title="مراجعة الطلبات المعلقة"
            variant="secondary"
            onPress={() =>
              Alert.alert('طلبات المراجعة', 'عرض الطلبات المعلقة')
            }
          />

          {/* Administrative Shortcuts */}
          <View className="flex-row-reverse gap-3">
            <Pressable
              onPress={() =>
                Alert.alert('المستخدمون', 'إدارة مستخدمي المنصة')
              }
              className="flex-1 flex-row-reverse items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <Users size={18} color={foregroundColor} />

              <Text className="font-tajawal-medium text-sm text-foreground">
                المستخدمون
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                Alert.alert('الإعدادات', 'إعدادات المنصة')
              }
              className="flex-1 flex-row-reverse items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <Settings size={18} color={foregroundColor} />

              <Text className="font-tajawal-medium text-sm text-foreground">
                الإعدادات
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="gap-4">
          <View className="flex-row-reverse items-center justify-between">
            <Text className="font-tajawal-bold text-xl text-foreground">
              آخر النشاطات
            </Text>

            <Pressable
              onPress={() =>
                Alert.alert('النشاطات', 'عرض جميع النشاطات')
              }
              className="flex-row items-center gap-1"
            >
              <ArrowLeft size={16} color={primaryColor} />

              <Text className="font-tajawal-medium text-sm text-primary">
                عرض الكل
              </Text>
            </Pressable>
          </View>

          {activities.map((activity) => {
            const Icon = activity.icon;

            return (
              <Pressable
                key={activity.id}
                onPress={() =>
                  Alert.alert('تفاصيل النشاط', activity.message)
                }
                className="flex-row-reverse items-center gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <View className="rounded-xl bg-background p-3">
                  <Icon
                    size={22}
                    color={primaryColor}
                    strokeWidth={1.8}
                  />
                </View>

                <View className="flex-1 items-end gap-1">
                  <Text
                    className="font-tajawal-medium text-base text-foreground"
                    style={{ textAlign: 'right' }}
                  >
                    {activity.message}
                  </Text>

                  <View className="flex-row-reverse items-center gap-1">
                    <Clock3
                      size={13}
                      color={foregroundColor}
                    />

                    <Text className="font-tajawal text-xs text-muted-foreground">
                      {activity.time}
                    </Text>
                  </View>
                </View>

                <ArrowLeft
                  size={18}
                  color={foregroundColor}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
