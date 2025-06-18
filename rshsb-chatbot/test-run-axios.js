/**
 * Test Runner for RSH Chatbot using Axios Integration
 * This file allows testing the chatbot functionality without WhatsApp
 * Uses direct axios calls to OpenAI API with proper headers
 */

require('dotenv').config();
const { sendToChatbot, extractInsight } = require('./openai-axios');
const { logChat, updateUserProfile, getUserProfile } = require('./supabase');
const readline = require('readline');

// Test phone number for simulating a user
const TEST_PHONE_NUMBER = '6281234567890';

// Initialize test variables
// Always start with null thread ID to force creation of a new thread
let testThreadId = null;
let lastMessage = null;

// Verify that the environment is set up correctly
console.log('Checking environment variables...');
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'ASSISTANT_ID_CHATBOT',
  'ASSISTANT_ID_INSIGHT',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== RSH Chatbot Test Mode ===');
console.log('Type a message to send to the chatbot, or use special commands:');
console.log('!thread [id] - Set a specific thread ID');
console.log('!new - Start a new conversation (create new thread)');
console.log('!exit - Exit the test mode');
console.log('!insight - Extract insights from the last message');

// Process user input
function promptUser() {
  rl.question('\nYou: ', async (input) => {
    if (input.trim() === '!exit') {
      console.log('Exiting test mode...');
      rl.close();
      return;
    }

    if (input.trim() === '!new') {
      console.log('Starting new conversation...');
      testThreadId = null;
      promptUser();
      return;
    }

    if (input.startsWith('!thread ')) {
      const newThreadId = input.substring('!thread '.length).trim();
      console.log(`Setting thread ID to: ${newThreadId}`);
      testThreadId = newThreadId;
      promptUser();
      return;
    }

    if (input.trim() === '!insight' && lastMessage) {
      console.log('Extracting insights from last message...');
      try {
        const insights = await extractInsight(lastMessage);
        console.log('Extracted insights:', JSON.stringify(insights, null, 2));
        
        // Update user profile with extracted insights
        try {
          await updateUserProfile(TEST_PHONE_NUMBER, insights);
          console.log('User profile updated with insights');
        } catch (updateError) {
          console.error('Error updating user profile:', updateError);
        }
      } catch (insightError) {
        console.error('Error extracting insights:', insightError);
      }
      
      promptUser();
      return;
    }

    // Process regular message
    lastMessage = input;
    
    try {
      console.log(`Sending message to chatbot with thread ID: ${testThreadId || 'null (new thread)'}`);
      const result = await sendToChatbot(input, testThreadId);
      
      // Update thread ID for next message
      testThreadId = result.threadId;
      
      // Log the chat message
      try {
        await logChat(TEST_PHONE_NUMBER, input, result.response, testThreadId);
        console.log('Chat logged to database');
      } catch (logError) {
        console.error('Error logging chat:', logError);
      }
      
      // Display the response
      console.log('\nAssistant:', result.response);
    } catch (error) {
      console.error('Error:', error);
      console.log('\nAssistant: Sorry, there was an error processing your message');
    }
    
    promptUser();
  });
}

// Start the prompt loop
promptUser();
