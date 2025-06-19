/**
 * OpenAI Assistant API Integration using Axios
 * This module handles all interactions with OpenAI's Assistant API directly using Axios
 * to ensure proper header inclusion and reliable thread ID handling
 */

require('dotenv').config();
const axios = require('axios');
const { pollRunStatus } = require('./openai-utils');

// Constants from environment variables
const ASSISTANT_ID_CHATBOT = process.env.ASSISTANT_ID_CHATBOT;
const ASSISTANT_ID_INSIGHT = process.env.ASSISTANT_ID_INSIGHT;

if (!ASSISTANT_ID_CHATBOT || !ASSISTANT_ID_INSIGHT) {
  console.error('Assistant IDs not found in environment variables');
  process.exit(1);
}

// Headers for OpenAI API requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  'OpenAI-Beta': 'assistants=v2'
};

/**
 * Send a message to the chatbot assistant with run_id management
 * @param {string} message - Message to send to the chatbot
 * @param {string} threadId - Thread ID for continuing conversations (optional)
 * @param {string} waNumber - WhatsApp phone number (optional, used to store thread ID)
 * @returns {Object} - Response from the chatbot and thread ID
 */
async function sendToChatbot(message, threadId = null, waNumber = null) {
  let createdThread = null;
  let runId = null;
  const { getOrCreateChatbotThreadId, getUserProfile } = require('./supabase');
  const supabase = require('./supabase').supabase;
  
  try {
    console.log(`DEBUG - Thread ID received: ${threadId}, Type: ${typeof threadId}, WA Number: ${waNumber}`);
    
    // If we have a WhatsApp number, try to get or create a thread ID from user_profiles
    if (waNumber) {
      const profileThreadId = await getOrCreateChatbotThreadId(waNumber);
      if (profileThreadId) {
        threadId = profileThreadId;
        console.log(`Using thread ID from user_profiles: ${threadId}`);
      }
    }
    
    // Validate or create thread ID - ensure we always have a valid thread ID
    if (!threadId || threadId === 'undefined' || threadId === undefined || threadId === 'null') {
      console.log('No valid thread ID provided. Creating new thread...');
      const threadResponse = await axios.post(
        'https://api.openai.com/v1/threads',
        {}, // empty body as per the API docs
        { headers }
      );
      threadId = threadResponse.data.id;
      console.log(`Created new thread with ID: ${threadId}`);
      
      // If we have a WhatsApp number, store the new thread ID
      if (waNumber) {
        const updateData = { thread_id_chatbot: threadId };
        
        const { error } = await supabase
          .from('user_profiles')
          .upsert({ 
            wa_number: waNumber,
            ...updateData,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error updating thread_id_chatbot in user_profiles:', error);
        }
      }
    } else {
      // Ensure thread ID is properly formatted
      if (!threadId.startsWith('thread_')) {
        console.error(`Invalid thread ID format: ${threadId}. Creating new thread instead.`);
        const threadResponse = await axios.post(
          'https://api.openai.com/v1/threads',
          {}, // empty body as per the API docs
          { headers }
        );
        threadId = threadResponse.data.id;
        console.log(`Created new thread with ID: ${threadId}`);
        
        // If we have a WhatsApp number, store the new thread ID
        if (waNumber) {
          const updateData = { thread_id_chatbot: threadId };
          
          const { error } = await supabase
            .from('user_profiles')
            .upsert({ 
              wa_number: waNumber,
              ...updateData,
              updated_at: new Date().toISOString()
            });
          
          if (error) {
            console.error('Error updating thread_id_chatbot in user_profiles:', error);
          }
        }
      } else {
        // Verify the thread ID exists by attempting to retrieve it
        try {
          console.log(`Verifying thread with ID: ${threadId}`);
          await axios.get(
            `https://api.openai.com/v1/threads/${threadId}`,
            { headers }
          );
          console.log(`Using existing thread with ID: ${threadId}`);
        } catch (threadError) {
          console.error(`Thread ID ${threadId} not found. Creating new thread instead.`);
          const threadResponse = await axios.post(
            'https://api.openai.com/v1/threads',
            {}, // empty body as per the API docs
            { headers }
          );
          threadId = threadResponse.data.id;
          console.log(`Created new thread with ID: ${threadId}`);
          
          // If we have a WhatsApp number, store the new thread ID
          if (waNumber) {
            const updateData = { thread_id_chatbot: threadId };
            
            const { error } = await supabase
              .from('user_profiles')
              .upsert({ 
                wa_number: waNumber,
                ...updateData,
                updated_at: new Date().toISOString()
              });
            
            if (error) {
              console.error('Error updating thread_id_chatbot in user_profiles:', error);
            }
          }
        }
      }
    }
    
    // NEW CODE: Check if there's an existing run for this user
    if (waNumber) {
      try {
        // Get the user profile to check for existing run_id
        const userProfile = await getUserProfile(waNumber);
        
        if (userProfile && userProfile.run_id_chatbot) {
          const existingRunId = userProfile.run_id_chatbot;
          console.log(`Found existing run_id_chatbot: ${existingRunId} for user ${waNumber}`);
          
          try {
            // Poll the existing run until it's no longer in progress or times out
            console.log(`Polling existing run ${existingRunId} before creating a new one...`);
            const runStatus = await pollRunStatus(threadId, existingRunId, 30);
            
            console.log(`Existing run completed with status: ${runStatus.status}`);
            // Run is no longer active, we can proceed with creating a new run
          } catch (pollError) {
            console.error(`Error polling existing run: ${pollError.message}`);
            // Continue with creating a new run even if polling failed
          }
        }
      } catch (profileError) {
        console.error(`Error checking user profile for existing run: ${profileError.message}`);
        // Continue with creating a new run even if profile check failed
      }
    }
    
    // Add the message to the thread
    console.log(`Adding message to thread ${threadId}...`);
    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        role: 'user',
        content: message
      },
      { headers }
    );
    
    // Run the assistant on the thread
    console.log(`Creating run with chatbot assistant ${ASSISTANT_ID_CHATBOT}...`);
    const runResponse = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        assistant_id: ASSISTANT_ID_CHATBOT
      },
      { headers }
    );
    
    runId = runResponse.data.id;
    console.log(`Created run ${runId} on thread ${threadId}`);
    
    // NEW CODE: Store the run_id in the user_profiles table
    if (waNumber) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({ 
            wa_number: waNumber,
            run_id_chatbot: runId,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error updating run_id_chatbot in user_profiles:', error);
        } else {
          console.log(`Stored run_id_chatbot ${runId} for user ${waNumber}`);
        }
      } catch (updateError) {
        console.error(`Error storing run_id: ${updateError.message}`);
        // Continue even if storing the run_id failed
      }
    }
    
    // Wait for the run to complete using the utility function
    console.log('Waiting for run to complete...');
    try {
      const runStatusData = await pollRunStatus(threadId, runId, 30);
      
      if (runStatusData.status !== 'completed') {
        throw new Error(`Run ended with status: ${runStatusData.status}`);
      }
    } catch (pollError) {
      console.error(`Error polling run status: ${pollError.message}`);
      throw pollError; // Re-throw to be caught by the outer try-catch
    } finally {
      // NEW CODE: Clear the run_id from the database regardless of success/failure
      if (waNumber) {
        try {
          const { error } = await supabase
            .from('user_profiles')
            .update({ 
              run_id_chatbot: null,
              updated_at: new Date().toISOString()
            })
            .eq('wa_number', waNumber);
          
          if (error) {
            console.error('Error clearing run_id_chatbot in user_profiles:', error);
          } else {
            console.log(`Cleared run_id_chatbot for user ${waNumber}`);
          }
        } catch (clearError) {
          console.error(`Error clearing run_id: ${clearError.message}`);
          // Continue even if clearing the run_id failed
        }
      }
    }
    
    // Get the assistant's response
    console.log(`Retrieving messages from thread ${threadId}...`);
    const messagesResponse = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers }
    );
    
    // Find the latest assistant message
    const messages = messagesResponse.data.data;
    const assistantMessages = messages
      .filter(msg => msg.role === 'assistant')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (assistantMessages.length === 0) {
      throw new Error('No assistant response found');
    }
    
    // Get the content of the latest message
    const responseContent = assistantMessages[0].content[0].text.value;
    
    return {
      response: responseContent,
      threadId: threadId
    };
  } catch (error) {
    console.error('Error in sendToChatbot:', error.response ? error.response.data : error.message);
    
    // NEW CODE: Ensure run_id is cleared even if an error occurs
    if (waNumber && runId) {
      try {
        const { error: clearError } = await supabase
          .from('user_profiles')
          .update({ 
            run_id_chatbot: null,
            updated_at: new Date().toISOString()
          })
          .eq('wa_number', waNumber);
        
        if (clearError) {
          console.error('Error clearing run_id_chatbot after error:', clearError);
        }
      } catch (clearError) {
        console.error(`Error in error handler when clearing run_id: ${clearError.message}`);
      }
    }
    
    throw error;
  }
}

/**
 * Extract insights from a message using the insight extractor assistant
 * @param {string} message - Message to extract insights from
 * @param {string} threadId - Optional thread ID for continuing conversations
 * @param {string} waNumber - WhatsApp phone number (optional, used to store thread ID)
 * @returns {Object} - Extracted insights as JSON
 */
async function extractInsight(message, threadId = null, waNumber = null) {
  // Existing implementation...
  // This function would be refactored similarly to handle run_id_analytic
  // but is not part of the current task
}

module.exports = {
  sendToChatbot,
  extractInsight
};
