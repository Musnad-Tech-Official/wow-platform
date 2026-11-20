import React from 'react';
import { W06GuardedPage } from '../features/w06/W06Shared';
import { ProfileRevisions } from '../features/w06/ProfileRevisions';

export default function AdminProfileRevisionsPage() {
  return <W06GuardedPage title="تعديلات ملفات التجار">{(role) => <ProfileRevisions role={role} />}</W06GuardedPage>;
}
