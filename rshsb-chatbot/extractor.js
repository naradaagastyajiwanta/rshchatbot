/**
 * Insight Extractor Module
 * This module handles the extraction of user insights from conversations
 */

const { extractInsight } = require('./openai'); // Using updated openai.js with axios implementation
const { updateUserProfile } = require('./supabase');

/**
 * Process a message to extract insights and update the user profile
 * @param {string} message - The message to extract insights from
 * @param {string} waNumber - The WhatsApp number of the user
 * @returns {Object} - The extracted insights
 */
async function processMessageForInsights(message, waNumber) {
  try {
    console.log(`Extracting insights from message for ${waNumber}...`);
    
    // Extract insights from the message
    const insights = await extractInsight(message);
    
    // If we got any insights, update the user profile
    if (insights && !insights.error) {
      // Filter out null and empty string values to avoid overwriting existing data
      const filteredInsights = Object.fromEntries(
        Object.entries(insights).filter(([_, value]) => value !== null && value !== '')
      );
      
      // Only update if we have any non-null insights
      if (Object.keys(filteredInsights).length > 0) {
        console.log(`Updating user profile with insights: ${JSON.stringify(filteredInsights)}`);
        await updateUserProfile(waNumber, filteredInsights);
      }
    }
    
    return insights;
  } catch (error) {
    console.error('Error processing message for insights:', error);
    return { error: error.message };
  }
}

module.exports = {
  processMessageForInsights
};
