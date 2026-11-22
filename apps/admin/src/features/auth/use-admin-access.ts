import { useCallback, useState, useSyncExternalStore } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth, useUser, useClerk } from '@wow/auth';
import { useAdminBusinessVerifications, useAdminEffectiveRole, useWowApiContext } from '@wow/api';
import type { AdminAccessStatus, AdminRole } from './admin-access';

export interface UseAdminAccessResult {
  status: AdminAccessStatus;
  role: AdminRole | null;
  isAuthorized: boolean;
  error: Error | null;
  user: ReturnType<typeof useUser>['user'];
  retry: () => void;
  signOut: () => Promise<void>;
  preview?: string;
  isFixture: boolean;
}

const emptySubscribe = () => () => {};

export function useAdminAccess(): UseAdminAccessResult {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { isLoaded, isSignedIn, userId, signOut } = useAuth();
  const { user } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const apiContext = useWowApiContext();
  const effectiveRoleQuery = useAdminEffectiveRole();
  const { refetch: refetchRole } = effectiveRoleQuery;
  const params = useLocalSearchParams<{ preview?: string }>();

  // CRITICAL SECURITY GUARD: Preview parameters are STRICTLY development-only (__DEV__).
  // Production builds must NEVER allow URL parameters to grant admin access or expose fixtures.
  const isDev = typeof __DEV__ !== 'undefined' && Boolean(__DEV__);

  const preview = isDev
    ? params.preview ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('preview') ?? undefined
        : undefined)
    : undefined;

  const [manualError, setManualError] = useState<Error | null>(null);

  // Authoritative server check: attempt a minimal admin-only call
  // PostgreSQL checks wow_private.has_admin_permission(false)
  const isQueryEnabled = Boolean(isLoaded && isSignedIn && userId && apiContext.userId === userId && !preview);
  const {
    error: rpcError,
    isLoading: isCheckingRpc,
    isSuccess: isRpcSuccess,
    refetch,
  } = useAdminBusinessVerifications({ limit: 1 });

  const handleRetry = useCallback(() => {
    setManualError(null);
    // Membership and effective-role checks are independent queries. A retry
    // must re-run BOTH so a transient role-fetch failure can recover.
    void Promise.all([refetch(), refetchRole()]);
  }, [refetch, refetchRole]);

  const handleSignOut = useCallback(async () => {
    try {
      if (signOut) await signOut();
      else if (clerkSignOut) await clerkSignOut();
    } catch {
      // Ignore cleanup error on sign-out
    }
  }, [signOut, clerkSignOut]);

  // Server prerender and first browser hydration must render the SAME unauthenticated gate.
  // Expo static HTML does not have per-request preview query parameters. Resolving them
  // here creates a mismatch and React replaces the document with a hydration error.
  if (!isClient) {
    return {
      status: 'unauthenticated',
      role: null,
      isAuthorized: false,
      error: null,
      user: null,
      retry: handleRetry,
      signOut: handleSignOut,
      preview: undefined,
      isFixture: false,
    };
  }

  // 1. Preview overrides for development QA and visual capture (STRICTLY __DEV__ ONLY)
  if (isDev && preview) {
    if (preview === 'adm01') {
      return {
        status: 'unauthenticated',
        role: null,
        isAuthorized: false,
        error: null,
        user: null,
        retry: handleRetry,
        signOut: handleSignOut,
        preview,
        isFixture: true,
      };
    }
    if (preview === 'adm01-loading') {
      return {
        status: 'loading',
        role: null,
        isAuthorized: false,
        error: null,
        user: null,
        retry: handleRetry,
        signOut: handleSignOut,
        preview,
        isFixture: true,
      };
    }
    if (preview === 'adm01-denied') {
      return {
        status: 'unauthorized',
        role: null,
        isAuthorized: false,
        error: new Error('Platform admin access required (42501)'),
        user: user ?? null,
        retry: handleRetry,
        signOut: handleSignOut,
        preview,
        isFixture: true,
      };
    }
    if (preview === 'adm01-error') {
      return {
        status: 'error',
        role: null,
        isAuthorized: false,
        error: new Error('تعذر الاتصال بخادم قاعدة البيانات للتحقق من الصلاحيات.'),
        user: user ?? null,
        retry: handleRetry,
        signOut: handleSignOut,
        preview,
        isFixture: true,
      };
    }
    if (
      preview === 'adm02' ||
      preview === 'adm02-empty' ||
      preview === 'adm14' ||
      preview === 'adm14-gap'
    ) {
      return {
        status: 'authorized',
        // In dev preview fixtures, assign explicit role for visual inspection
        role: preview.startsWith('adm14') ? 'super_admin' : 'reviewer',
        isAuthorized: true,
        error: null,
        user: user ?? null,
        retry: handleRetry,
        signOut: handleSignOut,
        preview,
        isFixture: true,
      };
    }
  }

  // 2. Production auth and server authorization resolution
  if (!isLoaded || (isQueryEnabled && (isCheckingRpc || effectiveRoleQuery.isPending))) {
    return {
      status: 'loading',
      role: null,
      isAuthorized: false,
      error: null,
      user: null,
      retry: handleRetry,
      signOut: handleSignOut,
      preview: undefined,
      isFixture: false,
    };
  }

  if (!isSignedIn || !userId) {
    return {
      status: 'unauthenticated',
      role: null,
      isAuthorized: false,
      error: null,
      user: null,
      retry: handleRetry,
      signOut: handleSignOut,
      preview: undefined,
      isFixture: false,
    };
  }

  const rpcFailure = isQueryEnabled ? rpcError : null;
  const roleFailure = isQueryEnabled ? effectiveRoleQuery.error : null;
  const effectiveError = manualError || rpcFailure || roleFailure;
  if (effectiveError) {
    const errorMsg = String(effectiveError.message || '');
    // A failure to fetch the role is an operational error, not evidence that
    // the user's membership was revoked. The server remains the final guard.
    const isPermissionDenied =
      effectiveError === rpcFailure && (
        errorMsg.includes('42501') ||
        errorMsg.includes('admin access required') ||
        errorMsg.includes('permission') ||
        errorMsg.includes('Unauthorized') ||
        errorMsg.includes('forbidden')
      );

    if (isPermissionDenied) {
      return {
        status: 'unauthorized',
        role: null,
        isAuthorized: false,
        error: effectiveError instanceof Error ? effectiveError : new Error(errorMsg),
        user: user ?? null,
        retry: handleRetry,
        signOut: handleSignOut,
        preview: undefined,
        isFixture: false,
      };
    }

    return {
      status: 'error',
      role: null,
      isAuthorized: false,
      error: effectiveError instanceof Error ? effectiveError : new Error(errorMsg),
      user: user ?? null,
      retry: handleRetry,
      signOut: handleSignOut,
      preview: undefined,
      isFixture: false,
    };
  }

  // Never grant administrative access because a query is idle, disabled, pending,
  // or has not returned a verified success for this exact authenticated session.
  if (!isQueryEnabled || !isRpcSuccess) {
    return {
      status: 'loading',
      role: null,
      isAuthorized: false,
      error: null,
      user: null,
      retry: handleRetry,
      signOut: handleSignOut,
      preview: undefined,
      isFixture: false,
    };
  }

  // Server authorization succeeded: wow_admin_list_business_verifications executed.
  // Note: The baseline database contract confirms the caller is in wow_private.admin_members,
  // but does NOT expose the granular member role via a public RPC.
  // DO NOT invent or default to 'reviewer' or 'super_admin'. Keep role as null (unverified specific role).
  return {
    status: 'authorized',
    role: effectiveRoleQuery.isSuccess ? (effectiveRoleQuery.data ?? null) : null,
    isAuthorized: true,
    error: null,
    user: user ?? null,
    retry: handleRetry,
    signOut: handleSignOut,
    preview: undefined,
    isFixture: false,
  };
}
