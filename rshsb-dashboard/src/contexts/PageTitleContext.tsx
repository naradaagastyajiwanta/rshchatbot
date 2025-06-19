'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Create context with default value
type PageTitleContextType = {
  pageTitle: string;
  setPageTitle: (title: string) => void;
};

const PageTitleContext = createContext<PageTitleContextType>({
  pageTitle: 'Dashboard',
  setPageTitle: () => {},
});

// Create provider component
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState('Dashboard');

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
