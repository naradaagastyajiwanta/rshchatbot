/**
 * Environment Variable Verification Script
 * This script verifies that all required environment variables are set correctly
 */

require('dotenv').config();
const OpenAI = require('openai');

// Check if required environment variables are set
console.log('\n=== Environment Variables Check ===\n');

// Supabase variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓ Set' : '❌ Missing');
console.log('Supabase Key:', supabaseKey ? '✓ Set' : '❌ Missing');

// OpenAI variables
const openaiApiKey = process.env.OPENAI_API_KEY;
const assistantIdChatbot = process.env.ASSISTANT_ID_CHATBOT;
const assistantIdInsight = process.env.ASSISTANT_ID_INSIGHT;

console.log('OpenAI API Key:', openaiApiKey ? '✓ Set' : '❌ Missing');
console.log('Chatbot Assistant ID:', assistantIdChatbot ? '✓ Set' : '❌ Missing');
console.log('Insight Assistant ID:', assistantIdInsight ? '✓ Set' : '❌ Missing');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Verify OpenAI API key and assistants
async function verifyOpenAI() {
  console.log('\n=== OpenAI API Verification ===\n');
  
  try {
    // Test API key by listing models
    console.log('Testing OpenAI API key...');
    const models = await openai.models.list();
    console.log('✓ OpenAI API key is valid');
    
    // Test chatbot assistant ID
    if (assistantIdChatbot) {
      try {
        console.log(`Testing chatbot assistant ID: ${assistantIdChatbot}...`);
        const chatbotAssistant = await openai.beta.assistants.retrieve(assistantIdChatbot);
        console.log(`✓ Chatbot assistant found: ${chatbotAssistant.name}`);
      } catch (error) {
        console.error(`❌ Invalid chatbot assistant ID: ${error.message}`);
      }
    }
    
    // Test insight assistant ID
    if (assistantIdInsight) {
      try {
        console.log(`Testing insight assistant ID: ${assistantIdInsight}...`);
        const insightAssistant = await openai.beta.assistants.retrieve(assistantIdInsight);
        console.log(`✓ Insight assistant found: ${insightAssistant.name}`);
      } catch (error) {
        console.error(`❌ Invalid insight assistant ID: ${error.message}`);
      }
    }
    
    // Create a test thread
    console.log('\nTesting thread creation...');
    const thread = await openai.beta.threads.create();
    console.log(`✓ Thread created with ID: ${thread.id}`);
    
    // Test message creation
    console.log('Testing message creation...');
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: 'This is a test message',
    });
    console.log('✓ Message created successfully');
    
  } catch (error) {
    console.error('❌ OpenAI API verification failed:', error.message);
  }
}

// Run verification
verifyOpenAI().catch(console.error);
