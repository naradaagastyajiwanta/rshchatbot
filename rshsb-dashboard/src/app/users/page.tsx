'use client';

import UserTable from '../../components/UserTable';
import { usePageTitleUpdater } from '../../utils/usePageTitleUpdater';

export default function UsersPage() {
  // Set the page title when component mounts
  usePageTitleUpdater('User Profiles');

  return (
    <div>
      
      <UserTable />
    </div>
  );
}
