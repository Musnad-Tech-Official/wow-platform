import { isValidUuid } from '../offer/offer-display';

export type CustomerAuthMode = 'sign-in' | 'sign-up';

export interface ProviderInfo {
  id: 'oauth_google' | 'oauth_facebook';
  name: string;
  recoveryUrl: string;
}

export const OAUTH_PROVIDERS: readonly ProviderInfo[] = [
  {
    id: 'oauth_google',
    name: 'Google',
    recoveryUrl: 'https://accounts.google.com/signin/recovery',
  },
  {
    id: 'oauth_facebook',
    name: 'Facebook',
    recoveryUrl: 'https://www.facebook.com/login/identify',
  },
] as const;

/**
 * Strictly validates internal customer application return destinations.
 * Protects against open-redirect attacks, protocol injection, and path traversal.
 * Only allows known, whitelisted internal customer routes.
 */
export function validateInternalReturnPath(
  returnTo?: string | null,
  offerId?: string | null,
): string {
  // If no return path was supplied, check if an offer ID was provided
  if (!returnTo || typeof returnTo !== 'string') {
    if (offerId && isValidUuid(offerId)) {
      return `/offer/${offerId}`;
    }
    return '/';
  }

  const trimmed = returnTo.trim();

  // Guard against absolute URLs, protocol-relative URLs (//), backslashes, schemes
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    trimmed.includes(':')
  ) {
    if (offerId && isValidUuid(offerId)) {
      return `/offer/${offerId}`;
    }
    return '/';
  }

  // Separate path from query string for strict whitelist matching
  const [pathOnly, queryPart] = trimmed.split('?');
  const safeQuery = queryPart ? `?${queryPart}` : '';

  // 1. Root & primary tabs
  if (
    pathOnly === '/' ||
    pathOnly === '/(tabs)' ||
    pathOnly === '/discover' ||
    pathOnly === '/favorites' ||
    pathOnly === '/account'
  ) {
    return `${pathOnly}${safeQuery}`;
  }

  // 2. Offer routes: /offer/<uuid>, /offer/<uuid>/rate, /offer/<uuid>/complaint
  const offerMatch = pathOnly.match(/^\/offer\/([0-9a-fA-F-]{36})(\/(?:rate|complaint))?$/);
  if (offerMatch) {
    const extractedUuid = offerMatch[1];
    const subRoute = offerMatch[2] ?? '';
    if (isValidUuid(extractedUuid)) {
      return `/offer/${extractedUuid}${subRoute}${safeQuery}`;
    }
  }

  // 3. Complaints routes: /complaints, /complaints/<uuid>
  const complaintsMatch = pathOnly.match(/^\/complaints(?:\/([0-9a-fA-F-]{36}))?$/);
  if (complaintsMatch) {
    const extractedUuid = complaintsMatch[1];
    if (!extractedUuid || isValidUuid(extractedUuid)) {
      return `${pathOnly}${safeQuery}`;
    }
  }

  // 4. Ratings route: /ratings
  if (pathOnly === '/ratings') {
    return `/ratings${safeQuery}`;
  }

  // 5. Business profile route: /business/<uuid>
  const businessMatch = pathOnly.match(/^\/business\/([0-9a-fA-F-]{36})$/);
  if (businessMatch) {
    const extractedUuid = businessMatch[1];
    if (isValidUuid(extractedUuid)) {
      return `/business/${extractedUuid}${safeQuery}`;
    }
  }

  // Fallback to safe destination
  if (offerId && isValidUuid(offerId)) {
    return `/offer/${offerId}`;
  }
  return '/';
}

/**
 * Formats user-facing Arabic error messages for provider SSO flows.
 * Redacts raw tokens, internal Clerk error objects, and technical stack traces.
 */
export function resolveAuthErrorMessage(error: unknown, isSignUp: boolean): string {
  if (!error) {
    return isSignUp
      ? 'تعذر إنشاء الحساب في الوقت الحالي. يُرجى المحاولة مرة أخرى.'
      : 'تعذر تسجيل الدخول في الوقت الحالي. يُرجى المحاولة مرة أخرى.';
  }

  const rawMessage = error instanceof Error ? error.message : String(error);

  // User cancellation or closed browser popup
  if (
    rawMessage.includes('dismissed') ||
    rawMessage.includes('cancel') ||
    rawMessage.includes('closed') ||
    rawMessage.includes('User cancelled')
  ) {
    return 'تم إلغاء عملية المصادقة من قبلك.';
  }

  // Network / timeout failure
  if (
    rawMessage.includes('Network') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('fetch') ||
    rawMessage.includes('Failed to fetch')
  ) {
    return 'تعذر الاتصال بمزود الخدمة. يُرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة.';
  }

  // Additional verification required by provider
  if (
    rawMessage.includes('verification') ||
    rawMessage.includes('additional steps') ||
    rawMessage.includes('session')
  ) {
    return 'يتطلب حسابك خطوات إضافية للتحقق من مزود الهوية. يُرجى فتح الحساب والتحقق منه أولاً.';
  }

  return isSignUp
    ? 'تعذر إكمال إنشاء الحساب. يُرجى المحاولة مرة أخرى أو اختيار مزود آخر.'
    : 'تعذر إتمام تسجيل الدخول. يُرجى المحاولة مرة أخرى أو اختيار مزود آخر.';
}
