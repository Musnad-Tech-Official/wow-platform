import React from 'react';
import { W06GuardedPage } from '../features/w06/W06Shared';
import { CategoryManagement } from '../features/w07/CategoryManagement';

export default function AdminCategoriesPage() {
  return (
    <W06GuardedPage title="إدارة التصنيفات">
      {(role) => <CategoryManagement role={role} />}
    </W06GuardedPage>
  );
}
