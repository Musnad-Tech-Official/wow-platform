import React from 'react';
import { useAdminAccess } from '../features/auth/use-admin-access';
import { AdminAccessScreen } from '../features/screens/AdminAccessScreen';
import { AdminDashboardScreen } from '../features/screens/AdminDashboardScreen';
import { AdminShell } from '../features/shell/AdminShell';

export default function AdminIndexPage() {
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
  // No admin shell, navigation, or protected records are visible.
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

  // Authorized: Render the unified AdminShell containing the ADM-02 Dashboard.
  return (
    <AdminShell
      currentRole={role}
      userEmail={user?.primaryEmailAddress?.emailAddress}
      userName={user?.fullName || user?.firstName || 'المسؤول المخوّل'}
      onSignOut={signOut}
      pageTitle="لوحة العمليات"
    >
      <AdminDashboardScreen
        currentRole={role}
        isFixture={isFixture}
        isEmptyPreview={preview === 'adm02-empty'}
      />
    </AdminShell>
  );
}
