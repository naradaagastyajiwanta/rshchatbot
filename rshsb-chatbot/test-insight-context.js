/**
 * Test script for verifying the enhanced Insight Assistant context functionality
 * This script tests the prepareInsightPayload function and context combination
 */

require('dotenv').config();
const { prepareInsightPayload } = require('./openai.js');
const { supabase, logChat } = require('./supabase.js');

// Test WhatsApp number
const TEST_WA_NUMBER = '6287811152506';

// Test messages
const TEST_USER_MESSAGE = 'Saya ingin konsultasi tentang program detox';
const TEST_BOT_MESSAGE = 'Selamat datang di RSH Sejahtera Bersama. Ada yang bisa kami bantu?';

/**
 * Main test function
 */
async function runTests() {
  try {
    console.log('=== TESTING INSIGHT CONTEXT ENHANCEMENT ===');
    
    // Step 1: Clean up any existing test data
    console.log('\n1. Cleaning up test data...');
    await cleanupTestData();
    
    // Step 2: Create a mock conversation (bot message followed by user message)
    console.log('\n2. Creating mock conversation...');
    await createMockConversation();
    
    // Step 3: Test prepareInsightPayload with existing bot message
    console.log('\n3. Testing prepareInsightPayload with existing bot message...');
    const payloadWithContext = await prepareInsightPayload(TEST_WA_NUMBER, TEST_USER_MESSAGE);
    console.log('Generated payload:');
    console.log(payloadWithContext);
    
    // Step 4: Verify the payload format
    console.log('\n4. Verifying payload format...');
    const expectedFormat = `[Chatbot]: ${TEST_BOT_MESSAGE}\n[User]: ${TEST_USER_MESSAGE}`;
    const isFormatCorrect = payloadWithContext === expectedFormat;
    console.log(`Format correct: ${isFormatCorrect ? '✓ YES' : '✗ NO'}`);
    
    // Step 5: Test fallback behavior (no previous bot message)
    console.log('\n5. Testing fallback behavior (no previous bot message)...');
    await cleanupTestData();
    const payloadWithoutContext = await prepareInsightPayload(TEST_WA_NUMBER, TEST_USER_MESSAGE);
    console.log('Generated payload (fallback):');
    console.log(payloadWithoutContext);
    
    // Step 6: Verify fallback format
    console.log('\n6. Verifying fallback format...');
    const expectedFallbackFormat = `[User]: ${TEST_USER_MESSAGE}`;
    const isFallbackFormatCorrect = payloadWithoutContext === expectedFallbackFormat;
    console.log(`Fallback format correct: ${isFallbackFormatCorrect ? '✓ YES' : '✗ NO'}`);
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    if (isFormatCorrect && isFallbackFormatCorrect) {
      console.log('✅ All tests PASSED! The implementation is working correctly.');
    } else {
      console.log('❌ Some tests FAILED. Please check the implementation.');
      if (!isFormatCorrect) console.log('- Context combination is not working correctly');
      if (!isFallbackFormatCorrect) console.log('- Fallback behavior is not working correctly');
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Clean up test data
    await cleanupTestData();
    process.exit(0);
  }
}

/**
 * Create a mock conversation with a bot message
 */
async function createMockConversation() {
  // Log a mock bot message
  await logChat(TEST_WA_NUMBER, TEST_BOT_MESSAGE, 'outgoing', null);
  console.log(`Logged mock bot message: "${TEST_BOT_MESSAGE}"`);
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  const { error } = await supabase
    .from('chat_logs')
    .delete()
    .eq('wa_number', TEST_WA_NUMBER);
  
  if (error) {
    console.error('Error cleaning up test data:', error);
  } else {
    console.log('Test data cleaned up successfully');
  }
}

// Run the tests
runTests();
