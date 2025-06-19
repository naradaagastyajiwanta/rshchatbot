'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';

interface ChatLog {
  id: string;
  wa_number: string;
  message: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  thread_id: string;
}

interface UserProfile {
  wa_number: string;
  keluhan: string;
  barrier: string;
  lead_status: 'Cold' | 'Warm' | 'Hot';
}

interface AnalyticsData {
  dailyChatCounts: { date: string; count: number }[];
  topKeluhan: { name: string; count: number }[];
  topBarrier: { name: string; count: number }[];
  leadStatusDistribution: { name: string; value: number; color: string }[];
}

export default function AnalyticsCharts() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    dailyChatCounts: [],
    topKeluhan: [],
    topBarrier: [],
    leadStatusDistribution: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Fetch chat logs for daily chat counts
        const { data: chatLogs, error: chatError } = await supabase
          .from('chat_logs')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (chatError) throw chatError;
        
        // Fetch user profiles for keluhan, barrier, and lead status
        const { data: userProfiles, error: userError } = await supabase
          .from('user_profiles')
          .select('wa_number, keluhan, barrier, lead_status');
        
        if (userError) throw userError;
        
        // Process data for charts
        const processedData = processAnalyticsData(chatLogs || [], userProfiles || []);
        setAnalyticsData(processedData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
    
    // Set up real-time subscription for chat logs
    const chatSubscription = supabase
      .channel('chat_logs_analytics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs'
        },
        () => {
          // Refresh analytics data when new chat logs are added
          fetchAnalyticsData();
        }
      )
      .subscribe();
    
    // Set up real-time subscription for user profiles
    const userSubscription = supabase
      .channel('user_profiles_analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        () => {
          // Refresh analytics data when user profiles change
          fetchAnalyticsData();
        }
      )
      .subscribe();

    return () => {
      chatSubscription.unsubscribe();
      userSubscription.unsubscribe();
    };
  }, []);

  const processAnalyticsData = (chatLogs: ChatLog[], userProfiles: UserProfile[]): AnalyticsData => {
    // Process daily chat counts
    const chatsByDate = chatLogs.reduce((acc, log) => {
      const date = new Date(log.timestamp).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dailyChatCounts = Object.entries(chatsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days
    
    // Process top keluhan
    const keluhanCounts = userProfiles.reduce((acc, profile) => {
      if (profile.keluhan) {
        acc[profile.keluhan] = (acc[profile.keluhan] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topKeluhan = Object.entries(keluhanCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
    
    // Process top barrier
    const barrierCounts = userProfiles.reduce((acc, profile) => {
      if (profile.barrier) {
        acc[profile.barrier] = (acc[profile.barrier] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topBarrier = Object.entries(barrierCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
    
    // Process lead status distribution
    const leadStatusCounts = userProfiles.reduce((acc, profile) => {
      if (profile.lead_status) {
        acc[profile.lead_status] = (acc[profile.lead_status] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const leadStatusColors = {
      Hot: '#15803d', // Darker Green
      Warm: '#b45309', // Darker Amber
      Cold: '#b91c1c'  // Darker Red
    };
    
    const leadStatusDistribution = Object.entries(leadStatusCounts).map(([name, value]) => ({
      name,
      value,
      color: leadStatusColors[name as keyof typeof leadStatusColors] || '#6B7280' // Gray default
    }));
    
    return {
      dailyChatCounts,
      topKeluhan,
      topBarrier,
      leadStatusDistribution
    };
  };

  if (loading) {
    return (
      // improved UI: Better loading state
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8e003b] mb-3"></div>
            <p className="text-gray-500 font-medium">Loading analytics data...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      // improved UI: Better error state
      <div className="bg-red-50 border border-red-200 rounded-xl shadow p-6">
        <div className="flex items-center text-red-600 mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <span className="font-medium">Error Loading Analytics</span>
        </div>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    // improved UI: Modern analytics layout with enhanced visuals
    <div className="space-y-6">
      {/* improved UI: Analytics overview header with gradient */}
      <div className="bg-gradient-to-r from-white to-[#f5e0e8] p-6 rounded-xl shadow-lg border border-[#e6c0cf]">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8e003b] to-[#c32260]">Dashboard Analytics</h2>
        <p className="text-gray-600 mt-1">Real-time metrics and insights for Rumah Sehat Holistik</p>
      </div>
      
      {/* improved UI: Grid layout for charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Chat Count Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-[#e6c0cf] hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#8e003b]">Daily Chat Volume</h3>
            <span className="text-xs text-[#8e003b] bg-[#f5e0e8] px-3 py-1 rounded-full font-medium">
              Last 7 days
            </span>
          </div>
          {/* improved UI: Small title for chart with enhanced styling */}
          <p className="text-sm font-medium text-gray-500 mb-3 border-l-2 border-[#c32260] pl-2">Message volume trends over time</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analyticsData.dailyChatCounts}
                margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8e003b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#c32260" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Chat Messages"
                  stroke="#8e003b"
                  strokeWidth={2}
                  activeDot={{ r: 8, fill: '#c32260', stroke: '#fff' }}
                  dot={{ stroke: '#8e003b', strokeWidth: 2, fill: '#fff', r: 4 }}
                  fill="url(#colorCount)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Status Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-[#e6c0cf] hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#8e003b]">Lead Status Distribution</h3>
            <span className="text-xs text-[#8e003b] bg-[#f5e0e8] px-3 py-1 rounded-full font-medium">
              {analyticsData.leadStatusDistribution.reduce((sum, item) => sum + item.value, 0)} users
            </span>
          </div>
          {/* improved UI: Small title for chart with enhanced styling */}
          <p className="text-sm font-medium text-gray-500 mb-3 border-l-2 border-[#c32260] pl-2">Breakdown of user lead qualification status</p>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.leadStatusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  paddingAngle={2}
                >
                  {analyticsData.leadStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center" 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Keluhan Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-[#e6c0cf] hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#8e003b]">Top 5 Keluhan</h3>
            <span className="text-xs text-[#8e003b] bg-[#f5e0e8] px-3 py-1 rounded-full font-medium">
              Most common complaints
            </span>
          </div>
          {/* improved UI: Small title for chart with enhanced styling */}
          <p className="text-sm font-medium text-gray-500 mb-3 border-l-2 border-[#c32260] pl-2">Most frequently reported health concerns</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.topKeluhan}
                margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar 
                  dataKey="count" 
                  name="Users" 
                  fill="#c32260" 
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList dataKey="count" position="right" fill="#8e003b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Barrier Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-[#e6c0cf] hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#8e003b]">Top 5 Barrier</h3>
            <span className="text-xs text-[#8e003b] bg-[#f5e0e8] px-3 py-1 rounded-full font-medium">
              Common obstacles
            </span>
          </div>
          {/* improved UI: Small title for chart with enhanced styling */}
          <p className="text-sm font-medium text-gray-500 mb-3 border-l-2 border-[#c32260] pl-2">Key obstacles preventing users from seeking care</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.topBarrier}
                margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar 
                  dataKey="count" 
                  name="Users" 
                  fill="#f59e0b" 
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList dataKey="count" position="right" fill="#b45309" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
