export type AdminRole = 'super_admin' | 'reviewer' | 'viewer';

export type AdminAccessStatus =
  | 'loading'
  | 'unauthenticated'
  | 'unauthorized'
  | 'authorized'
  | 'error';

export interface AdminMemberRecord {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  scope: string;
  isActive: boolean;
}

/**
 * Returns Arabic display label for admin role.
 * If role is null (e.g. server verified general admin access without exposing specific role),
 * returns 'إداري موثّق' rather than inventing an unverified role.
 */
export function getRoleArabicLabel(role?: AdminRole | null): string {
  switch (role) {
    case 'super_admin':
      return 'مشرف عام';
    case 'reviewer':
      return 'مراجع';
    case 'viewer':
      return 'مراقب';
    case null:
    case undefined:
      return 'إداري موثّق';
    default:
      return 'غير محدد';
  }
}

export function getRoleBadgeTone(role?: AdminRole | null): 'primary' | 'warning' | 'info' | 'neutral' {
  switch (role) {
    case 'super_admin':
      return 'primary';
    case 'reviewer':
      return 'info';
    case 'viewer':
      return 'neutral';
    case null:
    case undefined:
      return 'primary';
    default:
      return 'neutral';
  }
}

/**
 * Checks whether user can review operational queue items (verifications, offers, complaints).
 * In production, successful execution of wow_admin_list_business_verifications confirms
 * wow_private.has_admin_permission(false), so isAuthorized=true grants review capability.
 */
export function canReviewItems(role?: AdminRole | null, isAuthorized?: boolean): boolean {
  if (isAuthorized) return true;
  return role === 'super_admin' || role === 'reviewer';
}

/**
 * Strict boundary: role management requires proven super_admin authority.
 * Never inferred from general admin access or insufficient metadata.
 */
export function canManageRoles(role?: AdminRole | null): boolean {
  return role === 'super_admin';
}

/**
 * Deterministic review accounts matching the approved ADM-14 specification.
 * Used exclusively for development visual verification when strictly guarded by __DEV__.
 */
export const FIXTURE_ADMIN_MEMBERS: AdminMemberRecord[] = [
  {
    id: 'USR-101',
    userId: 'user_fixture_101',
    displayName: 'مسؤول إدارة',
    email: 'admin.lead@wow.local',
    role: 'super_admin',
    scope: 'سجلات الإدارة العليا',
    isActive: true,
  },
  {
    id: 'USR-112',
    userId: 'user_fixture_112',
    displayName: 'مراجع المحتوى',
    email: 'reviewer.content@wow.local',
    role: 'reviewer',
    scope: 'التأهيل والعروض',
    isActive: true,
  },
  {
    id: 'USR-124',
    userId: 'user_fixture_124',
    displayName: 'مسؤول المتابعة',
    email: 'support.lead@wow.local',
    role: 'viewer',
    scope: 'شكاوى وحسابات',
    isActive: true,
  },
];
