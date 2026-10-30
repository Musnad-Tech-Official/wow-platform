import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
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
  X,
  ClipboardList,
  CheckCircle2,
  Truck,
  Store,
} from 'lucide-react-native';

import {
  AppButton,
  AppText,
  AppInput,
  Badge,
  Card,
  Checkbox,
  Divider,
  IconButton,
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
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState(false);

  const iconColor =
    resolvedTheme === 'dark' ? '#FAFAFA' : '#18181B';

  const primaryColor =
    resolvedTheme === 'dark' ? '#FFD23F' : '#F5B700';

  const filteredItems = orders.filter((order) => (order.id + order.customer).includes(query.trim()));

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
              نظرة عامة على المتجر
            </AppText>

            <AppText variant="title"
              style={{ textAlign: 'right' }}
            >
              لوحة تحكم التاجر
            </AppText>

            <AppText variant="label" muted className="font-tajawal"
              style={{ textAlign: 'right' }}
            >
              تابع مبيعاتك وأدر متجرك وطلباتك بسهولة.
            </AppText>
          </View>

          <View className="rounded-2xl bg-surface p-3">
            <Store size={28} color={primaryColor} />
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
        </Card>

        {/* Statistics */}
        <View className="gap-4">
          <AppText variant="heading"
            style={{ textAlign: 'right' }}
          >
            إحصائيات المتجر
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

                  <AppText variant="label" muted className="font-tajawal">
                    {stat.title}
                  </AppText>

                  <AppText className="font-tajawal-bold text-2xl">
                    {stat.value}
                  </AppText>

                  <AppText variant="caption" muted className="font-tajawal-medium">
                    {stat.unit}
                  </AppText>
                </Card>
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="gap-4">
          <AppText variant="heading"
            style={{ textAlign: 'right' }}
          >
            إجراءات سريعة
          </AppText>

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
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => Alert.alert('المنتجات', 'إضافة منتج جديد')}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <Plus size={18} color={iconColor} />

              <AppText variant="label">
                منتج جديد
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => Alert.alert('الطلبات', 'عرض الطلبات')}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <ClipboardList size={18} color={iconColor} />

              <AppText variant="label">
                الطلبات
              </AppText>
            </Pressable>
          </View>
        </View>

        <Card>
          <AppText variant="heading" style={{ textAlign: 'right' }}>البحث في الطلبات</AppText>
          <AppInput
            label="البحث"
            placeholder="ابحث برقم الطلب أو اسم العميل"
            value={query}
            onChangeText={setQuery}
            style={{ textAlign: 'right' }}
            returnKeyType="search"
          />
          <View className="flex-row items-center justify-between">
            <Badge label="بيانات تجريبية" variant="secondary" />
            <IconButton accessibilityLabel="مسح البحث" disabled={!query} onPress={() => setQuery('')}>
              <X size={20} color={iconColor} />
            </IconButton>
          </View>
        </Card>

        {/* Recent Orders */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <AppText variant="heading">
              أحدث الطلبات
            </AppText>

            <Pressable
              onPress={() => Alert.alert('الطلبات', 'عرض جميع الطلبات')}
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

          {filteredItems.map((order) => {
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
                className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <View className="flex-1 items-start gap-1">
                  <AppText className="font-tajawal-bold">
                    طلب رقم {order.id}
                  </AppText>

                  <AppText variant="label" muted className="font-tajawal">
                    {order.customer}
                  </AppText>
                </View>

                <View className="items-center gap-1.5">
                  <StatusIcon
                    size={20}
                    color={primaryColor}
                  />

                  <AppText variant="caption" className="font-tajawal-medium text-primary">
                    {order.status}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
