require('dotenv').config();
const { extractInsight } = require('./openai');

// Verify environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'ASSISTANT_ID_INSIGHT'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Test message for insight extraction
const testMessage = `
Halo, nama saya Budi Santoso. Saya seorang pria berusia 35 tahun dari Jakarta.
Saya mengalami masalah dengan kecemasan dan sulit tidur selama beberapa bulan terakhir.
Saya sudah mencoba berbagai cara seperti meditasi dan olahraga, tapi masih sulit.
Saya rasa ini karena tekanan pekerjaan yang tinggi.
Saya ingin konsultasi dengan psikolog untuk mengatasi masalah ini.
`;

async function runTest() {
  console.log('Starting insight extraction test...');
  console.log('Test message:', testMessage);
  
  try {
    console.log('\n--- Testing extractInsight function ---');
    const insights = await extractInsight(testMessage);
    console.log('\nExtracted insights:');
    console.log(JSON.stringify(insights, null, 2));
    
    // Verify insights structure
    const expectedFields = ['name', 'gender', 'domisili', 'keluhan', 'barrier', 'lead_status'];
    const missingFields = expectedFields.filter(field => !(field in insights));
    
    if (missingFields.length > 0) {
      console.warn(`Warning: Missing expected fields in insights: ${missingFields.join(', ')}`);
    } else {
      console.log('\n✅ All expected fields are present in the insights');
    }
    
    // Check for error
    if (insights.error) {
      console.error(`❌ Error in insights: ${insights.error}`);
    } else {
      console.log('✅ No errors in insights extraction');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
runTest().then(() => {
  console.log('\nTest completed');
}).catch(error => {
  console.error('Unhandled error:', error);
});
