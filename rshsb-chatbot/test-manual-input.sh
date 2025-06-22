#!/bin/bash
# Test script for the manual-user-input API endpoint using cURL
# 
# This script tests the /api/manual-user-input endpoint by sending a test message
# to a specified WhatsApp number and verifying the response from the OpenAI Assistant.
#
# Usage:
# 1. Make sure the backend server is running
# 2. Run this script with: bash test-manual-input.sh
# 3. Check the console output for the test results

# Configuration
API_URL="http://localhost:3001"
API_KEY="admin-rsh-secret-1"
TEST_WA_NUMBER="6281234567890"  # Replace with a valid test number
TEST_MESSAGE="Halo, ini adalah pesan test untuk OpenAI Assistant."

# ANSI color codes
RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
BLUE="\033[34m"
MAGENTA="\033[35m"

# Print header
echo -e "${BOLD}${BLUE}=== Testing Manual User Input API ===${RESET}\n"
echo -e "${YELLOW}URL:${RESET} ${API_URL}/api/manual-user-input"
echo -e "${YELLOW}WhatsApp Number:${RESET} ${TEST_WA_NUMBER}"
echo -e "${YELLOW}Message:${RESET} ${TEST_MESSAGE}\n"

# Send the request
echo -e "${BLUE}Sending request...${RESET}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_URL}/api/manual-user-input" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "{\"wa_number\":\"${TEST_WA_NUMBER}\",\"message\":\"${TEST_MESSAGE}\"}")

# Extract status code and response body
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

# Check if the request was successful
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo -e "\n${GREEN}✓ Test passed!${RESET}"
  echo -e "${YELLOW}Status:${RESET} ${HTTP_STATUS}"
  echo -e "${YELLOW}Response:${RESET}"
  echo "$RESPONSE_BODY" | jq '.'
  
  # Extract and display the reply if available
  REPLY=$(echo "$RESPONSE_BODY" | jq -r '.reply')
  if [ "$REPLY" != "null" ]; then
    echo -e "\n${BOLD}${MAGENTA}OpenAI Assistant Reply:${RESET}"
    echo "$REPLY"
  fi
else
  echo -e "\n${RED}✗ Test failed!${RESET}"
  echo -e "${YELLOW}Status:${RESET} ${HTTP_STATUS}"
  echo -e "${YELLOW}Error:${RESET}"
  echo "$RESPONSE_BODY" | jq '.'
fi

echo -e "\n${BOLD}${BLUE}=== Test completed ===${RESET}"
