import React from 'react';
import { W06GuardedPage } from '../features/w06/W06Shared';
import { VerificationQueue } from '../features/w06/VerificationQueue';

export default function AdminVerificationsPage() {
  return <W06GuardedPage title="تأهيل الأنشطة والفروع">{() => <VerificationQueue />}</W06GuardedPage>;
}
