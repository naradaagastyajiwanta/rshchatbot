/**
 * Test script for the manual-user-input API endpoint
 * 
 * This script tests the /api/manual-user-input endpoint by sending a test message
 * to a specified WhatsApp number and verifying the response from the OpenAI Assistant.
 * 
 * Usage:
 * 1. Make sure the backend server is running
 * 2. Create a .env file with API_KEY_MANUAL_INPUT=your-api-key (optional)
 * 3. Run this script with: node test-manual-input.js
 * 4. Check the console output for the test results
 */

// Import required modules
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

// Configuration
const API_URL = process.env.API_URL || 'https://rshsb-chatbot.onrender.com';
// Try different API key options - you can set this via .env file or pass as command line arg
const API_KEY = process.env.API_KEY_MANUAL_INPUT || 
                process.argv[2] || 
                'admin-rsh-secret-1'; // Default fallback

const TEST_WA_NUMBER = '6281234567890'; // Replace with a valid test number
const TEST_MESSAGE = 'Halo, ini adalah pesan test untuk OpenAI Assistant.';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

/**
 * Test the manual-user-input API endpoint
 */
async function testManualUserInput() {
  console.log(`${colors.bright}${colors.blue}=== Testing Manual User Input API ===${colors.reset}\n`);
  console.log(`${colors.yellow}URL:${colors.reset} ${API_URL}/api/manual-user-input`);
  console.log(`${colors.yellow}WhatsApp Number:${colors.reset} ${TEST_WA_NUMBER}`);
  console.log(`${colors.yellow}Message:${colors.reset} ${TEST_MESSAGE}`);
  console.log(`${colors.yellow}Using API Key:${colors.reset} ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  try {
    console.log(`${colors.blue}Sending request...${colors.reset}`);
    
    // Make sure we're using the correct Authorization header format
    // The server expects: Authorization: Bearer <api_key>
    const authHeader = `Bearer ${API_KEY}`;
    console.log(`${colors.yellow}Authorization Header:${colors.reset} ${authHeader}\n`);
    
    const response = await fetch(`${API_URL}/api/manual-user-input`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        wa_number: TEST_WA_NUMBER,
        message: TEST_MESSAGE
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`\n${colors.green}✓ Test passed!${colors.reset}`);
      console.log(`${colors.yellow}Status:${colors.reset} ${response.status} ${response.statusText}`);
      console.log(`${colors.yellow}Response:${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
      
      if (data.reply) {
        console.log(`\n${colors.bright}${colors.magenta}OpenAI Assistant Reply:${colors.reset}`);
        console.log(data.reply);
      }
    } else {
      console.log(`\n${colors.red}✗ Test failed!${colors.reset}`);
      console.log(`${colors.yellow}Status:${colors.reset} ${response.status} ${response.statusText}`);
      console.log(`${colors.yellow}Error:${colors.reset} ${data.error || 'Unknown error'}`);
      if (data.message) {
        console.log(`${colors.yellow}Message:${colors.reset} ${data.message}`);
      }
      
      // Provide troubleshooting tips
      console.log(`\n${colors.yellow}Troubleshooting Tips:${colors.reset}`);
      console.log("1. Verify that the API key matches what's in the server's .env file");
      console.log("2. Check if the server is running and accessible");
      console.log("3. Try running the script with a different API key: node test-manual-input.js YOUR_API_KEY");
      console.log("4. Check the server logs for more details about the authentication failure");
    }
  } catch (error) {
    console.log(`\n${colors.red}✗ Test failed with exception:${colors.reset}`);
    console.error(error);
  }
}

// Run the test
testManualUserInput()
  .then(() => console.log(`\n${colors.bright}${colors.blue}=== Test completed ===${colors.reset}`))
  .catch(err => console.error(`\n${colors.red}Unhandled error:${colors.reset}`, err));
