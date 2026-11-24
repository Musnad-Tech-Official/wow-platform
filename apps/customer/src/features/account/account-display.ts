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

export type AccountStatusSource = 'verified' | 'loading' | 'unknown' | 'error' | 'preview';

/** Resolve only the active session's own successfully loaded Supabase profile. */
export function resolveAccountStatusSource(input: {
  userId?: string | null;
  profile?: { id: string; account_status: string } | null;
  isPending: boolean;
  isError: boolean;
}): { status: string | null; source: AccountStatusSource } {
  if (input.isError) return { status: null, source: 'error' };
  if (input.isPending) return { status: null, source: 'loading' };
  if (!input.userId || input.profile?.id !== input.userId || !input.profile.account_status?.trim()) {
    return { status: null, source: 'unknown' };
  }
  return { status: input.profile.account_status, source: 'verified' };
}

/** A Clerk identity by itself never proves the Supabase account is active. */
export function resolveAccountStatusInfo(
  accountStatus?: string | null,
  source: AccountStatusSource = 'unknown',
): {
  label: string;
  tone: 'neutral' | 'success' | 'warning';
  isAuthoritative: boolean;
} {
  if (source === 'loading') return { label: 'جارٍ التحقق من حالة الحساب', tone: 'neutral', isAuthoritative: false };
  if (source === 'error') return { label: 'تعذّر التحقق من حالة الحساب', tone: 'warning', isAuthoritative: false };
  if (source === 'preview') return { label: 'حساب تجريبي', tone: 'neutral', isAuthoritative: false };
  if (source !== 'verified') return { label: 'حالة الحساب غير مؤكدة', tone: 'neutral', isAuthoritative: false };

  switch (accountStatus?.trim().toLowerCase()) {
    case 'active': return { label: 'حساب نشط', tone: 'success', isAuthoritative: true };
    case 'suspended': return { label: 'حساب موقوف مؤقتاً', tone: 'warning', isAuthoritative: true };
    case 'pending': return { label: 'قيد المراجعة', tone: 'neutral', isAuthoritative: true };
    case 'closed': return { label: 'حساب مغلق', tone: 'warning', isAuthoritative: true };
    case 'deleted': return { label: 'حساب محذوف', tone: 'warning', isAuthoritative: true };
    default: return { label: 'حالة الحساب غير مؤكدة', tone: 'neutral', isAuthoritative: false };
  }
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
export const IS_ACCOUNT_CLOSURE_SUBMISSION_SUPPORTED = true;
