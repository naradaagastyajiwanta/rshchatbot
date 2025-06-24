'use client';

import { useEffect, useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import ChatBubble from './ChatBubble';
import useChatLogsRealtime from '../hooks/useChatLogsRealtime';
import { toast } from 'react-hot-toast';

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
  is_bot_active?: boolean;
}

interface ChatWindowProps {
  waNumber: string;
}

export default function ChatWindow({ waNumber }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [textareaHeight, setTextareaHeight] = useState<string>('auto');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [manualMessage, setManualMessage] = useState<string>('');
  const [sendingManualMessage, setSendingManualMessage] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use our custom hook for realtime updates
  const newMessages = useChatLogsRealtime(waNumber);
  
  // Reset newMessages when waNumber changes to avoid showing messages from previous user
  useEffect(() => {
    if (messages.length > 0) {
      setMessages([]);
    }
  }, [waNumber]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle input change and auto-grow textarea
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Auto-grow textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      setTextareaHeight(`${textareaRef.current.scrollHeight}px`);
    }
  };
  
  // Handle key press events (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Send message function
  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    
    // Don't send empty messages
    if (!trimmedMessage || !waNumber) return;
    
    // Validate wa_number
    if (!waNumber.startsWith('62') || waNumber.length < 10) {
      toast.error('Invalid WhatsApp number format');
      return;
    }
    
    setSendingMessage(true);
    
    try {
      // Get API key and URL from env
      const apiKey = process.env.NEXT_PUBLIC_API_KEY_SEND_MESSAGE;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      if (!apiKey) {
        throw new Error('API key not configured');
      }
      
      // Send message to backend
      const response = await fetch(`${apiUrl}/api/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          wa_number: waNumber,
          message: trimmedMessage
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      // Clear input after successful send
      setInputMessage('');
      setTextareaHeight('auto');
      
      // Optimistically add message to UI with a temporary ID
      const tempId = `temp-${Date.now()}`;
      const newMessage: ChatMessage = {
        id: tempId, // Temporary ID with prefix for easy identification
        wa_number: waNumber,
        message: trimmedMessage,
        direction: 'outgoing',
        timestamp: new Date().toISOString(),
        thread_id: '' // We don't have this info
      };
      
      // Add to messages with temporary ID
      setMessages(prev => [...prev, newMessage]);
      
      // Note: We're not inserting to Supabase directly from the frontend anymore
      // This prevents duplicate entries since the backend will handle the insertion
      
      // Show success toast
      toast.success('Message sent successfully');
      
      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Handle manual message send to OpenAI
  const handleManualSend = async () => {
    const trimmedMessage = manualMessage.trim();
    
    // Don't send empty messages
    if (!trimmedMessage || !waNumber) return;
    
    // Validate wa_number
    if (!waNumber.startsWith('62') || waNumber.length < 10) {
      toast.error('Invalid WhatsApp number format');
      return;
    }
    
    setSendingManualMessage(true);
    
    try {
      // Get API URL from env
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Send manual message to backend
      const response = await fetch(`${apiUrl}/api/manual-user-input`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-rsh-secret-1'
        },
        body: JSON.stringify({
          wa_number: waNumber,
          message: trimmedMessage
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process manual input');
      }
      
      // Clear input after successful send
      setManualMessage('');
      
      // Show success toast
      toast.success('Manual message processed successfully');
      
      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
      
    } catch (error) {
      console.error('Error processing manual input:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process manual input');
    } finally {
      setSendingManualMessage(false);
    }
  };

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!waNumber) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('wa_number, name, last_updated, is_bot_active')
          .eq('wa_number', waNumber)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        setUserProfile(data);
        // Default to true if is_bot_active is undefined/null
        setIsBotActive(data.is_bot_active !== false);
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
      }
    };
    
    fetchUserProfile();
  }, [waNumber]);
  
  // Toggle bot active status
  const toggleBotActive = async () => {
    if (!waNumber) return;
    
    try {
      const newStatus = !isBotActive;
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_bot_active: newStatus })
        .eq('wa_number', waNumber);
      
      if (error) {
        console.error('Error updating bot status:', error);
        return;
      }
      
      setIsBotActive(newStatus);
      
      // Show toast notification
      setToastMessage(newStatus ? 'Bot enabled' : 'Bot disabled');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
    } catch (err) {
      console.error('Error toggling bot status:', err);
    }
  };

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
          .order('timestamp', { ascending: false })
          .limit(500);
        
        if (error) {
          throw error;
        }
        
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
  }, [waNumber]);

  // Handle new messages from realtime subscription
  useEffect(() => {
    if (newMessages && newMessages.length > 0) {
      setMessages((prevMessages: ChatMessage[]) => {
        // Create a new array to hold the updated messages
        let updatedMessages = [...prevMessages];
        
        // Process each new message
        for (const newMsg of newMessages) {
          // Check if this is a message we sent (matches our temp messages by content and direction)
          const tempMessageIndex = updatedMessages.findIndex(
            msg => msg.id.startsWith('temp-') && 
                  msg.message === newMsg.message && 
                  msg.direction === newMsg.direction && 
                  msg.wa_number === newMsg.wa_number
          );
          
          if (tempMessageIndex >= 0) {
            // Replace the temporary message with the real one
            updatedMessages[tempMessageIndex] = newMsg;
          } else {
            // Check if this message already exists by ID
            const existingIndex = updatedMessages.findIndex(msg => msg.id === newMsg.id);
            if (existingIndex < 0) {
              // This is a genuinely new message, add it
              updatedMessages.push(newMsg);
            }
          }
        }
        
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
      <div className="p-2 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center">
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
        
        {/* Bot toggle switch */}
        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2">Bot Active</span>
          <button 
            onClick={toggleBotActive}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isBotActive ? 'bg-pink-500 focus:ring-pink-500' : 'bg-gray-300 focus:ring-gray-400'}`}
          >
            <span className="sr-only">Toggle bot active status</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBotActive ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
        
        {/* Toast notification */}
        {showToast && (
          <div className="toast-notification">
            <div className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg">
              {toastMessage}
            </div>
          </div>
        )}
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
            messages.map((message: ChatMessage, index: number) => (
              <ChatBubble
                key={message.id || index}
                message={message.message}
                direction={message.direction}
                timestamp={message.timestamp}
                isLast={index === messages.length - 1}
              />
            ))
          )}
          <div ref={messagesEndRef} /> {/* Anchor for auto-scrolling */}
        </div>
      </div>
      
      {/* Chat input area */}
      <div className="border-t bg-white p-3">
        <div className="flex items-end space-x-2">
          <div className="flex-1 min-h-[40px] rounded-lg border border-gray-300 overflow-hidden focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500">
            <textarea
              ref={textareaRef}
              className="w-full px-3 py-2 outline-none resize-none min-h-[40px] max-h-[120px] text-black"
              placeholder="Type a message..."
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={sendingMessage}
              style={{ height: textareaHeight }}
            />
          </div>
          <button
            className="bg-pink-600 hover:bg-pink-700 text-white rounded-full p-2 flex items-center justify-center h-10 w-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sendingMessage}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </div>
        
        {/* Manual input area */}
        {waNumber && (
          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
            <textarea
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              placeholder="Ketik pesan manual untuk bot..."
              className="w-full p-2 rounded border text-sm text-black"
              rows={2}
              disabled={sendingManualMessage}
            />
            <button
              onClick={handleManualSend}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!manualMessage.trim() || sendingManualMessage}
            >
              {sendingManualMessage ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mengirim...
                </span>
              ) : (
                'Kirim ke Bot'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
