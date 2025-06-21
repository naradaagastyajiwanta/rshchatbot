'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ChatMessage {
  id: string;
  wa_number: string;
  message: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  thread_id: string;
}

export default function ChatViewer({ waNumber = '' }: { waNumber?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        setLoading(true);
        console.log('Fetching initial messages...');
        
        let query = supabase
          .from('chat_logs')
          .select('*')
          .order('timestamp', { ascending: false }) // Changed to ascending for chronological order
          .limit(500);
        
        // If waNumber is provided, filter by that number
        if (waNumber) {
          query = query.eq('wa_number', waNumber);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        console.log('Initial messages loaded:', data?.length || 0);
        setMessages((data || []).reverse());
        setTimeout(scrollToBottom, 100); // Scroll after messages load
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load chat messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription dengan logging dan error handling yang lebih baik
    console.log('Setting up Supabase realtime subscription...');
    
    const channel = supabase.channel('chat_logs_changes');
    
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'chat_logs',
          filter: waNumber ? `wa_number=eq.${waNumber}` : undefined
        },
        (payload) => {
          console.log('Realtime event received:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage;
            console.log('New message received:', newMessage);
            setMessages((prevMessages) => [...prevMessages, newMessage]); // Add to end for chronological order
            setTimeout(scrollToBottom, 100); // Scroll after new message
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [waNumber]);

  // Format timestamp to a readable time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      // improved UI: Better loading state
      <div className="flex justify-center items-center p-6 h-[600px] bg-white rounded-xl shadow">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8e003b] mb-2"></div>
          <p className="text-gray-500">Loading chat messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      // improved UI: Better error state
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl shadow">
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
    // improved UI: Modern WhatsApp-like chat interface
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      {/* Chat header */}
      <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-[#f5e0e8] flex items-center justify-center text-[#8e003b] mr-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">
              {waNumber ? `Chat with ${waNumber}` : 'Live Chat Viewer'}
            </h2>
            <p className="text-xs text-gray-500">{messages.length} messages</p>
          </div>
        </div>
        <div className="text-gray-400 text-xs">
          {messages.length > 0 && (
            <span>Last message: {new Date(messages[messages.length - 1]?.timestamp).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      
      {/* Chat messages area with WhatsApp-like background */}
      <div 
        className="p-4 h-[600px] overflow-y-auto" 
        style={{ 
          backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AkEEjIZty4BjQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAANklEQVQ4y2NgGAVDA/z//z+Gof//EzTsP0kGMpBi2H8SDWQkxbD/JBrISIph/0k0cMiHIQDwKQoUJGILdQAAAABJRU5ErkJggg==')",
          backgroundRepeat: 'repeat',
        }}
      >
        <div className="flex flex-col space-y-4">
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
              <div
                key={message.id}
                className={`flex ${message.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[75%]`}>
                  {/* improved UI: WhatsApp-like chat bubbles with tails */}
                  <div
                    className={`relative p-3 rounded-lg ${message.direction === 'incoming'
                      ? 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                      : 'bg-green-500 text-white rounded-tr-none shadow-sm'
                    }`}
                  >
                    {/* Chat bubble tail */}
                    <div 
                      className={`absolute top-0 w-4 h-4 ${message.direction === 'incoming'
                        ? '-left-2 bg-white'
                        : '-right-2 bg-green-500'
                      }`}
                      style={{
                        clipPath: message.direction === 'incoming'
                          ? 'polygon(100% 0, 0 0, 100% 100%)'
                          : 'polygon(0 0, 100% 0, 0 100%)'
                      }}
                    ></div>
                    
                    {/* Message content */}
                    <div className="whitespace-pre-wrap break-words">{message.message}</div>
                    
                    {/* improved UI: Timestamp in bubble */}
                    <div className={`text-xs mt-1 ${message.direction === 'incoming' ? 'text-gray-500' : 'text-green-100'} text-right`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  
                  {/* Phone number label for incoming messages */}
                  {message.direction === 'incoming' && (
                    <div className="text-xs text-gray-500 ml-1 mt-1">
                      {message.wa_number}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} /> {/* Anchor for auto-scrolling */}
        </div>
      </div>
    </div>
  );
}
