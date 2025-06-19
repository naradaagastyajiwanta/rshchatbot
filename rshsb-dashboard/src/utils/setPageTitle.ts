/**
 * Helper function to set the page title dynamically
 * @param title The title to set for the current page
 */
export function setPageTitle(title: string): void {
  // Dispatch a custom event with the new title
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('page-title-change', {
        detail: { title }
      })
    );
  }
}
