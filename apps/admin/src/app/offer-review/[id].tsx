import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { W06GuardedPage, W06Message } from '../../features/w06/W06Shared';
import { OfferReview } from '../../features/w07/OfferReview';

export default function AdminOfferReviewPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const valid = typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return (
    <W06GuardedPage title="تفاصيل مراجعة العرض">
      {(role) => valid ? <OfferReview id={id} role={role} /> :
        <W06Message title="معرّف نسخة العرض غير صالح" kind="error" />}
    </W06GuardedPage>
  );
}
