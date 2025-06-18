import UserTable from '../../components/UserTable';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">User Profiles</h1>
        <div className="text-sm text-gray-500">
          Filter and manage user profiles
        </div>
      </div>
      
      <UserTable />
    </div>
  );
}
