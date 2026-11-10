import { Redirect } from 'expo-router';

// The Clerk browser flow returns to this route before normal app navigation.
export default function MerchantOAuthCallback() {
  return <Redirect href="/" />;
}
