'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ChatViewer from './ChatViewer';
import Link from 'next/link';
import ResetThreadButton from './ResetThreadButton';

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
  is_bot_active: boolean;
}

export default function UserDetail({ waNumber }: { waNumber: string }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('wa_number', waNumber)
          .single();
        
        if (error) {
          throw error;
        }
        
        setUser(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (waNumber) {
      fetchUserProfile();
    }
    
    // Set up real-time subscription for user profile updates
    const subscription = supabase
      .channel(`user_profile_${waNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `wa_number=eq.${waNumber}`
        },
        (payload) => {
          setUser(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [waNumber]);

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
      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-[#e6c0cf] h-full hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#8e003b]">Chat History</h3>
            <span className="text-xs text-[#8e003b] bg-[#f5e0e8] px-3 py-1 rounded-full font-medium">
              Loading...
            </span>
          </div>
          <p className="text-gray-700 font-medium">Loading user profile...</p>
          <p className="text-xs text-gray-600 mt-1">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl shadow-md p-6">
        <div className="flex items-center text-red-600 mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <span className="font-medium">Error Loading User Profile</span>
        </div>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-md p-6 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">User Profile Not Found</h3>
        <p className="text-gray-500">The requested user profile could not be found</p>
      </div>
    );
  }

  // Function to toggle bot active status
  const toggleBotActive = async () => {
    if (!user) return;
    
    try {
      const newStatus = !user.is_bot_active;
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_bot_active: newStatus })
        .eq('wa_number', waNumber);
      
      if (error) throw error;
      
      // Update local state
      setUser({
        ...user,
        is_bot_active: newStatus
      });
      
      // Show toast message
      setToastMessage(newStatus ? "Bot enabled" : "Bot disabled");
      setShowToast(true);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating bot status:', err);
      setToastMessage("Failed to update bot status");
      setShowToast(true);
      
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Toast notification */}
      {showToast && toastMessage && (
        <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 border-l-4 border-[#8e003b] animate-fade-in-out">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-[#8e003b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-gray-800 font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
      
      <div className="bg-gradient-to-br from-white to-[#fdf7fa] p-6 rounded-xl shadow-lg border border-[#e6c0cf] hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#8e003b]">Profile Information</h3>
          <div className="flex items-center space-x-3">
            <ResetThreadButton 
              waNumber={waNumber} 
              onSuccess={() => {
                // Refresh user data after reset
                const fetchUserProfile = async () => {
                  try {
                    const { data, error } = await supabase
                      .from('user_profiles')
                      .select('*')
                      .eq('wa_number', waNumber)
                      .single();
                    
                    if (error) throw error;
                    setUser(data);
                  } catch (err) {
                    console.error('Error refreshing user profile:', err);
                  }
                };
                
                fetchUserProfile();
              }} 
            />
            <span 
              className={`text-xs px-3 py-1 rounded-full font-medium ${getLeadStatusColor(user.lead_status)}`}
            >
              {user.lead_status}
            </span>
          </div>
        </div>
        
        {/* Bot Active Toggle */}
        <div className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-[#e6c0cf] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-[#8e003b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span className="font-medium text-gray-900">Bot Active</span>
            </div>
            
            {/* Custom Toggle Switch */}
            <button 
              onClick={toggleBotActive}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#8e003b] focus:ring-offset-2 ${user?.is_bot_active ? 'bg-[#8e003b]' : 'bg-gray-300'}`}
              role="switch"
              aria-checked={user?.is_bot_active || false}
            >
              <span className="sr-only">Toggle bot active</span>
              <span 
                className={`${user?.is_bot_active ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2 ml-7">
            {user?.is_bot_active 
              ? "Bot is currently active and will respond to user messages." 
              : "Bot is disabled and will not respond to user messages."}
          </p>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-gradient-to-r from-white to-[#f5e0e8] p-4 rounded-xl shadow-md border border-[#e6c0cf] animate-pulse-slow">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8e003b] to-[#c32260]">User Profile</h2>
            <Link href="/users" className="text-[#8e003b] hover:text-[#5e0027] flex items-center bg-white px-3 py-1 rounded-lg shadow-sm hover:shadow transition-all duration-200">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Back to Users
            </Link>
          </div>
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center bg-[#f5e0e8] p-2 rounded-lg border-l-2 border-[#c32260]">
              <svg className="w-4 h-4 mr-1 text-[#8e003b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <span className="font-bold">Personal Information</span>
            </h4>
            <div className="bg-gray-50 p-4 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs font-medium text-gray-800 block mb-1">Age</span>
                  <p className="text-sm font-medium text-gray-900">{user.age || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-800 block mb-1">Gender</span>
                  <p className="text-sm font-medium text-gray-900">{user.gender || 'Not specified'}</p>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-800 block mb-1">Domisili</span>
                <p className="text-sm font-medium text-gray-900">{user.domisili || 'Not specified'}</p>
              </div>
            </div>
          </div>
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center bg-[#f5e0e8] p-2 rounded-lg border-l-2 border-[#c32260]">
              <svg className="w-4 h-4 mr-1 text-[#8e003b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <span className="font-bold">Health Information</span>
            </h4>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-[#e6c0cf] transition-all duration-300">
                <div className="flex items-center mb-1">
                  <svg className="w-4 h-4 mr-1 text-[#8e003b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-sm text-[#8e003b] font-semibold">Keluhan</p>
                </div>
                <p className="font-medium text-gray-900 pl-5">{user.keluhan || 'Not specified'}</p>
              </div>
              <div className="bg-gradient-to-r from-amber-100 to-yellow-100 p-4 rounded-lg border border-amber-200 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full opacity-20"></div>
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <p className="text-sm text-amber-700 font-semibold">Barrier</p>
                </div>
                <p className="font-medium text-gray-900 pl-7">{user.barrier || 'Not specified'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-[#e6c0cf] transition-all duration-300">
                <div className="flex items-center mb-1">
                  <svg className="w-4 h-4 mr-1 text-[#8e003b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-sm text-[#8e003b] font-semibold">Urgency Level</p>
                </div>
                <p className="font-medium text-gray-900 pl-5">{user.urgency_level || 'Not specified'}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center bg-[#f5e0e8] p-2 rounded-lg border-l-2 border-[#c32260]">
              <svg className="w-4 h-4 mr-1 text-[#8e003b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="font-bold">Additional Information</span>
            </h4>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-[#e6c0cf] transition-all duration-300">
                <div className="flex items-center mb-1">
                  <svg className="w-4 h-4 mr-1 text-[#8e003b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-sm text-[#8e003b] font-semibold">Program Awareness</p>
                </div>
                <p className="font-medium text-gray-900 pl-5">{user.program_awareness || 'Not specified'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-[#e6c0cf] transition-all duration-300">
                <div className="flex items-center mb-1">
                  <svg className="w-4 h-4 mr-1 text-[#8e003b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <p className="text-sm text-[#8e003b] font-semibold">Last Updated</p>
                </div>
                <p className="font-medium text-gray-900 pl-5">{user.last_updated ? new Date(user.last_updated).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Column: Chat History */}
      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-[#e6c0cf] h-full hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#8e003b]">Chat History</h3>
            <span className="text-xs text-[#8e003b] bg-[#f5e0e8] px-3 py-1 rounded-full font-medium">
              Conversation
            </span>
          </div>
          <ChatViewer waNumber={waNumber} />
        </div>
      </div>
    </div>
  );
}
