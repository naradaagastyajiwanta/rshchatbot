'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('chat_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);
        
        // If waNumber is provided, filter by that number
        if (waNumber) {
          query = query.eq('wa_number', waNumber);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        setMessages(data || []);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load chat messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel('chat_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs',
          filter: waNumber ? `wa_number=eq.${waNumber}` : undefined
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prevMessages) => [newMessage, ...prevMessages]);
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [waNumber]);

  if (loading) {
    return <div className="flex justify-center p-6">Loading chat messages...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-6">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          {waNumber ? `Chat with ${waNumber}` : 'Live Chat Viewer'}
        </h2>
      </div>
      
      <div className="p-4 h-[600px] overflow-y-auto flex flex-col-reverse">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No messages yet</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 max-w-[80%] ${
                message.direction === 'incoming' 
                  ? 'self-start' 
                  : 'self-end ml-auto'
              }`}
            >
              <div
                className={`p-3 rounded-lg ${
                  message.direction === 'incoming'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {message.message}
              </div>
              <div
                className={`text-xs mt-1 ${
                  message.direction === 'incoming' ? 'text-left' : 'text-right'
                }`}
              >
                {new Date(message.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
