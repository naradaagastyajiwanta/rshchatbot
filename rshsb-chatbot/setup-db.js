/**
 * Database Setup Script for RSH Chatbot
 * This script provides instructions for creating the necessary tables in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  try {
    console.log('Checking Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      return false;
    }
    
    console.log('Successfully connected to Supabase');
    return true;
  } catch (err) {
    console.error('Exception checking Supabase connection:', err);
    return false;
  }
}

async function checkTable(tableName) {
  try {
    console.log(`Checking if ${tableName} table exists...`);
    const { data, error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        console.log(`Table ${tableName} does not exist`);
        return false;
      } else {
        console.error(`Error checking ${tableName} table:`, error);
        return false;
      }
    }
    
    console.log(`Table ${tableName} exists`);
    return true;
  } catch (err) {
    console.error(`Error checking ${tableName} table:`, err);
    return false;
  }
}

async function setupDatabase() {
  try {
    console.log('\n=== RSH Chatbot Database Setup ===\n');
    
    // Check connection
    const connected = await checkConnection();
    if (!connected) {
      console.error('\nFailed to connect to Supabase. Please check your credentials.\n');
      return;
    }
    
    // Check tables
    const chatLogsExists = await checkTable('chat_logs');
    const userProfilesExists = await checkTable('user_profiles');
    
    console.log('\n=== Database Status ===');
    console.log(`chat_logs table: ${chatLogsExists ? 'EXISTS' : 'MISSING'}`);
    console.log(`user_profiles table: ${userProfilesExists ? 'EXISTS' : 'MISSING'}\n`);
    
    if (!chatLogsExists || !userProfilesExists) {
      console.log('\n=== Manual Setup Instructions ===');
      console.log('Some tables are missing. Please create them manually in the Supabase dashboard:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to the SQL Editor');
      console.log('3. Create a new query and paste the following SQL:');
      
      if (!chatLogsExists) {
        console.log(`\n-- Create chat_logs table\nCREATE TABLE IF NOT EXISTS chat_logs (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  wa_number TEXT NOT NULL,\n  message TEXT NOT NULL,\n  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),\n  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  thread_id TEXT\n);`);
      }
      
      if (!userProfilesExists) {
        console.log(`\n-- Create user_profiles table\nCREATE TABLE IF NOT EXISTS user_profiles (\n  wa_number TEXT PRIMARY KEY,\n  name TEXT,\n  gender TEXT,\n  domisili TEXT,\n  keluhan TEXT,\n  barrier TEXT,\n  lead_status TEXT,\n  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);`);
      }
      
      console.log('\n4. Run the query to create the tables');
      console.log('5. Restart your application\n');
    } else {
      console.log('\n=== Success ===');
      console.log('All required tables exist. Your database is ready to use!\n');
    }
  } catch (error) {
    console.error('Error in database setup:', error);
  }
}

// Run the setup
setupDatabase().catch(console.error);
