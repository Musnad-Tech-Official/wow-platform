export type CustomerAccessRoute = '/welcome' | '/access' | '/';

export interface AccessDecisionInput {
  isHydrated: boolean;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
  hasCompletedOnboarding: boolean;
  hasChosenGuest: boolean;
  currentPath?: string;
}

export interface AccessDecisionResult {
  isReady: boolean;
  targetRoute: CustomerAccessRoute | null;
  canAccessPublicApp: boolean;
  canAccessPrivateApp: boolean;
  isGuest: boolean;
  shouldMigrateExistingUser: boolean;
  needsRedirect: boolean;
}

/**
 * Pure decision engine for customer navigation & state management.
 * Evaluates hydration, Clerk authentication, persisted onboarding, and explicit guest choices.
 */
export function resolveAccessDecision(input: AccessDecisionInput): AccessDecisionResult {
  const {
    isHydrated,
    isAuthLoaded,
    isSignedIn,
    hasCompletedOnboarding,
    hasChosenGuest,
    currentPath = '/',
  } = input;

  // 1. App must wait for full hydration and authentication readiness
  if (!isHydrated || !isAuthLoaded) {
    return {
      isReady: false,
      targetRoute: null,
      canAccessPublicApp: false,
      canAccessPrivateApp: false,
      isGuest: false,
      shouldMigrateExistingUser: false,
      needsRedirect: false,
    };
  }

  // 2. Existing Authenticated User (Clerk Session Active)
  if (isSignedIn) {
    const shouldMigrate = !hasCompletedOnboarding;
    const isRestrictedPath = currentPath === '/welcome' || currentPath === '/access';

    return {
      isReady: true,
      targetRoute: '/',
      canAccessPublicApp: true,
      canAccessPrivateApp: true,
      isGuest: false,
      shouldMigrateExistingUser: shouldMigrate,
      needsRedirect: isRestrictedPath,
    };
  }

  // 3. Unauthenticated User — Step A: Mandatory Onboarding
  if (!hasCompletedOnboarding) {
    const isWhitelisted =
      currentPath === '/welcome' ||
      currentPath === '/sso-callback' ||
      currentPath === '/integration-test';

    return {
      isReady: true,
      targetRoute: '/welcome',
      canAccessPublicApp: false,
      canAccessPrivateApp: false,
      isGuest: false,
      shouldMigrateExistingUser: false,
      needsRedirect: !isWhitelisted,
    };
  }

  // 4. Unauthenticated User — Step B: Onboarding Completed
  // 4.1. Explicit Guest Mode
  if (hasChosenGuest) {
    // Guest can explore public app and view tab destinations (/favorites, /account)
    // which render honest in-screen sign-in invites without exposing private data.
    const isAuthPath = currentPath === '/welcome' || currentPath === '/access';

    return {
      isReady: true,
      targetRoute: '/',
      canAccessPublicApp: true,
      canAccessPrivateApp: false,
      isGuest: true,
      shouldMigrateExistingUser: false,
      needsRedirect: isAuthPath,
    };
  }

  // 4.2. Awaiting Choice (Access Screen: Sign In / Sign Up / Continue as Guest)
  const isWhitelisted =
    currentPath === '/access' ||
    currentPath === '/sign-in' ||
    currentPath === '/sso-callback' ||
    currentPath === '/integration-test';

  return {
    isReady: true,
    targetRoute: '/access',
    canAccessPublicApp: false,
    canAccessPrivateApp: false,
    isGuest: false,
    shouldMigrateExistingUser: false,
    needsRedirect: !isWhitelisted,
  };
}