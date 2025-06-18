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
  ResponsiveContainer
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
      Hot: '#10B981', // Green
      Warm: '#F59E0B', // Yellow
      Cold: '#EF4444'  // Red
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
    return <div className="flex justify-center p-6">Loading analytics data...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-6">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Daily Chat Count Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Chat Volume</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analyticsData.dailyChatCounts}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end"
                height={60}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Chat Messages"
                stroke="#3B82F6"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Keluhan Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Keluhan</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.topKeluhan}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Users" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Barrier Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Barrier</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.topBarrier}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Users" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lead Status Distribution Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Lead Status Distribution</h3>
        <div className="h-80 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analyticsData.leadStatusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {analyticsData.leadStatusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
