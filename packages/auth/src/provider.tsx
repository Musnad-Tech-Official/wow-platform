
import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

interface WowAuthProviderProps {
  publishableKey: string;
  children: ReactNode;
}

export function WowAuthProvider({
  publishableKey,
  children,
}: WowAuthProviderProps) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
    >
      {children}
    </ClerkProvider>
  );
}
