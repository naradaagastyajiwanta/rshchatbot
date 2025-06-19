'use client';

import AnalyticsCharts from '../../components/AnalyticsCharts';
import { usePageTitleUpdater } from '../../utils/usePageTitleUpdater';

export default function AnalyticsPage() {
  // Set the page title when component mounts
  usePageTitleUpdater('Analytics Dashboard');

  return (
    <div>
      
      <AnalyticsCharts />
    </div>
  );
}
