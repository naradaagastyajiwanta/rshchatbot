/**
 * OpenAI Assistant API Integration using Axios
 * This module handles all interactions with OpenAI's Assistant API directly using Axios
 * to ensure proper header inclusion and reliable thread ID handling
 */

require('dotenv').config();
const axios = require('axios');

// API Key dari environment variable
const apiKey = process.env.OPENAI_API_KEY;
const ASSISTANT_ID_CHATBOT = process.env.ASSISTANT_ID_CHATBOT;
const ASSISTANT_ID_INSIGHT = process.env.ASSISTANT_ID_INSIGHT;

// Headers untuk semua request
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
  'OpenAI-Beta': 'assistants=v2'
};

console.log('OpenAI client initialized with axios and assistants=v2 beta header');

/**
 * Send a message to the chatbot assistant
 * @param {string} message - Message to send to the chatbot
 * @param {string} threadId - Thread ID for continuing conversations (optional)
 * @returns {Object} - Response from the chatbot and thread ID
 */
async function sendToChatbot(message, threadId = null) {
  let createdThread = null;
  let runId = null;
  
  try {
    console.log(`DEBUG - Thread ID received: ${threadId}, Type: ${typeof threadId}`);
    
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
        }
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
    
    // Wait for the run to complete
    console.log('Waiting for run to complete...');
    let runStatusResponse = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers }
    );
    let runStatus = runStatusResponse.data.status;
    
    // Poll for completion with timeout
    let attempts = 0;
    const maxAttempts = 30; // Maximum 30 seconds wait
    
    while (['queued', 'in_progress'].includes(runStatus) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatusResponse = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers }
      );
      runStatus = runStatusResponse.data.status;
      console.log('Run status:', runStatus);
      attempts++;
    }
    
    if (runStatus !== 'completed') {
      throw new Error(`Run ended with status: ${runStatus}`);
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
 * @returns {Object} - Extracted insights as JSON
 */
async function extractInsight(message, threadId = null) {
  try {
    // Always create a new thread for insight extraction to ensure clean context
    console.log('Creating new thread for insight extraction...');
    const threadResponse = await axios.post(
      'https://api.openai.com/v1/threads',
      {}, // empty body as per the API docs
      { headers }
    );
    
    threadId = threadResponse.data.id;
    console.log(`Created new thread with ID: ${threadId}`);
    
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
    
    // Run the insight extractor assistant
    console.log(`Creating run with insight extractor assistant ${ASSISTANT_ID_INSIGHT}...`);
    const runResponse = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        assistant_id: ASSISTANT_ID_INSIGHT
      },
      { headers }
    );
    
    const runId = runResponse.data.id;
    console.log(`Created run ${runId} on thread ${threadId}`);
    
    // Wait for the run to complete
    console.log('Waiting for insight extraction to complete...');
    let runStatusResponse = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers }
    );
    let runStatus = runStatusResponse.data.status;
    
    // Poll for completion with timeout
    let attempts = 0;
    const maxAttempts = 30; // Maximum 30 seconds wait
    
    while (['queued', 'in_progress'].includes(runStatus) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatusResponse = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers }
      );
      runStatus = runStatusResponse.data.status;
      console.log('Insight extraction status:', runStatus);
      attempts++;
    }
    
    if (runStatus !== 'completed') {
      throw new Error(`Insight extraction ended with status: ${runStatus}`);
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
      return {
        name: insights.name || null,
        gender: insights.gender || null,
        domisili: insights.domisili || null,
        keluhan: insights.keluhan || null,
        barrier: insights.barrier || null,
        lead_status: insights.lead_status || null
      };
    } catch (parseError) {
      console.error('Error parsing insight JSON:', parseError);
      // Return empty insights if parsing fails
      return {
        name: null,
        gender: null,
        domisili: null,
        keluhan: null,
        barrier: null,
        lead_status: null
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
      error: error.message
    };
  }
}

module.exports = {
  sendToChatbot,
  extractInsight
};
