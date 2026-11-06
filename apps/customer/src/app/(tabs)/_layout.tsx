import { Tabs } from 'expo-router';
import { CustomerBottomTabBar } from '../../features/navigation/CustomerBottomTabBar';

export default function CustomerTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomerBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'استكشف',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'المفضلة',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'حسابي',
        }}
      />
    </Tabs>
  );
}