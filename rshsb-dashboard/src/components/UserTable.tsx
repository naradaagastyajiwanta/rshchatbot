'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

interface UserProfile {
  wa_number: string;
  name: string;
  gender: string;
  domisili: string;
  keluhan: string;
  barrier: string;
  lead_status: 'Cold' | 'Warm' | 'Hot';
  last_updated: string;
  age: number;
  symptoms: string;
  medical_history: string;
  urgency_level: string;
  emotion: string;
  program_awareness: string;
}

export default function UserTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    keluhan: '',
    barrier: '',
    domisili: '',
    lead_status: ''
  });
  
  // Unique filter options
  const [filterOptions, setFilterOptions] = useState({
    keluhan: [] as string[],
    barrier: [] as string[],
    domisili: [] as string[],
    lead_status: ['Cold', 'Warm', 'Hot']
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setUsers(data);
          
          // Extract unique filter options
          const keluhan = [...new Set(data.map(user => user.keluhan).filter(Boolean))];
          const barrier = [...new Set(data.map(user => user.barrier).filter(Boolean))];
          const domisili = [...new Set(data.map(user => user.domisili).filter(Boolean))];
          
          setFilterOptions({
            ...filterOptions,
            keluhan,
            barrier,
            domisili
          });
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load user profiles');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    
    // Set up real-time subscription for user updates
    const subscription = supabase
      .channel('user_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setUsers(prevUsers => {
              const existingIndex = prevUsers.findIndex(user => user.wa_number === payload.new.wa_number);
              if (existingIndex >= 0) {
                // Update existing user
                const updatedUsers = [...prevUsers];
                updatedUsers[existingIndex] = payload.new as UserProfile;
                return updatedUsers;
              } else {
                // Add new user
                return [...prevUsers, payload.new as UserProfile];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setUsers(prevUsers => 
              prevUsers.filter(user => user.wa_number !== payload.old.wa_number)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle filter changes
  const handleFilterChange = (filterName: string, value: string) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };

  // Apply filters to users
  const filteredUsers = users.filter(user => {
    return (
      (filters.keluhan === '' || user.keluhan === filters.keluhan) &&
      (filters.barrier === '' || user.barrier === filters.barrier) &&
      (filters.domisili === '' || user.domisili === filters.domisili) &&
      (filters.lead_status === '' || user.lead_status === filters.lead_status)
    );
  });

  // Get lead status color
  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'Hot':
        return 'bg-green-100 text-green-800';
      case 'Warm':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-6">Loading user profiles...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-6">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">User Profiles</h2>
      </div>
      
      {/* Filters */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 border-b border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keluhan</label>
          <select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.keluhan}
            onChange={(e) => handleFilterChange('keluhan', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.keluhan.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barrier</label>
          <select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.barrier}
            onChange={(e) => handleFilterChange('barrier', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.barrier.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Domisili</label>
          <select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.domisili}
            onChange={(e) => handleFilterChange('domisili', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.domisili.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lead Status</label>
          <select
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.lead_status}
            onChange={(e) => handleFilterChange('lead_status', e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.lead_status.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keluhan
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Barrier
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domisili
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No users found matching the selected filters
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.wa_number} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/user/${user.wa_number}`} className="text-blue-600 hover:text-blue-900">
                      <div className="font-medium">{user.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{user.wa_number}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.keluhan || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.barrier || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.domisili || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLeadStatusColor(user.lead_status)}`}>
                      {user.lead_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_updated ? new Date(user.last_updated).toLocaleString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
