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
 * Get thread ID for a WhatsApp number if it exists
 * @param {string} waNumber - WhatsApp phone number
 * @returns {string|null} - Thread ID or null if not found
 */
async function getThreadId(waNumber) {
  try {
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

module.exports = {
  supabase,
  logChat,
  getThreadId,
  updateUserProfile,
  getUserProfile
};
