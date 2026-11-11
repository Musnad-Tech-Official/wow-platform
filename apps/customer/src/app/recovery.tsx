import { useLocalSearchParams } from 'expo-router';
import { CustomerAccountRecoveryScreen } from '../features/auth/CustomerAccountRecoveryScreen';

export default function AccountRecoveryRoute() {
  const { returnTo, offerId } = useLocalSearchParams<{
    returnTo?: string;
    offerId?: string;
  }>();

  return (
    <CustomerAccountRecoveryScreen
      initialReturnTo={returnTo}
      initialOfferId={offerId}
    />
  );
}
