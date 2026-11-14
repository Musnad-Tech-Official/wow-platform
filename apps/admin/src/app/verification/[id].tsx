import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { W06GuardedPage, W06Message } from '../../features/w06/W06Shared';
import { VerificationDetails } from '../../features/w06/VerificationDetails';

export default function AdminVerificationDetailsPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const validId = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return (
    <W06GuardedPage title="مراجعة النشاط والفرع">
      {(role) => validId ? <VerificationDetails id={id} role={role} /> : <W06Message kind="error" title="معرّف الطلب غير صالح" />}
    </W06GuardedPage>
  );
}
