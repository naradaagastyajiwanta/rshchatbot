import LiveChatLayout from '../../components/LiveChatLayout';

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mx-6">
      <div className="flex justify-between items-center h-8 px-6 mb-1">
        <h1 className="text-xl font-bold text-gray-800">Live Chat Dashboard</h1>
        <div className="text-xs text-gray-500">
          Real-time chat monitoring
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <LiveChatLayout />
      </div>
    </div>
  );
}
