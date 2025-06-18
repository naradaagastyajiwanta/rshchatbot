/**
 * Test Runner for RSH Chatbot
 * This file allows testing the chatbot functionality without WhatsApp
 */

require('dotenv').config();
const { sendToChatbot, extractInsight } = require('./openai');
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
const openaiApiKey = process.env.OPENAI_API_KEY;
const assistantIdChatbot = process.env.ASSISTANT_ID_CHATBOT;
const assistantIdInsight = process.env.ASSISTANT_ID_INSIGHT;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Check if required environment variables are set
if (!openaiApiKey) {
  console.error('Error: OpenAI API key not found in environment variables');
  console.error('Please make sure your .env file is set up correctly');
  process.exit(1);
}

if (!assistantIdChatbot || !assistantIdInsight) {
  console.error('Error: Assistant IDs not found in environment variables');
  console.error('Please make sure your .env file is set up correctly');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key not found in environment variables');
  console.error('Please make sure your .env file is set up correctly');
  process.exit(1);
}

// Create readline interface for command line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Test the chatbot functionality
 */
async function testChatbot() {
  // Print welcome message and instructions
  console.log('\n=== RSH Chatbot Test Mode ===');
  console.log('Type a message to send to the chatbot, or use special commands:');
  console.log('!extract - Test insight extraction on the last message');
  console.log('!profile - View current user profile');
  console.log('!thread - Show current thread ID');
  console.log('!newthread - Create a new thread');
  console.log('!thread <id> - Set thread ID manually');
  console.log('!exit - Exit the test');
  console.log('===============================\n');

  // Start the conversation loop
  askForInput();

  /**
   * Ask the user for input and process it
   */
  function askForInput() {
    rl.question('You: ', async (input) => {
      // Handle special commands
      if (input.startsWith('!')) {
        await handleCommand(input);
        return;
      }

      // Save the message for potential extraction
      lastMessage = input;

      try {
        // Log the incoming message
        console.log('Logging incoming message...');
        const logResult = await logChat(TEST_PHONE_NUMBER, input, 'incoming', testThreadId);
        if (!logResult.success) {
          console.warn(`Warning: Failed to log incoming message: ${logResult.error?.message || 'Unknown error'}`);
          console.warn('Continuing with chatbot anyway...');
        }
        
        // Send to OpenAI Assistant
        if (testThreadId && testThreadId.startsWith('thread_')) {
          console.log(`Sending to Assistant with thread ID: ${testThreadId}...`);
        } else {
          console.log('Sending to Assistant with new thread...');
          // Force null to create a new thread if the current one isn't valid
          testThreadId = null;
        }
        
        const response = await sendToChatbot(input, testThreadId);
        
        // Check for errors in the response
        if (response.error) {
          console.error('Error from OpenAI:', response.error);
          console.log(`\nAssistant: Sorry, there was an error processing your message.\n`);
        } else {
          // Update thread ID for future messages
          if (response.threadId) {
            if (testThreadId !== response.threadId) {
              console.log(`Thread ID updated: ${response.threadId}`);
            } else {
              console.log(`Using existing thread ID: ${response.threadId}`);
            }
            testThreadId = response.threadId;
          } else {
            console.warn('Warning: No thread ID returned from OpenAI');
          }
          
          // Display the response
          console.log(`\nAssistant: ${response.response}\n`);
          
          // Log the outgoing message
          console.log('Logging outgoing message...');
          const outLogResult = await logChat(TEST_PHONE_NUMBER, response.response, 'outgoing', testThreadId);
          if (!outLogResult.success) {
            console.warn(`Warning: Failed to log outgoing message: ${outLogResult.error?.message || 'Unknown error'}`);
          } else {
            console.log('Message logged successfully');
          }
        }
      } catch (error) {
        console.error('Error in chatbot interaction:', error.message);
        console.error(error.stack);
        console.log('\nAssistant: Sorry, there was an error processing your request.\n');
      }
      
      // Ask for next input
      askForInput();
    });
  }

  /**
   * Handle special commands
   * @param {string} command - The command to handle
   */
  async function handleCommand(command) {
    try {
      if (command === '!exit') {
        console.log('Exiting test mode...');
        rl.close();
        return;
      } 
      
      if (command === '!extract') {
        if (!lastMessage) {
          console.log('No message to extract insights from. Send a message first.');
          askForInput();
          return;
        }
        
        console.log(`Extracting insights from: "${lastMessage}"...`);
        
        // For insight extraction, always create a new thread
        // This ensures clean context for each extraction
        const insights = await extractInsight(lastMessage, null);
        console.log('Extracted insights:', JSON.stringify(insights, null, 2));
        
        // Update user profile with extracted insights
        console.log('Updating user profile...');
        const updateResult = await updateUserProfile(TEST_PHONE_NUMBER, insights);
        if (updateResult.success) {
          console.log('User profile updated successfully');
        } else {
          console.warn(`Warning: Failed to update user profile: ${updateResult.error?.message || 'Unknown error'}`);
        }
        
        // Show updated profile
        const profile = await getUserProfile(TEST_PHONE_NUMBER);
        console.log('Current profile:', JSON.stringify(profile, null, 2));
        askForInput();
        return;
      }
      
      if (command === '!profile') {
        console.log('Getting user profile...');
        const profile = await getUserProfile(TEST_PHONE_NUMBER);
        console.log('User profile:', JSON.stringify(profile, null, 2));
        askForInput();
        return;
      }
      
      if (command === '!thread') {
        console.log('Current thread ID:', testThreadId || 'No active thread');
        askForInput();
        return;
      }
      
      if (command === '!newthread') {
        console.log('Creating new thread...');
        testThreadId = null; // This will force a new thread on next message
        console.log('Thread reset. Next message will create a new thread.');
        askForInput();
        return;
      }
      
      if (command.startsWith('!thread ')) {
        // Set thread ID manually for testing
        const newThreadId = command.substring(8).trim();
        if (newThreadId) {
          console.log(`Setting thread ID to: ${newThreadId}`);
          testThreadId = newThreadId;
        } else {
          console.log('Invalid thread ID format');
        }
        askForInput();
        return;
      }
      
      console.log('Unknown command. Available commands: !extract, !profile, !thread, !newthread, !exit');
      askForInput();
    } catch (error) {
      console.error('Error handling command:', error.message);
      askForInput();
    }
  }
}

// Start the test
testChatbot().catch(err => {
  console.error('Unexpected error in test:', err);
  rl.close();
  process.exit(1);
});
