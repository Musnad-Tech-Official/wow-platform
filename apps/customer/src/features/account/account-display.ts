/**
 * Pure display formatting and honest capability helpers for CUS-06 Customer Account.
 */

export interface CustomerUserLike {
  id?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
    verification?: {
      status?: string | null;
    } | null;
  } | null;
  primaryPhoneNumber?: {
    phoneNumber?: string | null;
  } | null;
  imageUrl?: string | null;
  createdAt?: Date | number | string | null;
}

/**
 * Resolves a balanced display name with graceful fallback when profile data is absent.
 */
export function resolveCustomerDisplayName(user?: CustomerUserLike | null): string {
  if (!user) return 'مستخدم مسجل';

  const full = user.fullName?.trim();
  if (full) return full;

  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;

  const email = user.primaryEmailAddress?.emailAddress?.trim();
  if (email) {
    const localPart = email.split('@')[0];
    if (localPart) return localPart;
  }

  return 'مستخدم مسجل';
}

/**
 * Resolves customer email safely.
 */
export function resolveCustomerEmail(user?: CustomerUserLike | null): string | null {
  const email = user?.primaryEmailAddress?.emailAddress?.trim();
  return email && email.length > 0 ? email : null;
}

/**
 * Resolves customer phone safely.
 */
export function resolveCustomerPhone(user?: CustomerUserLike | null): string | null {
  const phone = user?.primaryPhoneNumber?.phoneNumber?.trim();
  return phone && phone.length > 0 ? phone : null;
}

/**
 * Resolves account status label without inventing fake security badges or ungrounded sync claims.
 * Unconditional security claims and unverified synchronization labels are strictly eliminated.
 * Displays only authoritative states backed by verified session/profile data.
 */
export function resolveAccountStatusInfo(
  accountStatus?: string | null,
  user?: CustomerUserLike | null,
): {
  label: string;
  tone: 'neutral' | 'success' | 'warning';
  isAuthoritative: boolean;
} {
  const normalized = accountStatus?.trim().toLowerCase();

  if (normalized === 'active' || (!normalized && user?.id)) {
    return {
      label: 'حساب نشط',
      tone: 'success',
      isAuthoritative: true,
    };
  }

  if (normalized === 'suspended') {
    return {
      label: 'حساب موقوف مؤقتاً',
      tone: 'warning',
      isAuthoritative: true,
    };
  }

  if (normalized === 'pending') {
    return {
      label: 'قيد المراجعة',
      tone: 'neutral',
      isAuthoritative: true,
    };
  }

  if (normalized) {
    return {
      label: `حالة الحساب: ${accountStatus}`,
      tone: 'neutral',
      isAuthoritative: true,
    };
  }

  return {
    label: 'حساب نشط',
    tone: 'success',
    isAuthoritative: true,
  };
}

/**
 * Arabic labels for theme modes.
 */
export function getThemeModeLabel(mode: 'light' | 'dark' | 'system'): string {
  switch (mode) {
    case 'light':
      return 'فاتح';
    case 'dark':
      return 'داكن';
    case 'system':
      return 'تلقائي (نظام الجهاز)';
  }
}

/**
 * CUS-08 Complaints tracking route capability check.
 * Strictly false until CUS-08 route is officially implemented.
 */
export const IS_CUS08_ROUTE_AVAILABLE = false;

/**
 * Direct profile update capability check.
 * Direct persistence is unsupported in this stage; profile action is view-only.
 */
export const IS_PROFILE_DIRECT_EDIT_SUPPORTED = false;

/**
 * Push notifications backend connection check.
 * Unsupported/unconfigured on this platform.
 */
export const IS_PUSH_NOTIFICATIONS_CONFIGURED = false;

/**
 * Online privacy/account-closure submission capability check.
 * Deletion/erasure requires legal review and backend retention RPCs.
 */
export const IS_ACCOUNT_CLOSURE_SUBMISSION_SUPPORTED = false;
