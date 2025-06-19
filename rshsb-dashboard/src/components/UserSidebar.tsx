'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UserProfile {
  wa_number: string;
  name: string;
  last_updated: string;
}

interface ChatMessage {
  id: string;
  wa_number: string;
  message: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
}

interface UserSidebarProps {
  users: UserProfile[];
  selectedUser: string | null;
  onSelectUser: (waNumber: string) => void;
}

export default function UserSidebar({ users, selectedUser, onSelectUser }: UserSidebarProps) {
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLastMessages = async () => {
      try {
        setLoading(true);
        
        // Fetch last message for each user
        const promises = users.map(async (user) => {
          const { data, error } = await supabase
            .from('chat_logs')
            .select('*')
            .eq('wa_number', user.wa_number)
            .order('timestamp', { ascending: false })
            .limit(1);
          
          if (error) {
            console.error(`Error fetching last message for ${user.wa_number}:`, error);
            return null;
          }
          
          return data && data.length > 0 ? { waNumber: user.wa_number, message: data[0] } : null;
        });
        
        const results = await Promise.all(promises);
        
        const messagesMap: Record<string, ChatMessage> = {};
        results.forEach(result => {
          if (result) {
            messagesMap[result.waNumber] = result.message;
          }
        });
        
        setLastMessages(messagesMap);
      } catch (err) {
        console.error('Error fetching last messages:', err);
      } finally {
        setLoading(false);
      }
    };

    if (users.length > 0) {
      fetchLastMessages();
    }
    
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('chat_logs_sidebar')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs'
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Update last message for the user
          setLastMessages(prev => ({
            ...prev,
            [newMessage.wa_number]: newMessage
          }));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [users]);

  // Format timestamp to a readable time
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show date without year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show date with year
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Truncate message to a preview
  const truncateMessage = (message: string, maxLength = 40) => {
    if (!message) return '';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  return (
    <div className="w-80 bg-white border-r shadow-sm flex flex-col">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
        <button 
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          onClick={() => window.location.reload()}
          title="Refresh"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      </div>
      
      {loading && users.length > 0 ? (
        <div className="flex justify-center items-center p-6 flex-grow">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-y-auto flex-grow">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <p className="text-gray-500">No users found</p>
              <p className="text-xs text-gray-400 mt-1">Users will appear here when they message you</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {users.map((user) => (
                <li 
                  key={user.wa_number}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedUser === user.wa_number ? 'bg-blue-50' : ''}`}
                  onClick={() => onSelectUser(user.wa_number)}
                >
                  <div className="flex items-center p-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-3 flex-shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.wa_number.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {user.name || 'Unknown'}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {lastMessages[user.wa_number] ? formatTime(lastMessages[user.wa_number].timestamp) : ''}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <p className="text-xs text-gray-500 truncate">
                          {user.wa_number}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {lastMessages[user.wa_number] ? (
                          <>
                            {lastMessages[user.wa_number].direction === 'outgoing' && (
                              <span className="text-xs text-blue-500 mr-1">You: </span>
                            )}
                            {truncateMessage(lastMessages[user.wa_number].message)}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No messages yet</span>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
