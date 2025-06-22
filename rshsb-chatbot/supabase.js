/**
 * Supabase Client Setup and Database Operations
 * This module handles all database operations for the RSH chatbot
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Check if the database connection is working
async function checkDatabaseConnection() {
  try {
    const { error } = await supabase.from('chat_logs').select('count').limit(1);
    
    if (error && error.code === '42P01') { // Table doesn't exist
      console.log('Tables not found. Please run setup-db.js first to create the required tables.');
      return false;
    } else if (error) {
      console.error('Error connecting to Supabase:', error);
      return false;
    }
    
    console.log('Successfully connected to Supabase');
    return true;
  } catch (err) {
    console.error('Exception checking database connection:', err);
    return false;
  }
}

// Run the connection check
checkDatabaseConnection().then(connected => {
  if (!connected) {
    console.log('Database connection check failed. Some operations may not work properly.');
  }
});

/**
 * Log a chat message to the database
 * @param {string} waNumber - WhatsApp phone number
 * @param {string} message - Message content
 * @param {string} direction - 'incoming' or 'outgoing'
 * @param {string} threadId - OpenAI thread ID
 * @returns {Object} - Result of the insert operation
 */
async function logChat(waNumber, message, direction, threadId) {
  try {
    // Validate inputs
    if (!waNumber) {
      console.error('Error logging chat: waNumber is required');
      return { success: false, error: 'waNumber is required' };
    }

    if (!message) {
      console.error('Error logging chat: message is required');
      return { success: false, error: 'message is required' };
    }

    if (!direction || (direction !== 'incoming' && direction !== 'outgoing')) {
      console.error('Error logging chat: direction must be "incoming" or "outgoing"');
      return { success: false, error: 'direction must be "incoming" or "outgoing"' };
    }

    // Prepare the data to insert
    const chatData = {
      wa_number: waNumber,
      message: message,
      direction: direction,
      timestamp: new Date().toISOString(),
    };

    // Only include thread_id if it's provided
    if (threadId) {
      chatData.thread_id = threadId;
    }

    console.log(`Logging ${direction} message for ${waNumber}${threadId ? ` with thread ID ${threadId}` : ''}`);
    
    const { data, error } = await supabase
      .from('chat_logs')
      .insert(chatData);

    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        console.error('Error logging chat: chat_logs table does not exist. Run setup-db.js first.');
      } else {
        console.error('Error logging chat:', error);
      }
      return { success: false, error };
    }

    console.log('Chat logged successfully');
    return { success: true, data };
  } catch (err) {
    console.error('Exception in logChat:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get thread ID for a WhatsApp number if it exists (DEPRECATED)
 * @deprecated Use getOrCreateChatbotThreadId or getOrCreateAnalyticThreadId instead
 * @param {string} waNumber - WhatsApp phone number
 * @returns {string|null} - Thread ID or null if not found
 */
async function getThreadId(waNumber) {
  console.warn('getThreadId is deprecated. Use getOrCreateChatbotThreadId or getOrCreateAnalyticThreadId instead');
  try {
    // First try to get from user_profiles
    const profile = await getUserProfile(waNumber);
    if (profile && profile.thread_id_chatbot) {
      return profile.thread_id_chatbot;
    }
    
    // Fall back to legacy method if not found in user_profiles
    const { data, error } = await supabase
      .from('chat_logs')
      .select('thread_id')
      .eq('wa_number', waNumber)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting thread ID:', error);
      return null;
    }

    return data && data.length > 0 ? data[0].thread_id : null;
  } catch (err) {
    console.error('Exception in getThreadId:', err);
    return null;
  }
}

/**
 * Update or create user profile with extracted insights
 * @param {string} waNumber - WhatsApp phone number
 * @param {Object} insights - Extracted insights object
 * @returns {Object} - Result of the upsert operation
 */
async function updateUserProfile(waNumber, insights) {
  try {
    // Add timestamp and phone number to insights
    const profileData = {
      ...insights,
      wa_number: waNumber,
      last_updated: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'wa_number' });

    if (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception in updateUserProfile:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get user profile data
 * @param {string} waNumber - WhatsApp phone number
 * @returns {Object|null} - User profile data or null if not found
 */
async function getUserProfile(waNumber) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wa_number', waNumber)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error getting user profile:', error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error('Exception in getUserProfile:', err);
    return null;
  }
}

/**
 * Generic helper to get or create a thread ID
 * @param {string} waNumber - WhatsApp phone number
 * @param {string} columnName - Column name in user_profiles table ('thread_id_chatbot' or 'thread_id_analytic')
 * @param {string} assistantId - OpenAI Assistant ID to use for thread creation
 * @returns {Promise<string|null>} - Thread ID or null if error
 */
async function getOrCreateThreadId(waNumber, columnName, assistantId) {
  if (!waNumber) {
    console.error('Missing WhatsApp number in getOrCreateThreadId');
    return null;
  }

  try {
    // Get user profile
    const profile = await getUserProfile(waNumber);
    
    // If thread ID exists in profile, return it
    if (profile && profile[columnName] && profile[columnName].startsWith('thread_')) {
      console.log(`Using existing ${columnName} from user_profiles: ${profile[columnName]}`);
      return profile[columnName];
    }
    
    // Thread ID doesn't exist or is invalid, create a new one using OpenAI API
    console.log(`No valid ${columnName} found for ${waNumber}. Creating new thread...`);
    
    // Create a new thread using axios
    const axios = require('axios');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2'
    };
    
    const threadResponse = await axios.post(
      'https://api.openai.com/v1/threads',
      {}, // empty body as per the API docs
      { headers }
    );
    
    const threadId = threadResponse.data.id;
    console.log(`Created new thread with ID: ${threadId}`);
    
    // Update user profile with new thread ID
    const updateData = {};
    updateData[columnName] = threadId;
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ 
        wa_number: waNumber,
        ...updateData,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`Error updating ${columnName} in user_profiles:`, error);
      // Still return the thread ID even if saving to DB failed
    }
    
    return threadId;
  } catch (err) {
    console.error(`Exception in getOrCreateThreadId for ${columnName}:`, err);
    return null;
  }
}

