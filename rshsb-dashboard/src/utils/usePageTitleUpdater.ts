'use client';

import { useEffect } from 'react';
import { usePageTitle } from '../contexts/PageTitleContext';

/**
 * Hook to update page title on component mount
 * @param title The title to set for the current page
 */
export function usePageTitleUpdater(title: string): void {
  const { setPageTitle } = usePageTitle();
  
  useEffect(() => {
    setPageTitle(title);
  }, [setPageTitle, title]);
}
