'use client';

import { useEffect, useState } from "react";
import ChatViewerMobile from "@/components/mobile/ChatViewerMobile";
import ChatViewerDesktop from "@/components/desktop/ChatViewerDesktop";
import { usePageTitleUpdater } from '../../utils/usePageTitleUpdater';

export default function DashboardPage() {
  // Set the page title when component mounts
  usePageTitleUpdater('Live Chat Dashboard');
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      // Set initial state based on window width
      setIsMobile(window.innerWidth < 768);
      
      // Add resize listener to update state when window is resized
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Clean up event listener on component unmount
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-hidden w-full">
        {isMobile ? <ChatViewerMobile /> : <ChatViewerDesktop />}
      </div>
    </div>
  );
}
