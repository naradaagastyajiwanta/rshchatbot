import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ChatMessage {
  id: string;
  wa_number: string;
  message: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  thread_id: string;
}

/**
 * Custom hook for subscribing to real-time chat log updates for a specific WhatsApp number
 * @param waNumber The WhatsApp number to subscribe to
 * @returns Array of new messages received in real-time
 */
export default function useChatLogsRealtime(waNumber: string) {
  const [newMessages, setNewMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!waNumber) {
      setNewMessages([]);
      return;
    }

    console.log(`Setting up real-time subscription for ${waNumber}`);
    
    // Create a unique channel name for this user
    const channelName = `chat_logs_${waNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Set up real-time subscription
    const channel = supabase.channel(channelName);
    
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs',
          filter: `wa_number=eq.${waNumber}`
        },
        (payload) => {
          console.log('Real-time message received:', payload);
          const newMessage = payload.new as ChatMessage;
          setNewMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for ${waNumber}:`, status);
      });

    // Clean up subscription when component unmounts or waNumber changes
    return () => {
      console.log(`Cleaning up subscription for ${waNumber}`);
      subscription.unsubscribe();
    };
  }, [waNumber]);

  return newMessages;
}
