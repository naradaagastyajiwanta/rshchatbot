'use client';

import LiveChatLayout from '../../components/LiveChatLayout';
import { usePageTitleUpdater } from '../../utils/usePageTitleUpdater';

export default function DashboardPage() {
  // Set the page title when component mounts
  usePageTitleUpdater('Live Chat Dashboard');

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      
      <div className="flex-1 overflow-hidden w-full">
        <LiveChatLayout />
      </div>
    </div>
  );
}
