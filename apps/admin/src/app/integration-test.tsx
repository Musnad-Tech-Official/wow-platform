import { Redirect, useRouter } from 'expo-router';
import { IntegrationTestScreen } from '@wow/ui/integration-test';

export default function IntegrationTestRoute() {
  const router = useRouter();
  if (!__DEV__) return <Redirect href="/" />;
  return <IntegrationTestScreen
    application="admin"
    supabaseUrl={process.env.EXPO_PUBLIC_SUPABASE_URL}
    supabasePublicKey={process.env.EXPO_PUBLIC_SUPABASE_KEY}
    onBack={() => router.replace('/')}
  />;
}
