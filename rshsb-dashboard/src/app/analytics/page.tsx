import AnalyticsCharts from '../../components/AnalyticsCharts';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
        <div className="text-sm text-gray-500">
          Insights and data visualization
        </div>
      </div>
      
      <AnalyticsCharts />
    </div>
  );
}
