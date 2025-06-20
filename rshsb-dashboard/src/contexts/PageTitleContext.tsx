'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Create context with default value
type PageTitleContextType = {
  pageTitle: string;
  setPageTitle: (title: string) => void;
};

const PageTitleContext = createContext<PageTitleContextType>({
  pageTitle: 'Dashboard',
  setPageTitle: () => {},
});

// Base title for the application
const BASE_TITLE = 'Chatbot RSH';

// Create provider component
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState('Dashboard');
  
  // Update document title when pageTitle changes
  useEffect(() => {
    // Set document title with format: "Page Title | Chatbot RSH"
    // Or just "Chatbot RSH" if pageTitle is empty
    document.title = pageTitle ? `${pageTitle} | ${BASE_TITLE}` : BASE_TITLE;
  }, [pageTitle]);

  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

// Create hook for using the context
export function usePageTitle() {
  return useContext(PageTitleContext);
}
