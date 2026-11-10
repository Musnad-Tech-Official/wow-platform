/** Pure access state for the merchant home and offers entrypoints. */
export type MerchantRouteAccess = 'allow' | 'loading' | 'sign-in';

export function resolveMerchantRouteAccess(
  isLoaded: boolean,
  isSignedIn: boolean | undefined,
  isDevelopment: boolean,
  preview: string | undefined,
): MerchantRouteAccess {
  if (isDevelopment && preview === '1') return 'allow';
  if (!isLoaded) return 'loading';
  return isSignedIn === true ? 'allow' : 'sign-in';
}
