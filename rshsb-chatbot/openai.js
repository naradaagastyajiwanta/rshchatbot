/**
 * OpenAI Assistant API Integration using Axios
 * This module handles all interactions with OpenAI's Assistant API directly using Axios
 * to ensure proper header inclusion and reliable thread ID handling
 */

require('dotenv').config();
const axios = require('axios');
const { pollRunStatus } = require('./openai-utils');
const { supabase, getUserProfile, getOrCreateChatbotThreadId, getOrCreateAnalyticThreadId } = require('./supabase');

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

console.log('OpenAI client initialized with axios and assistants=v2 beta header');

/**
 * Send a message to the chatbot assistant
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
      
      // IMPROVED CODE: Check for any active runs on this thread, regardless of which user started it
      try {
        // First check if there's an existing run_id in the user's profile
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
        } else {
          // Even if there's no run_id in the user profile, check for active runs on the thread
          // This handles the case where another process started a run but hasn't updated the DB yet
          try {
            console.log(`Checking for any active runs on thread ${threadId}...`);
            const runsResponse = await axios.get(
              `https://api.openai.com/v1/threads/${threadId}/runs`,
              { headers }
            );
            
            const activeRuns = runsResponse.data.data.filter(run => 
              ['queued', 'in_progress'].includes(run.status)
            );
            
            if (activeRuns.length > 0) {
              console.log(`Found ${activeRuns.length} active runs on thread ${threadId}`);
              const latestRun = activeRuns[0]; // Get the most recent active run
              
              // Store this run ID in the user profile so other processes know about it
              try {
                const { error } = await supabase
                  .from('user_profiles')
                  .upsert({ 
                    wa_number: waNumber,
                    run_id_chatbot: latestRun.id,
                    updated_at: new Date().toISOString()
                  });
                
                if (!error) {
                  console.log(`Updated user profile with active run ID: ${latestRun.id}`);
                }
              } catch (updateError) {
                console.error(`Error updating run_id in profile: ${updateError.message}`);
              }
              
              // Poll this run until it completes
              console.log(`Polling active run ${latestRun.id} before creating a new one...`);
              await pollRunStatus(threadId, latestRun.id, 30);
              console.log(`Active run completed, can proceed with new message`);
            } else {
              console.log(`No active runs found on thread ${threadId}`);
            }
          } catch (runsError) {
            console.error(`Error checking active runs: ${runsError.message}`);
            // Continue even if checking for active runs failed
          }
        }
      } catch (profileError) {
        console.error(`Error checking user profile for existing run: ${profileError.message}`);
        // Continue with creating a new run even if profile check failed
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
        const supabase = require('./supabase');
        const updateData = { thread_id_chatbot: threadId };
        
        const { error } = await supabase.supabase
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
          const supabase = require('./supabase');
          const updateData = { thread_id_chatbot: threadId };
          
          const { error } = await supabase.supabase
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
            const supabase = require('./supabase');
            const updateData = { thread_id_chatbot: threadId };
            
            const { error } = await supabase.supabase
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
    
    // Add the message to the thread - with retry logic in case there's an active run
    let messageAdded = false;
    let retryAttempts = 0;
    const maxRetries = 5;
    
    while (!messageAdded && retryAttempts < maxRetries) {
      try {
        console.log(`Adding message to thread ${threadId}... (attempt ${retryAttempts + 1})`);
        await axios.post(
          `https://api.openai.com/v1/threads/${threadId}/messages`,
          {
            role: 'user',
            content: message
          },
          { headers }
        );
        messageAdded = true;
        console.log('Message added successfully');
      } catch (messageError) {
        if (messageError.response && 
            messageError.response.data && 
            messageError.response.data.error && 
            messageError.response.data.error.message && 
            messageError.response.data.error.message.includes('while a run')) {
          
          console.log(`Active run detected when adding message, waiting before retry...`);
          
          // Extract the run ID from the error message if possible
          const runIdMatch = messageError.response.data.error.message.match(/run_(\w+)/);
          if (runIdMatch && runIdMatch[0]) {
            const activeRunId = runIdMatch[0];
            console.log(`Detected active run ID from error: ${activeRunId}`);
            
            // Wait for this run to complete
            try {
              await pollRunStatus(threadId, activeRunId, 10); // Wait up to 10 seconds
              console.log(`Finished waiting for active run ${activeRunId}`);
            } catch (pollError) {
              console.error(`Error polling active run: ${pollError.message}`);
            }
          } else {
            // If we can't extract the run ID, just wait a few seconds
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          retryAttempts++;
        } else {
          // If it's a different error, throw it
          throw messageError;
        }
      }
    }
    
    if (!messageAdded) {
      throw new Error(`Failed to add message after ${maxRetries} attempts due to active runs`);
    }
    
    // Run the assistant on the thread - with retry logic
    let runCreated = false;
    retryAttempts = 0;
    
    while (!runCreated && retryAttempts < maxRetries) {
      try {
        console.log(`Creating run with chatbot assistant ${ASSISTANT_ID_CHATBOT}... (attempt ${retryAttempts + 1})`);
        const runResponse = await axios.post(
          `https://api.openai.com/v1/threads/${threadId}/runs`,
          {
            assistant_id: ASSISTANT_ID_CHATBOT
          },
          { headers }
        );
        
        runId = runResponse.data.id;
        runCreated = true;
        console.log(`Created run ${runId} on thread ${threadId}`);
      } catch (runError) {
        if (runError.response && 
            runError.response.data && 
            runError.response.data.error && 
            runError.response.data.error.message && 
            runError.response.data.error.message.includes('already has an active run')) {
          
          console.log(`Thread already has an active run, waiting before retry...`);
          
          // Extract the run ID from the error message if possible
          const runIdMatch = runError.response.data.error.message.match(/run_(\w+)/);
          if (runIdMatch && runIdMatch[0]) {
            const activeRunId = runIdMatch[0];
            console.log(`Detected active run ID from error: ${activeRunId}`);
            
            // Wait for this run to complete
            try {
              await pollRunStatus(threadId, activeRunId, 10); // Wait up to 10 seconds
              console.log(`Finished waiting for active run ${activeRunId}`);
            } catch (pollError) {
              console.error(`Error polling active run: ${pollError.message}`);
            }
          } else {
            // If we can't extract the run ID, just wait a few seconds
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          retryAttempts++;
        } else {
          // If it's a different error, throw it
          throw runError;
        }
      }
    }
    
    if (!runCreated) {
      throw new Error(`Failed to create run after ${maxRetries} attempts due to active runs`);
    }
    
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
    
    // If there was an error, create a new thread for the next attempt
    return {
      response: 'Sorry, there was an error processing your message. Please try again.',
      threadId: null, // Reset thread ID to force creation of a new thread on next attempt
      error: error.message
    };
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
  const { getOrCreateAnalyticThreadId } = require('./supabase');
  
  try {
    // If we have a WhatsApp number, try to get or create a thread ID from user_profiles
    if (waNumber) {
      const profileThreadId = await getOrCreateAnalyticThreadId(waNumber);
      if (profileThreadId) {
        threadId = profileThreadId;
        console.log(`Using analytic thread ID from user_profiles: ${threadId}`);
      }
    }
    
    // If no thread ID from user_profiles, create a new one
    if (!threadId || !threadId.startsWith('thread_')) {
      console.log('Creating new thread for insight extraction...');
      const threadResponse = await axios.post(
        'https://api.openai.com/v1/threads',
        {}, // empty body as per the API docs
        { headers }
      );
      
      threadId = threadResponse.data.id;
      console.log(`Created new thread with ID: ${threadId}`);
      
      // If we have a WhatsApp number, store the new thread ID
      if (waNumber) {
        const supabase = require('./supabase');
        const updateData = { thread_id_analytic: threadId };
        
        const { error } = await supabase.supabase
          .from('user_profiles')
          .upsert({ 
            wa_number: waNumber,
            ...updateData,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error updating thread_id_analytic in user_profiles:', error);
        }
      }
    }
    
    // Check for existing runs on this thread
    if (waNumber) {
      try {
        // First check if there's an existing run_id in the user's profile
        const userProfile = await getUserProfile(waNumber);
        
        if (userProfile && userProfile.run_id_analytic) {
          const existingRunId = userProfile.run_id_analytic;
          console.log(`Found existing run_id_analytic: ${existingRunId} for user ${waNumber}`);
          
          try {
            // Poll the existing run until it's no longer in progress or times out
            console.log(`Polling existing analytic run ${existingRunId} before creating a new one...`);
            const runStatus = await pollRunStatus(threadId, existingRunId, 30);
            
            console.log(`Existing analytic run completed with status: ${runStatus.status}`);
            // Run is no longer active, we can proceed with creating a new run
          } catch (pollError) {
            console.error(`Error polling existing analytic run: ${pollError.message}`);
            // Continue with creating a new run even if polling failed
          }
        } else {
          // Even if there's no run_id in the user profile, check for active runs on the thread
          try {
            console.log(`Checking for any active runs on analytic thread ${threadId}...`);
            const runsResponse = await axios.get(
              `https://api.openai.com/v1/threads/${threadId}/runs`,
              { headers }
            );
            
            const activeRuns = runsResponse.data.data.filter(run => 
              ['queued', 'in_progress'].includes(run.status)
            );
            
            if (activeRuns.length > 0) {
              console.log(`Found ${activeRuns.length} active runs on analytic thread ${threadId}`);
              const latestRun = activeRuns[0]; // Get the most recent active run
              
              // Store this run ID in the user profile so other processes know about it
              try {
                const { error } = await supabase
                  .from('user_profiles')
                  .upsert({ 
                    wa_number: waNumber,
                    run_id_analytic: latestRun.id,
                    updated_at: new Date().toISOString()
                  });
                
                if (!error) {
                  console.log(`Updated user profile with active analytic run ID: ${latestRun.id}`);
                }
              } catch (updateError) {
                console.error(`Error updating run_id_analytic in profile: ${updateError.message}`);
              }
              
              // Poll this run until it completes
              console.log(`Polling active analytic run ${latestRun.id} before creating a new one...`);
              await pollRunStatus(threadId, latestRun.id, 30);
              console.log(`Active analytic run completed, can proceed with new message`);
            } else {
              console.log(`No active runs found on analytic thread ${threadId}`);
            }
          } catch (runsError) {
            console.error(`Error checking active analytic runs: ${runsError.message}`);
            // Continue even if checking for active runs failed
          }
        }
      } catch (profileError) {
        console.error(`Error checking user profile for existing analytic run: ${profileError.message}`);
      }
    }

    // Verify the thread exists
    try {
      await axios.get(`https://api.openai.com/v1/threads/${threadId}`, { headers });
    } catch (error) {
      console.error(`Thread ${threadId} not found:`, error.message);
      return null;
    }

    // Add the message to the thread - with retry logic
    let messageAdded = false;
    let retryAttempts = 0;
    const maxRetries = 5;
    
    while (!messageAdded && retryAttempts < maxRetries) {
      try {
        console.log(`Adding message to analytic thread ${threadId}... (attempt ${retryAttempts + 1})`);
        await axios.post(
          `https://api.openai.com/v1/threads/${threadId}/messages`,
          {
            role: 'user',
            content: message
          },
          { headers }
        );
        messageAdded = true;
        console.log('Analytic message added successfully');
      } catch (messageError) {
        if (messageError.response && 
            messageError.response.data && 
            messageError.response.data.error && 
            messageError.response.data.error.message && 
            messageError.response.data.error.message.includes('while a run')) {
          
          console.log(`Active run detected when adding analytic message, waiting before retry...`);
          
          // Extract the run ID from the error message if possible
          const runIdMatch = messageError.response.data.error.message.match(/run_(\w+)/);
          if (runIdMatch && runIdMatch[0]) {
            const activeRunId = runIdMatch[0];
            console.log(`Detected active analytic run ID from error: ${activeRunId}`);
            
            // Wait for this run to complete
            try {
              await pollRunStatus(threadId, activeRunId, 10); // Wait up to 10 seconds
              console.log(`Finished waiting for active analytic run ${activeRunId}`);
            } catch (pollError) {
              console.error(`Error polling active analytic run: ${pollError.message}`);
            }
          } else {
            // If we can't extract the run ID, just wait a few seconds
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          retryAttempts++;
        } else {
          // If it's a different error, throw it
          throw messageError;
        }
      }
    }
    
    if (!messageAdded) {
      throw new Error(`Failed to add analytic message after ${maxRetries} attempts due to active runs`);
    }

    // Run the assistant on the thread - with retry logic
    let runCreated = false;
    retryAttempts = 0;
    let runId = null;
    
    while (!runCreated && retryAttempts < maxRetries) {
      try {
        console.log(`Creating run with insight extractor assistant ${ASSISTANT_ID_INSIGHT}... (attempt ${retryAttempts + 1})`);
        const runResponse = await axios.post(
          `https://api.openai.com/v1/threads/${threadId}/runs`,
          {
            assistant_id: ASSISTANT_ID_INSIGHT
          },
          { headers }
        );
        
        runId = runResponse.data.id;
        runCreated = true;
        console.log(`Created analytic run ${runId} on thread ${threadId}`);
      } catch (runError) {
        if (runError.response && 
            runError.response.data && 
            runError.response.data.error && 
            runError.response.data.error.message && 
            runError.response.data.error.message.includes('already has an active run')) {
          
          console.log(`Thread already has an active analytic run, waiting before retry...`);
          
          // Extract the run ID from the error message if possible
          const runIdMatch = runError.response.data.error.message.match(/run_(\w+)/);
          if (runIdMatch && runIdMatch[0]) {
            const activeRunId = runIdMatch[0];
            console.log(`Detected active analytic run ID from error: ${activeRunId}`);
            
            // Wait for this run to complete
            try {
              await pollRunStatus(threadId, activeRunId, 10); // Wait up to 10 seconds
              console.log(`Finished waiting for active analytic run ${activeRunId}`);
            } catch (pollError) {
              console.error(`Error polling active analytic run: ${pollError.message}`);
            }
          } else {
            // If we can't extract the run ID, just wait a few seconds
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          retryAttempts++;
        } else {
          // If it's a different error, throw it
          throw runError;
        }
      }
    }
    
    if (!runCreated) {
      throw new Error(`Failed to create analytic run after ${maxRetries} attempts due to active runs`);
    }
    
    // Store the run_id in the user_profiles table
    if (waNumber && runId) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({ 
            wa_number: waNumber,
            run_id_analytic: runId,
            updated_at: new Date().toISOString()
          });
        
        if (!error) {
          console.log(`Stored run_id_analytic ${runId} for user ${waNumber}`);
        } else {
          console.error(`Error storing run_id_analytic in user profile:`, error);
        }
      } catch (dbError) {
        console.error(`Database error storing run_id_analytic:`, dbError);
      }
    }

    console.log(`Waiting for insight extraction to complete...`);

    // Poll for completion
    const runStatus = await pollRunStatus(threadId, runId, 30);
    console.log(`Insight extraction status: ${runStatus.status}`);

    if (runStatus.status !== 'completed') {
      throw new Error(`Insight extraction ended with status: ${runStatus.status}`);
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
      throw new Error('No insight extraction response found');
    }
    
    // Get the content of the latest message and parse as JSON
    const responseContent = assistantMessages[0].content[0].text.value;
    console.log('Received insight response:', responseContent);
    
    try {
      // Try to parse the response as JSON
      const insights = JSON.parse(responseContent);
      
      // Create a base object with our required fields
      const baseInsights = {
        name: insights.name || null,
        gender: insights.gender || null,
        domisili: insights.location || null,
        keluhan: Array.isArray(insights.health_complaints) ? insights.health_complaints.join(', ') : null,
        barrier: Array.isArray(insights.conversion_barriers) ? insights.conversion_barriers.join(', ') : null,
        lead_status: insights.interest_level || null
      };
      
      // Add all other fields from the OpenAI response
      const additionalFields = {
        age: insights.age || null,
        symptoms: Array.isArray(insights.symptoms) ? insights.symptoms.join(', ') : null,
        medical_history: insights.medical_history || null,
        urgency_level: insights.urgency_level || null,
        emotion: insights.emotion || null,
        program_awareness: insights.program_awareness || null
      };
      
      // Combine base insights with additional fields
      return { ...baseInsights, ...additionalFields };
    } catch (parseError) {
      console.error('Error parsing insight JSON:', parseError);
      // Return empty insights if parsing fails
      return {
        name: null,
        gender: null,
        domisili: null,
        keluhan: null,
        barrier: null,
        lead_status: null,
        age: null,
        symptoms: null,
        medical_history: null,
        urgency_level: null,
        emotion: null,
        program_awareness: null
      };
    }
  } catch (error) {
    console.error('Error in extractInsight:', error.response ? error.response.data : error.message);
    return {
      name: null,
      gender: null,
      domisili: null,
      keluhan: null,
      barrier: null,
      lead_status: null,
      age: null,
      symptoms: null,
      medical_history: null,
      urgency_level: null,
      emotion: null,
      program_awareness: null,
      error: error.message
    };
  }
}

module.exports = {
  sendToChatbot,
  extractInsight
};
