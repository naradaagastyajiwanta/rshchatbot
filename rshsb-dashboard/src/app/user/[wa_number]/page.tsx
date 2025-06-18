'use client';

import { useParams } from 'next/navigation';
import UserDetail from '../../../components/UserDetail';
import Link from 'next/link';

export default function UserDetailPage() {
  const params = useParams();
  const waNumber = params.wa_number as string;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/users" className="text-blue-600 hover:text-blue-800 flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Users
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">User Profile</h1>
        </div>
      </div>
      
      <UserDetail waNumber={waNumber} />
    </div>
  );
}
