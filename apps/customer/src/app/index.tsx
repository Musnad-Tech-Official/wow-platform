
import { useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useAuth, useUser, useClerk } from '@wow/auth';

import {
  Smartphone,
  Shirt,
  ShoppingBasket,
  House,
  Sparkles,
  Tag,
  ArrowLeft,
  X,
  ShoppingBag,
  LogIn,
  LogOut,
  UserRound,
  Database,
} from 'lucide-react-native';

import {
  AnimatedBell,
  AnimatedHeart,
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

const categories = [
  {
    id: 'electronics',
    icon: Smartphone,
    name: 'الإلكترونيات',
  },
  {
    id: 'fashion',
    icon: Shirt,
    name: 'الأزياء',
  },
  {
    id: 'grocery',
    icon: ShoppingBasket,
    name: 'البقالة',
  },
  {
    id: 'home',
    icon: House,
    name: 'المنزل',
  },
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
  const router = useRouter();

  // Clerk Authentication
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  // WOW Theme
  const { resolvedTheme } = useTheme();

  // Local UI State
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] =
    useState(false);

  const primaryColor =
    resolvedTheme === 'dark' ? '#FFD23F' : '#F5B700';

  const foregroundColor =
    resolvedTheme === 'dark' ? '#FAFAFA' : '#18181B';

  const filteredItems = offers.filter((offer) =>
    offer.name.includes(query.trim())
  );

  // Navigate to Clerk Sign In
  function goToSignIn() {
    router.push('/sign-in');
  }

  // Check authentication before protected features
  function requireAuth(
    onAuthenticated: () => void
  ) {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    onAuthenticated();
  }

  // Favorites
  function openFavorites() {
    requireAuth(() => {
      Alert.alert(
        'المفضلة',
        'سيتم إضافة شاشة المفضلة لاحقًا.'
      );
    });
  }

  // Notifications
  function openNotifications() {
    requireAuth(() => {
      Alert.alert(
        'الإشعارات',
        'سيتم إضافة شاشة الإشعارات لاحقًا.'
      );
    });
  }

  // Development integration tools also support signed-out/anonymous checks.
  function openIntegrationTest() {
    if (__DEV__) router.push('/integration-test');
  }

  // Clerk Sign Out
  async function handleSignOut() {
    try {
      await signOut();

      // Return to public home screen.
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'خطأ',
        error instanceof Error
          ? error.message
          : 'تعذر تسجيل الخروج'
      );
    }
  }

  const displayName =
    user?.firstName ||
    user?.fullName ||
    'مستخدم واو';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-10"
    >
      <View className="gap-7 px-5 pt-10">

        {/* Header */}
        <View className="gap-4">

          <View className="flex-row items-center justify-between">

            <View className="flex-1 items-start gap-1">
              <AppText
                variant="label"
                muted
                className="font-tajawal"
              >
                اكتشف كل ما هو جديد
              </AppText>

              <AppText
                variant="title"
                style={{ textAlign: 'right' }}
              >
                {isSignedIn
                  ? `أهلًا ${displayName}!`
                  : 'أهلًا بك في واو!'}
              </AppText>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={openFavorites}
                accessibilityLabel="المفضلة"
              >
                <AnimatedHeart />
              </Pressable>

              <Pressable
                onPress={openNotifications}
                accessibilityLabel="الإشعارات"
              >
                <AnimatedBell />
              </Pressable>
            </View>

          </View>

          {/* Authentication Controls */}
          {!isLoaded ? (
            <Badge
              label="جارٍ تحميل الحساب..."
              variant="secondary"
            />
          ) : isSignedIn ? (
            <Card className="gap-3 p-4">

              <View className="flex-row items-center gap-2">
                <UserRound
                  size={20}
                  color={foregroundColor}
                />

                <AppText
                  variant="label"
                  className="font-tajawal-bold"
                >
                  تم تسجيل الدخول
                </AppText>
              </View>

              <AppText variant="caption" muted>
                {user?.primaryEmailAddress?.emailAddress ??
                  userId ??
                  ''}
              </AppText>

              <View className="flex-row gap-2">
                {__DEV__ && <View className="flex-1">
                  <AppButton
                    title="اختبارات التكامل"
                    variant="secondary"
                    onPress={openIntegrationTest}
                  />
                </View>}

                <Pressable
                  onPress={handleSignOut}
                  accessibilityRole="button"
                  accessibilityLabel="تسجيل الخروج"
                  className="items-center justify-center rounded-xl border border-border px-4"
                >
                  <LogOut
                    size={21}
                    color={foregroundColor}
                  />
                </Pressable>
              </View>

            </Card>
          ) : (
            <Card className="gap-3 p-4">
              <View className="flex-row items-center gap-2">
                <LogIn
                  size={20}
                  color={foregroundColor}
                />

                <AppText
                  variant="label"
                  className="font-tajawal-bold"
                >
                  أنت تتصفح كضيف
                </AppText>
              </View>

              <AppText variant="caption" muted>
                سجل الدخول لحفظ العروض
                والمفضلة وتقييم العروض.
              </AppText>

              <AppButton
                title="تسجيل الدخول"
                onPress={goToSignIn}
              />
            </Card>
          )}

        </View>

        {/* Theme Selector */}
        <Card className="gap-3 p-4">
          <AppText
            className="font-tajawal-bold"
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

          <AppText
            variant="caption"
            muted
            style={{ textAlign: 'right' }}
          >
            الوضع الحالي:{' '}
            {resolvedTheme === 'dark'
              ? 'داكن'
              : 'فاتح'}
          </AppText>
        </Card>

        {/* Promotional Banner */}
        <View className="gap-4 rounded-3xl bg-primary p-6">

          <View className="flex-row items-center gap-2">
            <Sparkles size={24} color="#171717" />

            <AppText className="font-tajawal-bold text-2xl text-primary-foreground">
              عروض تستاهل!
            </AppText>
          </View>

          <AppText
            variant="label"
            className="text-base leading-7 text-primary-foreground"
            style={{ textAlign: 'right' }}
          >
            اكتشف أفضل العروض والخصومات الحصرية
            من متاجرك المفضلة.
          </AppText>

          <AppButton
            title="تصفح العروض"
            variant="secondary"
            onPress={() =>
              Alert.alert(
                'واو',
                'استكشف العروض المتاحة'
              )
            }
          />
        </View>

        {/* Categories */}
        <View className="gap-4">

          <View className="flex-row items-center justify-between">

            <AppText variant="heading">
              تسوق حسب القسم
            </AppText>

            <Pressable
              onPress={() =>
                Alert.alert(
                  'الأقسام',
                  'عرض جميع الأقسام'
                )
              }
              className="flex-row items-center gap-1"
            >
              <ArrowLeft
                size={16}
                color={primaryColor}
              />

              <AppText
                variant="label"
                className="text-primary"
              >
                عرض الكل
              </AppText>
            </Pressable>

          </View>

          <View className="flex-row flex-wrap gap-3">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <Pressable
                  key={category.id}
                  onPress={() =>
                    Alert.alert(
                      'القسم',
                      category.name
                    )
                  }
                  className="min-w-32 flex-1 items-center gap-3 rounded-2xl border border-border bg-surface p-4"
                >
                  <View className="items-center justify-center rounded-xl bg-background p-3">
                    <Icon
                      size={28}
                      color={foregroundColor}
                      strokeWidth={1.8}
                    />
                  </View>

                  <AppText variant="label">
                    {category.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

        </View>

        {/* Search */}
        <Card className="gap-3 p-4">

          <AppText
            variant="heading"
            style={{ textAlign: 'right' }}
          >
            البحث في العروض
          </AppText>

          <AppInput
            label="البحث"
            placeholder="ابحث عن منتج"
            value={query}
            onChangeText={setQuery}
            style={{ textAlign: 'right' }}
            returnKeyType="search"
          />

          <View className="flex-row items-center justify-between">

            <Badge
              label="بيانات تجريبية"
              variant="secondary"
            />

            <IconButton
              accessibilityLabel="مسح البحث"
              disabled={!query}
              onPress={() => setQuery('')}
            >
              <X
                size={20}
                color={foregroundColor}
              />
            </IconButton>

          </View>
        </Card>

        {/* Today's Offers */}
        <View className="gap-4">

          <View className="flex-row items-center justify-between">

            <AppText variant="heading">
              عروض اليوم
            </AppText>

            <View className="flex-row items-center gap-2">

              <AppText
                variant="label"
                muted
                className="font-tajawal"
              >
                عروض مميزة
              </AppText>

              <Tag
                size={18}
                color={primaryColor}
              />
            </View>

          </View>

          {filteredItems.length === 0 && (
            <AppText
              muted
              style={{ textAlign: 'right' }}
            >
              لا توجد نتائج مطابقة للبحث.
            </AppText>
          )}

          {filteredItems.map((offer) => (
            <Card
              key={offer.id}
              className="gap-4 p-5"
            >

              <View className="flex-row items-center justify-between">

                <View className="rounded-lg bg-primary px-3 py-2">
                  <AppText
                    variant="label"
                    className="font-tajawal-bold text-primary-foreground"
                  >
                    {offer.discount}
                  </AppText>
                </View>

                <ShoppingBag
                  size={24}
                  color={foregroundColor}
                  strokeWidth={1.8}
                />

              </View>

              <View className="items-start gap-2">

                <AppText className="font-tajawal-bold text-lg">
                  {offer.name}
                </AppText>

                <AppText
                  variant="label"
                  className="text-base text-primary"
                >
                  {offer.price}
                </AppText>

              </View>

              <AppButton
                title="عرض المنتج"
                onPress={() =>
                  Alert.alert(
                    'المنتج',
                    offer.name
                  )
                }
              />

            </Card>
          ))}

        </View>

        {/* Development Tools */}
        {__DEV__ && (
          <Card className="gap-3 p-4">
            <View className="flex-row items-center gap-2">
              <Database
                size={20}
                color={foregroundColor}
              />

              <AppText variant="heading">
                اختبار الاتصال
              </AppText>
            </View>

            <AppText variant="caption" muted>
              التحقق من اتصال Clerk مع Supabase
              وصلاحيات المستخدم.
            </AppText>

            <AppButton
              title="اختبار Clerk + Supabase"
              variant="secondary"
              onPress={openIntegrationTest}
            />
          </Card>
        )}


      </View>
    </ScrollView>
  );
}
