import React from 'react';
import { W06GuardedPage } from '../features/w06/W06Shared';
import { AdminComplaintsQueue } from '../features/w08/ModerationQueues';

export default function AdminComplaintsPage() {
  return <W06GuardedPage title="الشكاوى والبلاغات">{() => <AdminComplaintsQueue />}</W06GuardedPage>;
}
