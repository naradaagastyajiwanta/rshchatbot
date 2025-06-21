'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import ExportPDFModal from './ExportPDFModal';

interface UserProfile {
  wa_number: string;
  name: string;
  gender: string;
  domisili: string;
  keluhan: string;
  barrier: string;
  lead_status: 'very_low' | 'low' | 'medium' | 'high' | 'very_high' | 'Cold' | 'Warm' | 'Hot';
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
  
  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Unique filter options
  const [filterOptions, setFilterOptions] = useState({
    keluhan: [] as string[],
    barrier: [] as string[],
    domisili: [] as string[],
    lead_status: ['very_low', 'low', 'medium', 'high', 'very_high', 'Cold', 'Warm', 'Hot']
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
  // improved UI: Updated color scheme for lead status badges
  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'Hot':
        return 'bg-green-100 text-green-700';
      case 'Warm':
        return 'bg-yellow-100 text-yellow-700';
      case 'Cold':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      // improved UI: Better loading state
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8e003b] mb-3"></div>
            <p className="text-gray-500 font-medium">Loading user profiles...</p>
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
          <span className="font-medium">Error Loading User Data</span>
        </div>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-[#fdf7fa] rounded-xl shadow-lg overflow-hidden border border-[#e6c0cf] hover:shadow-xl transition-all duration-300">
      {/* improved UI: Modern header with stats */}
      <div className="p-6 border-b border-[#e6c0cf] flex justify-between items-center bg-gradient-to-r from-white to-[#f5e0e8]">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8e003b] to-[#c32260]">User Profiles</h2>
          <p className="text-sm text-gray-800 font-medium mt-1">{filteredUsers.length} users found</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700 font-medium">
            Last updated: {new Date().toLocaleDateString()}
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-1.5 bg-[#8e003b] text-white rounded-md text-sm font-medium hover:bg-[#6d002d] transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Export to PDF
          </button>
        </div>
      </div>
      
      {/* improved UI: Modern filters with icons and better styling */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#fdf7fa] border-b border-[#e6c0cf]">
        <div>
          <label className="flex items-center text-sm font-medium text-gray-800 mb-2">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Keluhan
          </label>
          <select
            className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#8e003b] focus:ring-1 focus:ring-[#8e003b] transition-colors"
            value={filters.keluhan}
            onChange={(e) => handleFilterChange('keluhan', e.target.value)}
          >
            <option value="">All Keluhan</option>
            {filterOptions.keluhan.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="flex items-center text-sm font-medium text-gray-800 mb-2">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Barrier
          </label>
          <select
            className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#8e003b] focus:ring-1 focus:ring-[#8e003b] transition-colors"
            value={filters.barrier}
            onChange={(e) => handleFilterChange('barrier', e.target.value)}
          >
            <option value="">All Barriers</option>
            {filterOptions.barrier.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="flex items-center text-sm font-medium text-gray-800 mb-2">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            Domisili
          </label>
          <select
            className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#8e003b] focus:ring-1 focus:ring-[#8e003b] transition-colors"
            value={filters.domisili}
            onChange={(e) => handleFilterChange('domisili', e.target.value)}
          >
            <option value="">All Locations</option>
            {filterOptions.domisili.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="flex items-center text-sm font-medium text-gray-800 mb-2">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            Lead Status
          </label>
          <select
            className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#8e003b] focus:ring-1 focus:ring-[#8e003b] transition-colors"
            value={filters.lead_status}
            onChange={(e) => handleFilterChange('lead_status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {filterOptions.lead_status.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* improved UI: Modern table with zebra-striping */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-[#f5e0e8]">
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#8e003b] uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#8e003b] uppercase tracking-wider">
                Keluhan
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#8e003b] uppercase tracking-wider">
                Barrier
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#8e003b] uppercase tracking-wider">
                Domisili
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#8e003b] uppercase tracking-wider">
                Lead Status
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#8e003b] uppercase tracking-wider">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <p className="text-gray-700 font-medium">No users found matching the selected filters</p>
                    <p className="text-gray-600 text-sm mt-1">Try adjusting your filter criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr 
                  key={user.wa_number} 
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#fdf7fa]'} hover:bg-[#f5e0e8] transition-all duration-300 border-b border-gray-100`} 
                  // improved UI: Zebra-striping for better readability
                >
                  <td className="px-6 py-4">
                    <Link 
                      href={`/user/${user.wa_number}`} 
                      className="group flex flex-col"
                    >
                      <div className="font-medium text-gray-800 group-hover:text-[#8e003b] transition-colors">
                        {user.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-700 group-hover:text-[#a5114c] transition-colors">
                        {user.wa_number}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {user.keluhan ? (
                      <div className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">{user.keluhan}</div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">Not specified</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.barrier ? (
                      <div className="bg-gradient-to-r from-amber-100 to-yellow-100 px-3 py-2 rounded-lg border border-amber-200 shadow-sm inline-flex items-center">
                        <svg className="w-4 h-4 mr-1.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <span className="text-sm font-medium text-amber-800">{user.barrier}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">Not specified</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.domisili ? (
                      <div className="flex items-center text-sm text-gray-800">
                        <svg className="w-4 h-4 mr-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        {user.domisili}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">Not specified</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {/* improved UI: Better lead status badges with updated colors for 5 levels */}
                    {user.lead_status === 'very_high' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-1.5"></span>
                        Very High
                      </span>
                    )}
                    {user.lead_status === 'high' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                        High
                      </span>
                    )}
                    {user.lead_status === 'medium' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></span>
                        Medium
                      </span>
                    )}
                    {user.lead_status === 'low' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                        Low
                      </span>
                    )}
                    {user.lead_status === 'very_low' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        <span className="w-2 h-2 bg-red-600 rounded-full mr-1.5"></span>
                        Very Low
                      </span>
                    )}
                    {/* Legacy support */}
                    {user.lead_status === 'Hot' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                        Hot
                      </span>
                    )}
                    {user.lead_status === 'Warm' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></span>
                        Warm
                      </span>
                    )}
                    {user.lead_status === 'Cold' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                        Cold
                      </span>
                    )}
                    {!user.lead_status && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></span>
                        Not Set
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.last_updated ? (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {new Date(user.last_updated).toLocaleDateString()} at {new Date(user.last_updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">No data</div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* improved UI: Pagination placeholder */}
      <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing <span className="font-medium">{filteredUsers.length}</span> users
        </div>
        <div className="flex space-x-2">
          <button 
            disabled 
            className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
          >
            Previous
          </button>
          <button 
            disabled 
            className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
      
      {/* Export PDF Modal */}
      <ExportPDFModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filterOptions={filterOptions}
      />
    </div>
  );
}
