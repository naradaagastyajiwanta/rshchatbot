'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import ChatBubble from './ChatBubble';
import useChatLogsRealtime from '../hooks/useChatLogsRealtime';

interface ChatMessage {
  id: string;
  wa_number: string;
  message: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  thread_id: string;
}

interface UserProfile {
  wa_number: string;
  name: string;
  last_updated: string;
}

interface ChatWindowProps {
  waNumber: string;
}

export default function ChatWindow({ waNumber }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use our custom hook for realtime updates
  const newMessages = useChatLogsRealtime(waNumber);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!waNumber) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('wa_number, name, last_updated')
          .eq('wa_number', waNumber)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        setUserProfile(data);
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
      }
    };
    
    fetchUserProfile();
  }, [waNumber]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!waNumber) {
        setMessages([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('chat_logs')
          .select('*')
          .eq('wa_number', waNumber)
          .order('timestamp', { ascending: true })
          .limit(50);
        
        if (error) {
          throw error;
        }
        
        setMessages(data || []);
        setTimeout(scrollToBottom, 100); // Scroll after messages load
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load chat messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [waNumber]);

  // Handle new messages from realtime subscription
  useEffect(() => {
    if (newMessages && newMessages.length > 0) {
      setMessages(prevMessages => {
        // Filter out duplicates
        const newMessagesFiltered = newMessages.filter(
          newMsg => !prevMessages.some(prevMsg => prevMsg.id === newMsg.id)
        );
        
        if (newMessagesFiltered.length === 0) return prevMessages;
        
        const updatedMessages = [...prevMessages, ...newMessagesFiltered];
        
        // Sort by timestamp
        updatedMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return updatedMessages;
      });
      
      setTimeout(scrollToBottom, 100);
    }
  }, [newMessages]);

  if (!waNumber) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <h3 className="text-lg font-medium text-gray-700">Select a chat to start messaging</h3>
          <p className="text-gray-500 mt-2">Choose a contact from the sidebar</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center p-6">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8e003b] mb-2"></div>
          <p className="text-gray-500">Loading chat messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-red-50">
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
    <div className="flex-1 flex flex-col w-full h-full">
      {/* Chat header */}
      <div className="p-2 bg-gray-50 border-b flex items-center">
        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-3">
          {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : waNumber.charAt(0)}
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">
            {userProfile?.name || 'Unknown'}
          </h2>
          <p className="text-xs text-gray-500">{waNumber}</p>
        </div>
      </div>
      
      {/* Chat messages area with WhatsApp-like background */}
      <div 
        className="flex-1 flex flex-col w-full h-full p-6 overflow-y-auto" 
        style={{ 
          backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AkEEjIZty4BjQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAANklEQVQ4y2NgGAVDA/z//z+Gof//EzTsP0kGMpBi2H8SDWQkxbD/JBrISIph/0k0cMiHIQDwKQoUJGILdQAAAABJRU5ErkJggg==')",
          backgroundRepeat: 'repeat',
        }}
      >
        <div className="flex flex-col space-y-4 w-full">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white bg-opacity-80 rounded-lg shadow-sm">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <p>No messages yet</p>
              <p className="text-xs mt-1">Messages will appear here in real-time</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message.message}
                direction={message.direction}
                timestamp={message.timestamp}
                waNumber={message.direction === 'incoming' ? message.wa_number : undefined}
              />
            ))
          )}
          <div ref={messagesEndRef} /> {/* Anchor for auto-scrolling */}
        </div>
      </div>
    </div>
  );
}
