import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { W06GuardedPage, W06Message } from '../../features/w06/W06Shared';
import { AdminComplaintDetail } from '../../features/w08/ComplaintDetail';

export default function AdminComplaintDetailsPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const valid = typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return (
    <W06GuardedPage title="تفاصيل الشكوى">
      {() => valid ? <AdminComplaintDetail id={id} /> :
        <W06Message title="معرّف الشكوى غير صالح" kind="error" />}
    </W06GuardedPage>
  );
}
