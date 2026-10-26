
import {
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';

import {
  Wallet,
  Clock3,
  Package,
  BadgePercent,
  Plus,
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
  Truck,
  Store,
} from 'lucide-react-native';

import {
  AppButton,
  ThemeSwitcher,
} from '@wow/ui';

import { useTheme } from '@wow/theme';

const stats = [
  {
    id: 'sales',
    title: 'مبيعات اليوم',
    value: '١٢٥٬٠٠٠',
    unit: 'ريال يمني',
    icon: Wallet,
  },
  {
    id: 'pending',
    title: 'الطلبات المعلقة',
    value: '٨',
    unit: 'طلبات',
    icon: Clock3,
  },
  {
    id: 'products',
    title: 'المنتجات',
    value: '٤٦',
    unit: 'منتج نشط',
    icon: Package,
  },
  {
    id: 'offers',
    title: 'العروض',
    value: '١٢',
    unit: 'عرض فعال',
    icon: BadgePercent,
  },
];

const orders = [
  {
    id: '#1025',
    customer: 'العميل أحمد',
    status: 'قيد الانتظار',
    type: 'pending',
  },
  {
    id: '#1024',
    customer: 'العميلة سارة',
    status: 'مكتمل',
    type: 'completed',
  },
  {
    id: '#1023',
    customer: 'العميل محمد',
    status: 'قيد التجهيز',
    type: 'processing',
  },
] as const;

export default function MerchantHome() {
  const { resolvedTheme } = useTheme();

  const iconColor =
    resolvedTheme === 'dark' ? '#FAFAFA' : '#18181B';

  const primaryColor =
    resolvedTheme === 'dark' ? '#FFD23F' : '#F5B700';

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
              نظرة عامة على المتجر
            </Text>

            <Text
              className="font-tajawal-bold text-3xl text-foreground"
              style={{ textAlign: 'right' }}
            >
              لوحة تحكم التاجر
            </Text>

            <Text
              className="font-tajawal text-sm text-muted-foreground"
              style={{ textAlign: 'right' }}
            >
              تابع مبيعاتك وأدر متجرك وطلباتك بسهولة.
            </Text>
          </View>

          <View className="rounded-2xl bg-surface p-3">
            <Store size={28} color={primaryColor} />
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
        </View>

        {/* Statistics */}
        <View className="gap-4">
          <Text
            className="font-tajawal-bold text-xl text-foreground"
            style={{ textAlign: 'right' }}
          >
            إحصائيات المتجر
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

                  <Text className="font-tajawal text-sm text-muted-foreground">
                    {stat.title}
                  </Text>

                  <Text className="font-tajawal-bold text-2xl text-foreground">
                    {stat.value}
                  </Text>

                  <Text className="font-tajawal-medium text-xs text-muted-foreground">
                    {stat.unit}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="gap-4">
          <Text
            className="font-tajawal-bold text-xl text-foreground"
            style={{ textAlign: 'right' }}
          >
            إجراءات سريعة
          </Text>

          <View className="gap-3">
            <AppButton
              title="إضافة منتج جديد"
              onPress={() =>
                Alert.alert('المنتجات', 'إضافة منتج جديد')
              }
            />

            <AppButton
              title="إدارة العروض"
              variant="secondary"
              onPress={() =>
                Alert.alert('العروض', 'إدارة عروض المتجر')
              }
            />
          </View>

          {/* Action Shortcuts */}
          <View className="flex-row-reverse gap-3">
            <Pressable
              onPress={() => Alert.alert('المنتجات', 'إضافة منتج جديد')}
              className="flex-1 flex-row-reverse items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <Plus size={18} color={iconColor} />

              <Text className="font-tajawal-medium text-sm text-foreground">
                منتج جديد
              </Text>
            </Pressable>

            <Pressable
              onPress={() => Alert.alert('الطلبات', 'عرض الطلبات')}
              className="flex-1 flex-row-reverse items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <ClipboardList size={18} color={iconColor} />

              <Text className="font-tajawal-medium text-sm text-foreground">
                الطلبات
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Orders */}
        <View className="gap-4">
          <View className="flex-row-reverse items-center justify-between">
            <Text className="font-tajawal-bold text-xl text-foreground">
              أحدث الطلبات
            </Text>

            <Pressable
              onPress={() => Alert.alert('الطلبات', 'عرض جميع الطلبات')}
              className="flex-row items-center gap-1"
            >
              <ArrowLeft size={16} color={primaryColor} />
              <Text className="font-tajawal-medium text-sm text-primary">
                عرض الكل
              </Text>
            </Pressable>
          </View>

          {orders.map((order) => {
            const StatusIcon =
              order.type === 'completed'
                ? CheckCircle2
                : order.type === 'processing'
                  ? Truck
                  : Clock3;

            return (
              <Pressable
                key={order.id}
                onPress={() =>
                  Alert.alert('تفاصيل الطلب', `الطلب ${order.id}`)
                }
                className="flex-row-reverse items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <View className="flex-1 items-end gap-1">
                  <Text className="font-tajawal-bold text-base text-foreground">
                    طلب رقم {order.id}
                  </Text>

                  <Text className="font-tajawal text-sm text-muted-foreground">
                    {order.customer}
                  </Text>
                </View>

                <View className="items-center gap-1.5">
                  <StatusIcon
                    size={20}
                    color={primaryColor}
                  />

                  <Text className="font-tajawal-medium text-xs text-primary">
                    {order.status}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
