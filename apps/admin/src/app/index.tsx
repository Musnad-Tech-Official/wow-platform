import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
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
  X,
  UserRoundPlus,
  BadgePercent,
  MessageSquareWarning,
  Clock3,
  Settings,
} from 'lucide-react-native';

import { AppButton, AppText, AppInput, Badge, Card, Checkbox, Divider, IconButton, ThemeSwitcher } from '@wow/ui';
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
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState(false);

  // Temporary bridge until icons use shared
  // NativeWind semantic classes directly.
  const primaryColor =
    resolvedTheme === 'dark' ? '#FFD23F' : '#F5B700';

  const foregroundColor =
    resolvedTheme === 'dark' ? '#FAFAFA' : '#18181B';

  const filteredItems = activities.filter((activity) => (activity.message).includes(query.trim()));

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-10"
    >
      <View className="gap-7 px-5 pt-10">
        {__DEV__ && <AppButton title="Integration tests (development)" variant="secondary" onPress={() => router.push('/integration-test')} />}

        {/* Header */}
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 items-start gap-1">
            <AppText variant="label" muted className="font-tajawal">
              نظرة عامة على المنصة
            </AppText>

            <AppText variant="title"
              style={{ textAlign: 'right' }}
            >
              لوحة تحكم الإدارة
            </AppText>

            <AppText variant="label" muted className="font-tajawal"
              style={{ textAlign: 'right' }}
            >
              راقب أداء منصة واو وأدر جميع العمليات بسهولة.
            </AppText>
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
        <Card className="gap-3 p-4">
          <AppText className="font-tajawal-bold"
            style={{ textAlign: 'right' }}
          >
            مظهر التطبيق
          </AppText>

          <ThemeSwitcher />
          <Divider />
          <Checkbox
            label="تفعيل الإشعارات التجريبية"
            checked={notifications}
            onCheckedChange={setNotifications}
          />

          <AppText variant="caption" muted
            style={{ textAlign: 'right' }}
          >
            الوضع الحالي: {resolvedTheme === 'dark' ? 'داكن' : 'فاتح'}
          </AppText>
        </Card>

        {/* Platform Statistics */}
        <View className="gap-4">
          <AppText variant="heading"
            style={{ textAlign: 'right' }}
          >
            إحصائيات المنصة
          </AppText>

          <View className="flex-row flex-wrap gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <Card
                  key={stat.id}
                  className="min-w-36 flex-1 items-start gap-3 p-4"
                >
                  <View className="rounded-xl bg-background p-2.5">
                    <Icon
                      size={22}
                      color={primaryColor}
                      strokeWidth={1.8}
                    />
                  </View>

                  <AppText variant="label" muted className="font-tajawal"
                    style={{ textAlign: 'right' }}
                  >
                    {stat.title}
                  </AppText>

                  <AppText className="font-tajawal-bold text-2xl">
                    {stat.value}
                  </AppText>
                </Card>
              );
            })}
          </View>
        </View>

        {/* Administrative Actions */}
        <View className="gap-4">
          <AppText variant="heading"
            style={{ textAlign: 'right' }}
          >
            إدارة المنصة
          </AppText>

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
          <View className="flex-row gap-3">
            <Pressable
              onPress={() =>
                Alert.alert('المستخدمون', 'إدارة مستخدمي المنصة')
              }
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <Users size={18} color={foregroundColor} />

              <AppText variant="label">
                المستخدمون
              </AppText>
            </Pressable>

            <Pressable
              onPress={() =>
                Alert.alert('الإعدادات', 'إعدادات المنصة')
              }
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <Settings size={18} color={foregroundColor} />

              <AppText variant="label">
                الإعدادات
              </AppText>
            </Pressable>
          </View>
        </View>

        <Card>
          <AppText variant="heading" style={{ textAlign: 'right' }}>البحث في النشاطات</AppText>
          <AppInput
            label="البحث"
            placeholder="ابحث في النشاطات"
            value={query}
            onChangeText={setQuery}
            style={{ textAlign: 'right' }}
            returnKeyType="search"
          />
          <View className="flex-row items-center justify-between">
            <Badge label="بيانات تجريبية" variant="secondary" />
            <IconButton accessibilityLabel="مسح البحث" disabled={!query} onPress={() => setQuery('')}>
              <X size={20} color={foregroundColor} />
            </IconButton>
          </View>
        </Card>

        {/* Recent Activity */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <AppText variant="heading">
              آخر النشاطات
            </AppText>

            <Pressable
              onPress={() =>
                Alert.alert('النشاطات', 'عرض جميع النشاطات')
              }
              className="flex-row items-center gap-1"
            >
              <ArrowLeft size={16} color={primaryColor} />

              <AppText variant="label" className="text-primary">
                عرض الكل
              </AppText>
            </Pressable>
          </View>

          {filteredItems.length === 0 ? (
            <AppText muted style={{ textAlign: 'right' }}>لا توجد نتائج مطابقة للبحث.</AppText>
          ) : null}

          {filteredItems.map((activity) => {
            const Icon = activity.icon;

            return (
              <Pressable
                key={activity.id}
                onPress={() =>
                  Alert.alert('تفاصيل النشاط', activity.message)
                }
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <View className="rounded-xl bg-background p-3">
                  <Icon
                    size={22}
                    color={primaryColor}
                    strokeWidth={1.8}
                  />
                </View>

                <View className="flex-1 items-start gap-1">
                  <AppText variant="label" className="text-base"
                    style={{ textAlign: 'right' }}
                  >
                    {activity.message}
                  </AppText>

                  <View className="flex-row items-center gap-1">
                    <Clock3
                      size={13}
                      color={foregroundColor}
                    />

                    <AppText variant="caption" muted>
                      {activity.time}
                    </AppText>
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
