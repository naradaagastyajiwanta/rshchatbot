'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import UserSidebar from './UserSidebar';
import ChatWindow from './ChatWindow';

interface UserProfile {
  wa_number: string;
  name: string;
  last_updated: string;
}

export default function LiveChatLayout() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('wa_number, name, last_updated')
          .order('last_updated', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          setUsers(data);
          // Auto-select the first user if none is selected
          if (!selectedUser) {
            setSelectedUser(data[0].wa_number);
          }
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
                updatedUsers[existingIndex] = {
                  wa_number: payload.new.wa_number,
                  name: payload.new.name,
                  last_updated: payload.new.last_updated
                };
                return updatedUsers;
              } else {
                // Add new user
                return [...prevUsers, {
                  wa_number: payload.new.wa_number,
                  name: payload.new.name,
                  last_updated: payload.new.last_updated
                }];
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
  }, [selectedUser]);

  const handleUserSelect = (waNumber: string) => {
    setSelectedUser(waNumber);
  };

  if (loading) {
    return (
      <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
        <div className="flex justify-center items-center w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8e003b] mb-3"></div>
            <p className="text-gray-500 font-medium">Loading chat interface...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl shadow p-6">
        <div className="flex items-center text-red-600 mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <span className="font-medium">Error</span>
        </div>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
      <UserSidebar 
        users={users} 
        selectedUser={selectedUser} 
        onSelectUser={handleUserSelect} 
      />
      <ChatWindow waNumber={selectedUser || ''} />
    </div>
  );
}
