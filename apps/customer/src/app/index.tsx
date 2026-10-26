
import {
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';

import {
  Smartphone,
  Shirt,
  ShoppingBasket,
  House,
  Sparkles,
  Tag,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react-native';

import {
  AnimatedBell,
  AnimatedHeart,
  AppButton,
  ThemeSwitcher,
} from '@wow/ui';

import { useTheme } from '@wow/theme';

const categories = [
  { id: 'electronics', icon: Smartphone, name: 'الإلكترونيات' },
  { id: 'fashion', icon: Shirt, name: 'الأزياء' },
  { id: 'grocery', icon: ShoppingBasket, name: 'البقالة' },
  { id: 'home', icon: House, name: 'المنزل' },
];

const offers = [
  {
    id: '1',
    name: 'هاتف ذكي',
    price: '٧٥٬٠٠٠ ر.ي',
    discount: 'خصم ٢٠٪',
  },
  {
    id: '2',
    name: 'حذاء رياضي',
    price: '١٨٬٠٠٠ ر.ي',
    discount: 'خصم ٣٥٪',
  },
];

export default function HomeScreen() {
  const { resolvedTheme } = useTheme();

  // Lucide icons accept colors through SVG props.
  // Use the current Wow theme's primary color.
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
        <View className="flex-row-reverse items-center justify-between">
          <View className="flex-1 items-end gap-1">
            <Text className="font-tajawal text-sm text-muted-foreground">
              اكتشف كل ما هو جديد
            </Text>

            <Text
              className="font-tajawal-bold text-3xl text-foreground"
              style={{ textAlign: 'right' }}
            >
              أهلاً بك في واو!
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <AnimatedHeart />
            <AnimatedBell />
          </View>
        </View>

        {/* Theme Selector */}
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

        {/* Promotional Banner */}
        <View className="gap-4 rounded-3xl bg-primary p-6">

          <View className="flex-row-reverse items-center gap-2">
            <Sparkles size={24} color="#171717" />

            <Text className="font-tajawal-bold text-2xl text-primary-foreground">
              عروض تستاهل!
            </Text>
          </View>

          <Text
            className="font-tajawal-medium text-base leading-7 text-primary-foreground"
            style={{ textAlign: 'right' }}
          >
            اكتشف أفضل العروض والخصومات الحصرية من متاجرك المفضلة.
          </Text>

          <AppButton
            title="تصفح العروض"
            variant="secondary"
            onPress={() =>
              Alert.alert('واو', 'استكشف العروض المتاحة')
            }
          />
        </View>

        {/* Categories */}
        <View className="gap-4">

          <View className="flex-row-reverse items-center justify-between">
            <Text className="font-tajawal-bold text-xl text-foreground">
              تسوق حسب القسم
            </Text>

            <Pressable
              onPress={() => Alert.alert('الأقسام', 'عرض جميع الأقسام')}
              className="flex-row items-center gap-1"
            >
              <ArrowLeft size={16} color={primaryColor} />
              <Text className="font-tajawal-medium text-sm text-primary">
                عرض الكل
              </Text>
            </Pressable>
          </View>

          <View className="flex-row-reverse flex-wrap gap-3">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => Alert.alert('القسم', category.name)}
                  className="min-w-32 flex-1 items-center gap-3 rounded-2xl border border-border bg-surface p-4"
                >
                  <View className="items-center justify-center rounded-xl bg-background p-3">
                    <Icon
                      size={28}
                      color={foregroundColor}
                      strokeWidth={1.8}
                    />
                  </View>

                  <Text className="font-tajawal-medium text-sm text-foreground">
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Today's Offers */}
        <View className="gap-4">

          <View className="flex-row-reverse items-center justify-between">
            <Text className="font-tajawal-bold text-xl text-foreground">
              عروض اليوم
            </Text>

            <View className="flex-row items-center gap-2">
              <Text className="font-tajawal text-sm text-muted-foreground">
                عروض مميزة
              </Text>
              <Tag size={18} color={primaryColor} />
            </View>
          </View>

          {offers.map((offer) => (
            <View
              key={offer.id}
              className="gap-4 rounded-2xl border border-border bg-surface p-5"
            >
              <View className="flex-row-reverse items-center justify-between">

                <View className="rounded-lg bg-primary px-3 py-2">
                  <Text className="font-tajawal-bold text-sm text-primary-foreground">
                    {offer.discount}
                  </Text>
                </View>

                <ShoppingBag
                  size={24}
                  color={foregroundColor}
                  strokeWidth={1.8}
                />
              </View>

              <View className="items-end gap-2">
                <Text className="font-tajawal-bold text-lg text-foreground">
                  {offer.name}
                </Text>

                <Text className="font-tajawal-medium text-base text-primary">
                  {offer.price}
                </Text>
              </View>

              <AppButton
                title="عرض المنتج"
                onPress={() =>
                  Alert.alert('المنتج', offer.name)
                }
              />
            </View>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}