/**
 * Get or create a thread ID for the main chatbot
 * @param {string} waNumber - WhatsApp phone number
 * @returns {Promise<string|null>} - Thread ID or null if error
 */
async function getOrCreateChatbotThreadId(waNumber) {
  return getOrCreateThreadId(waNumber, 'thread_id_chatbot', process.env.ASSISTANT_ID_CHATBOT);
}

/**
 * Get or create a thread ID for the analytics/insight assistant
 * @param {string} waNumber - WhatsApp phone number
 * @returns {Promise<string|null>} - Thread ID or null if error
 */
async function getOrCreateAnalyticThreadId(waNumber) {
return getOrCreateThreadId(waNumber, 'thread_id_analytic', process.env.ASSISTANT_ID_INSIGHT);
}

/**
 * Get the last outgoing message (from bot to user) for a specific WhatsApp number
 * @param {string} waNumber - WhatsApp phone number
 * @returns {Promise<string|null>} - Last bot message or null if not found
 */
async function getLastBotMessageFromDB(waNumber) {
try {
const { data, error } = await supabase
  .from('chat_logs')
  .select('message')
  .eq('wa_number', waNumber)
  .eq('direction', 'outgoing')
  .order('timestamp', { ascending: false })
  .limit(1);

if (error) {
  console.error('Error fetching last bot message:', error);
  return null;
}

if (!data || data.length === 0) {
  console.log(`No previous bot messages found for ${waNumber}`);
  return null;
}

console.log(`Found last bot message for ${waNumber}`);
return data[0].message;
} catch (err) {
console.error('Exception fetching last bot message:', err);
return null;
}
}

module.exports = {
  supabase,
  logChat,
  getThreadId, // Kept for backward compatibility
  updateUserProfile,
  getUserProfile,
  getOrCreateThreadId,
  getOrCreateChatbotThreadId,
  getOrCreateAnalyticThreadId,
  getLastBotMessageFromDB
};
