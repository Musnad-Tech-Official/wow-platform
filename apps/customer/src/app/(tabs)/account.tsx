import { useLocalSearchParams } from 'expo-router';
import { CustomerAccountTabScreen } from '../../features/account/CustomerAccountTabScreen';

export default function AccountTabRoute() {
  const params = useLocalSearchParams<{
    previewMode?: 'live' | 'signed-in' | 'guest' | 'privacy' | 'profile' | 'sign-out';
    theme?: 'light' | 'dark';
  }>();

  return (
    <CustomerAccountTabScreen
      previewMode={__DEV__ ? params.previewMode : undefined}
      forcedTheme={__DEV__ ? params.theme : undefined}
    />
  );
}
