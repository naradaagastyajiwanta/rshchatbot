/**
 * Test script to verify the timestamp-based context extraction
 * This script simulates the flow of messages and tests if the correct bot message is included in context
 */

require('dotenv').config();
const { supabase, logChat, getLastBotMessageBefore } = require('./supabase');
const { prepareInsightPayload } = require('./openai');

// Test phone number
const TEST_WA_NUMBER = '6281234567890';

async function runTest() {
  try {
    console.log('Starting timestamp context test...');
    
    // Step 1: Clear any existing messages for this test number
    console.log(`Clearing existing messages for ${TEST_WA_NUMBER}...`);
    const { error: deleteError } = await supabase
      .from('chat_logs')
      .delete()
      .eq('wa_number', TEST_WA_NUMBER);
    
    if (deleteError) {
      console.error('Error clearing messages:', deleteError);
      return;
    }
    
    // Step 2: Insert test messages with controlled timestamps
    console.log('Inserting test messages with controlled timestamps...');
    
    // First bot message (should be included in context)
    const firstBotTimestamp = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
    await logChat(TEST_WA_NUMBER, 'Hello! How can I help you today?', 'outgoing', 'test_thread_1');
    console.log(`Logged first bot message at ${firstBotTimestamp}`);
    
    // User message
    const userTimestamp = new Date(Date.now() - 30000).toISOString(); // 30 seconds ago
    await logChat(TEST_WA_NUMBER, 'I have diabetes and insomnia', 'incoming', 'test_thread_1');
    console.log(`Logged user message at ${userTimestamp}`);
    
    // Second bot message (should NOT be included in context)
    const secondBotTimestamp = new Date().toISOString(); // now
    await logChat(TEST_WA_NUMBER, 'I understand your concerns about diabetes and insomnia. Let me help you with that.', 'outgoing', 'test_thread_1');
    console.log(`Logged second bot message at ${secondBotTimestamp}`);
    
    // Step 3: Test getLastBotMessageBefore with the user timestamp
    console.log('\nTesting getLastBotMessageBefore with user timestamp...');
    const botMessageBefore = await getLastBotMessageBefore(TEST_WA_NUMBER, userTimestamp);
    console.log('Bot message before user timestamp:', botMessageBefore);
    
    // Step 4: Test prepareInsightPayload with the user timestamp
    console.log('\nTesting prepareInsightPayload with user timestamp...');
    const insightPayload = await prepareInsightPayload(TEST_WA_NUMBER, 'I have diabetes and insomnia', userTimestamp);
    console.log('Insight payload:', insightPayload);
    
    // Step 5: Test without timestamp (should get the most recent bot message)
    console.log('\nTesting getLastBotMessageBefore without timestamp (should get most recent)...');
    const latestBotMessage = await getLastBotMessageBefore(TEST_WA_NUMBER, new Date().toISOString());
    console.log('Latest bot message:', latestBotMessage);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runTest().catch(console.error);
