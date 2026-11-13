import React from 'react';
import { W06GuardedPage } from '../features/w06/W06Shared';
import { SubscriptionPayments } from '../features/w06/SubscriptionPayments';

export default function AdminPaymentsPage() {
  return <W06GuardedPage title="الاشتراكات وتأكيد الدفعات">{(role) => <SubscriptionPayments role={role} />}</W06GuardedPage>;
}
