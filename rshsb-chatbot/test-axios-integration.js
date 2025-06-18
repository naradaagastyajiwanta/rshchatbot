/**
 * Test script for OpenAI Assistant API integration using axios
 * This script tests the openai-axios.js module
 */

require('dotenv').config();
const { sendToChatbot, extractInsight } = require('./openai-axios');

async function testChatbot() {
  try {
    console.log('=== Testing Chatbot with Axios Integration ===');
    
    // Test with a new thread
    console.log('\n1. Testing with a new thread:');
    const result1 = await sendToChatbot('Halo, saya ingin bertanya tentang layanan RSH');
    console.log('Response:', result1.response);
    console.log('Thread ID:', result1.threadId);
    
    if (result1.threadId) {
      // Test with the same thread
      console.log('\n2. Testing with the same thread:');
      const result2 = await sendToChatbot('Apa saja layanan yang tersedia?', result1.threadId);
      console.log('Response:', result2.response);
      console.log('Thread ID:', result2.threadId);
      
      // Test with an invalid thread ID
      console.log('\n3. Testing with an invalid thread ID:');
      const result3 = await sendToChatbot('Bagaimana cara mendaftar?', 'invalid_thread_id');
      console.log('Response:', result3.response);
      console.log('Thread ID:', result3.threadId);
    }
    
    // Test insight extraction
    console.log('\n4. Testing insight extraction:');
    const message = 'Nama saya Budi, saya pria berusia 35 tahun dari Jakarta. ' +
                   'Saya mengalami sakit kepala dan insomnia selama 2 minggu. ' +
                   'Saya sudah coba minum obat tapi tidak membaik. ' +
                   'Saya ingin konsultasi dengan dokter RSH.';
    
    const insights = await extractInsight(message);
    console.log('Extracted insights:', JSON.stringify(insights, null, 2));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testChatbot();
