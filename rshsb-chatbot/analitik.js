/**
 * Script to retrieve and display messages from an analytic thread
 * This helps to inspect what's being sent to the OpenAI Insight Assistant
 */

require('dotenv').config();
const axios = require('axios');
const { supabase } = require('./supabase');

// Headers for OpenAI API requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  'OpenAI-Beta': 'assistants=v2'
};

/**
 * Retrieve messages from a thread by ID
 * @param {string} threadId - OpenAI thread ID
 * @returns {Promise<Array>} - Array of messages
 */
async function retrieveThreadMessages(threadId) {
  try {
    console.log(`Retrieving messages from thread ${threadId}...`);
    const response = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers }
    );
    
    return response.data.data;
  } catch (error) {
    console.error('Error retrieving thread messages:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get thread ID by WhatsApp number
 * @param {string} waNumber - WhatsApp number
 * @returns {Promise<string|null>} - Thread ID or null
 */
async function getThreadIdByWaNumber(waNumber) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('thread_id_analytic')
      .eq('wa_number', waNumber)
      .single();
    
    if (error || !data) {
      console.error('Error retrieving thread ID:', error);
      return null;
    }
    
    return data.thread_id_analytic;
  } catch (error) {
    console.error('Exception retrieving thread ID:', error);
    return null;
  }
}

/**
 * Format and display a message
 * @param {Object} message - Message object
 */
function displayMessage(message) {
  const role = message.role.toUpperCase();
  const timestamp = new Date(message.created_at).toLocaleString();
  let content = '';
  
  if (message.content && message.content.length > 0) {
    content = message.content[0].text?.value || JSON.stringify(message.content);
  }
  
  console.log(`\n[${timestamp}] ${role}:`);
  console.log('----------------------------------------');
  console.log(content);
  console.log('----------------------------------------');
}

/**
 * Main function
 */
async function main() {
  // Get thread ID from command line arguments or prompt for WhatsApp number
  let threadId = process.argv[2];
  
  if (!threadId) {
    // If no thread ID provided, try to get from WhatsApp number
    const waNumber = process.argv[3];
    
    if (waNumber) {
      console.log(`Looking up thread ID for WhatsApp number: ${waNumber}`);
      threadId = await getThreadIdByWaNumber(waNumber);
      
      if (!threadId) {
        console.error(`No thread ID found for WhatsApp number: ${waNumber}`);
        process.exit(1);
      }
    } else {
      console.error('Usage: node retrieve-analytic-thread.js <thread_id> OR node retrieve-analytic-thread.js --wa <wa_number>');
      process.exit(1);
    }
  }
  
  console.log(`Using thread ID: ${threadId}`);
  
  // Retrieve messages
  const messages = await retrieveThreadMessages(threadId);
  
  if (messages.length === 0) {
    console.log('No messages found in thread.');
    process.exit(0);
  }
  
  console.log(`\nFound ${messages.length} messages in thread ${threadId}:`);
  
  // Display messages in chronological order (oldest first)
  messages.reverse().forEach(displayMessage);
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
