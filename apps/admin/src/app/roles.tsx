import React from 'react';
import { useAdminAccess } from '../features/auth/use-admin-access';
import { AdminAccessScreen } from '../features/screens/AdminAccessScreen';
import { AdminRolesScreen } from '../features/screens/AdminRolesScreen';
import { AdminShell } from '../features/shell/AdminShell';

export default function AdminRolesPage() {
  const {
    status,
    role,
    error,
    user,
    retry,
    signOut,
    preview,
    isFixture,
  } = useAdminAccess();

  // Guard: If not authorized, fail closed and render the ADM-01 Access Screen.
  if (status !== 'authorized') {
    return (
      <AdminAccessScreen
        status={status}
        errorMessage={error?.message}
        onRetry={retry}
        onSignOut={signOut}
        userEmail={user?.primaryEmailAddress?.emailAddress}
      />
    );
  }

  // Authorized: Render the unified AdminShell containing ADM-14 Roles & Permissions.
  return (
    <AdminShell
      currentRole={role}
      userEmail={user?.primaryEmailAddress?.emailAddress}
      userName={user?.fullName || user?.firstName || 'المسؤول المخوّل'}
      onSignOut={signOut}
      pageTitle="المشرفون والصلاحيات"
    >
      <AdminRolesScreen
        currentRole={role}
        userEmail={user?.primaryEmailAddress?.emailAddress}
        isFixture={isFixture}
        highlightGap={preview === 'adm14-gap'}
      />
    </AdminShell>
  );
}
