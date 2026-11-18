import React from 'react';
import { W06GuardedPage } from '../features/w06/W06Shared';
import { AdminRatingsQueue } from '../features/w08/ModerationQueues';

export default function AdminRatingsPage() {
  return <W06GuardedPage title="مراجعة التقييمات">{(role) => <AdminRatingsQueue role={role} />}</W06GuardedPage>;
}
