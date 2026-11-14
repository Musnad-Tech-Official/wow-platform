import { Redirect } from 'expo-router';

// The Clerk browser redirect returns here before the normal protected admin gate.
// No callback URL parameter may authorize the administration area.
export default function AdminOAuthCallback() {
  return <Redirect href="/" />;
}
