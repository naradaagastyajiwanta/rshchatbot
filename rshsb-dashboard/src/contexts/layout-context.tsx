'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our context
interface LayoutContextType {
  isMobile: boolean;
  toggleSidebar: () => void;
  showSidebar: boolean;
}

// Create context with default values
const LayoutContext = createContext<LayoutContextType>({
  isMobile: false,
  toggleSidebar: () => {},
  showSidebar: true,
});

// Custom hook to use the layout context
export const useLayout = () => useContext(LayoutContext);

// Debounce function to limit resize event handler calls
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Provider component
export function LayoutProvider({ children }: { children: ReactNode }) {
  // State to track if the viewport is mobile size
  const [isMobile, setIsMobile] = useState(false);
  
  // State to track sidebar visibility
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  useEffect(() => {
    // Function to check if the screen is mobile size
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      
      // Auto-hide sidebar on mobile
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      } else {
        setShowSidebar(true);
      }
    };

    // Check on initial render
    if (typeof window !== 'undefined') {
      checkIsMobile();
    }

    // Create debounced version of the check function
    const debouncedCheckIsMobile = debounce(checkIsMobile, 200);

    // Add event listener with debounced handler
    window.addEventListener('resize', debouncedCheckIsMobile);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('resize', debouncedCheckIsMobile);
    };
  }, []);

  return (
    <LayoutContext.Provider value={{ isMobile, toggleSidebar, showSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
}
