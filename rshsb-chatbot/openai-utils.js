/**
 * OpenAI Assistant API Utilities
 * Helper functions for working with OpenAI Assistant API
 */

const axios = require('axios');

// Headers for OpenAI API requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  'OpenAI-Beta': 'assistants=v2'
};

/**
 * Poll an OpenAI run until it completes or times out
 * @param {string} threadId - Thread ID
 * @param {string} runId - Run ID to poll
 * @param {number} timeoutSeconds - Maximum time to wait in seconds (default: 30)
 * @returns {Object} - Final run status response
 * @throws {Error} - If polling times out or run fails
 */
async function pollRunStatus(threadId, runId, timeoutSeconds = 30) {
  if (!threadId || !runId) {
    throw new Error('Thread ID and Run ID are required for polling');
  }

  console.log(`Polling run ${runId} on thread ${threadId}...`);
  
  // Initial status check
  let runStatusResponse = await axios.get(
    `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
    { headers }
  );
  
  let runStatus = runStatusResponse.data.status;
  console.log(`Initial run status: ${runStatus}`);
  
  // Poll for completion with timeout
  let attempts = 0;
  const maxAttempts = timeoutSeconds; // 1 second per attempt
  
  while (['queued', 'in_progress'].includes(runStatus) && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    try {
      runStatusResponse = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers }
      );
      
      runStatus = runStatusResponse.data.status;
      console.log(`Run status (attempt ${attempts + 1}/${maxAttempts}): ${runStatus}`);
      
      // If the run is no longer in progress, break out of the loop
      if (!['queued', 'in_progress'].includes(runStatus)) {
        break;
      }
    } catch (error) {
      console.error('Error polling run status:', error.response ? error.response.data : error.message);
      // Continue polling despite errors, as they might be transient
    }
    
    attempts++;
  }
  
  // Check if we timed out
  if (['queued', 'in_progress'].includes(runStatus)) {
    throw new Error(`Run polling timed out after ${timeoutSeconds} seconds. Last status: ${runStatus}`);
  }
  
  return runStatusResponse.data;
}

module.exports = {
  headers,
  pollRunStatus
};
