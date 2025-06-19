import LiveChatLayout from '../../components/LiveChatLayout';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Live Chat Dashboard</h1>
        <div className="text-sm text-gray-500">
          Real-time chat monitoring
        </div>
      </div>
      
      <LiveChatLayout />
    </div>
  );
}
