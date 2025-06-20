/**
 * RSH WhatsApp Chatbot Main File
 * This is the main entry point for the WhatsApp chatbot using Baileys
 */

require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const express = require('express');
const cors = require('cors');

// Import our modules
const { sendToChatbot } = require('./openai'); // Using updated openai.js with axios implementation
const { logChat, getThreadId, getUserProfile } = require('./supabase');
const { processMessageForInsights } = require('./extractor');

// Initialize Express server
const app = express();
app.use(cors());
app.use(express.json());

// Variables to store the latest QR code and connection status
let latestQr = null;
let connectionStatus = {
  state: 'disconnected', // 'disconnected', 'connecting', 'connected'
  lastUpdated: new Date().toISOString(),
  phoneNumber: null,
  info: null
};

// Create auth directory if it doesn't exist
const AUTH_FOLDER = path.join(__dirname, 'auth');
if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

// Track reconnection attempts
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL_BASE = 5000; // 5 seconds base, will be multiplied by attempt count

// Function to start the WhatsApp connection
async function connectToWhatsApp() {
  try {
    // Use the saved authentication state
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    
    // Create a new WhatsApp socket
    const sock = makeWASocket({
      auth: state,
      defaultQueryTimeoutMs: 60000, // 60 seconds timeout
      printQRInTerminal: false, // We handle QR code display ourselves
      connectTimeoutMs: 30000, // 30 seconds connection timeout
      retryRequestDelayMs: 1000, // Retry delay for requests
    });
    
    // Make the socket available globally for the notifier module
    if (global.whatsappSock) {
      // Clean up previous socket listeners if exists
      try {
        global.whatsappSock.ev.removeAllListeners();
        console.log('Cleaned up previous socket listeners');
      } catch (err) {
        console.log('Error cleaning up previous socket:', err);
      }
    }
    
    global.whatsappSock = sock;
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // If QR code is received, display it in terminal and store it for API
    if (qr) {
      console.log('\n==== Scan QR Code to connect to WhatsApp ====');
      qrcodeTerminal.generate(qr, { small: true });
      console.log('\nQR Code will expire in 20 seconds. Scan it quickly!');
      
      // Update connection status to connecting
      connectionStatus = {
        ...connectionStatus,
        state: 'connecting',
        lastUpdated: new Date().toISOString(),
        info: 'QR Code generated, waiting for scan'
      };
      
      // Generate QR code as data URI for API endpoint
      qrcode.toDataURL(qr)
        .then(url => {
          latestQr = url;
          console.log('QR Code generated and stored for API');
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });
    }
    
    if (connection === 'close') {
      // Get the status code from the error
      const statusCode = (lastDisconnect.error instanceof Boom) ? 
        lastDisconnect.error.output?.statusCode : 
        0;
      
      // Get error reason if available
      const errorReason = lastDisconnect.error?.data?.reason || '';
      
      // Determine if we should reconnect
      let shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
      
      // Update connection status to disconnected
      connectionStatus = {
        ...connectionStatus,
        state: 'disconnected',
        lastUpdated: new Date().toISOString(),
        info: `Disconnected: ${lastDisconnect.error?.message || 'Unknown error'}`
      };
      
      // Reset QR code when disconnected
      latestQr = null;
      
      // Handle specific error cases
      if (statusCode === 440) { // Stream error (conflict)
        console.log('Detected connection conflict. Clearing auth state and waiting before reconnecting...');
        await clearAuthState();
        
        // Wait longer for conflict errors
        await new Promise(resolve => setTimeout(resolve, 10000));
        reconnectAttempts = 0; // Reset attempts after clearing auth
      } else if (statusCode === 401 || errorReason === '401') { // Unauthorized
        console.log('Detected unauthorized connection. Complete auth reset required.');
        await clearAuthState(true); // Complete reset
        
        // Force a fresh login
        shouldReconnect = true;
        reconnectAttempts = 0;
        
        // Wait before reconnecting
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Reconnect if not logged out
      if (shouldReconnect) {
        // Implement exponential backoff for reconnection
        reconnectAttempts++;
        
        if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_INTERVAL_BASE * Math.pow(1.5, reconnectAttempts - 1);
          console.log(`Attempting to reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          
          setTimeout(() => {
            console.log(`Reconnecting now (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            connectToWhatsApp();
          }, delay);
        } else {
          console.log(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Please restart the application manually.`);
        }
      }
    } else if (connection === 'open') {
      console.log('Connection opened');
      
      // Update connection status to connected
      connectionStatus = {
        state: 'connected',
        lastUpdated: new Date().toISOString(),
        phoneNumber: sock.user?.id?.split(':')[0] || 'Unknown',
        info: 'WhatsApp connected successfully'
      };
      
      // Clear QR code when connected
      latestQr = null;
      
      // Reset reconnection attempts on successful connection
      reconnectAttempts = 0;
    }
  });
  
  // Save credentials whenever they are updated
  sock.ev.on('creds.update', saveCreds);
  
  // Handle incoming messages
  sock.ev.on('messages.upsert', async (messageUpdate) => {
    if (messageUpdate.type !== 'notify') return;
    
    for (const msg of messageUpdate.messages) {
      // Skip if not a text message or if it's from us
      if (!msg.message || msg.key.fromMe) continue;
      
      // Get the chat ID (usually a phone number for WhatsApp)
      const chatId = msg.key.remoteJid;
      
      // Skip groups and broadcasts
      if (chatId.includes('@g.us') || chatId.includes('broadcast')) continue;
      
      // Extract the message content
      const messageContent = msg.message.conversation || 
                            (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) ||
                            '';
      
      if (!messageContent) continue;
      
      console.log(`Received message from ${chatId}: ${messageContent}`);
      
      try {
        // Format the phone number (remove WhatsApp suffix)
        const waNumber = chatId.split('@')[0];
        
        // Log the incoming message
        const threadId = await getThreadId(waNumber);
        await logChat(waNumber, messageContent, 'incoming', threadId);
        
        // Check if bot is active for this user
        const userProfile = await getUserProfile(waNumber);
        const isBotActive = userProfile?.is_bot_active !== false; // Default to true if not set
        
        if (!isBotActive) {
          console.log(`Bot is disabled for user ${waNumber}. Silently ignoring message.`);
          return; // Skip further processing without sending any notification
        }
        
        // Send to OpenAI Assistant and get response
        console.log(`Sending message to OpenAI Assistant with thread ID: ${threadId || 'new'} for ${waNumber}`);
        const assistantResponse = await sendToChatbot(messageContent, threadId, waNumber);
        
        // Send the response back to the user
        await sock.sendMessage(chatId, { text: assistantResponse.response });
        
        // Log the outgoing message
        await logChat(waNumber, assistantResponse.response, 'outgoing', assistantResponse.threadId);
        
        // Process the message for insights in the background
        processMessageForInsights(messageContent, waNumber, assistantResponse.threadId)
          .then(insights => {
            if (!insights.error) {
              console.log(`Insights extracted for ${waNumber}:`, insights);
            }
          })
          .catch(err => {
            console.error(`Error extracting insights for ${waNumber}:`, err);
          });
        
      } catch (error) {
        console.error('Error processing message:', error);
        // Send error message to user
        await sock.sendMessage(chatId, { 
          text: 'Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi nanti.' 
        });
      }
    }
  });
  
  return sock;
  } catch (err) {
    console.error('Error in connectToWhatsApp:', err);
    throw err; // Re-throw to be handled by the caller
  }
}

// API endpoint to get the QR code
app.get('/wa-qr', (req, res) => {
  if (latestQr) {
    res.json({ qr: latestQr });
  } else {
    res.status(404).json({ error: 'QR Code belum tersedia.' });
  }
});

// API endpoint to get the connection status
app.get('/wa-status', (req, res) => {
  res.json(connectionStatus);
});

// Middleware to verify API key
const verifyApiKey = (req, res, next) => {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  
  // Check if the API key is provided and in correct format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }
  
  // Extract the API key
  const apiKey = authHeader.split(' ')[1];
  
  // Verify the API key against the environment variable
  if (apiKey !== process.env.API_KEY_SEND_MESSAGE) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  // If API key is valid, proceed to the next middleware/route handler
  next();
};

// API endpoint to force QR code regeneration
app.post('/api/regenerate-qr', verifyApiKey, async (req, res) => {
  try {
    // Clear auth state to force new QR code generation
    await clearAuthState(true);
    
    // Reset connection status
    connectionStatus = {
      state: 'disconnected',
      lastUpdated: new Date().toISOString(),
      phoneNumber: null,
      info: 'Auth reset, waiting for QR code generation'
    };
    
    // Reset QR code
    latestQr = null;
    
    // Restart connection
    if (global.whatsappSock) {
      try {
        global.whatsappSock.ev.removeAllListeners();
        console.log('Cleaned up previous socket listeners');
      } catch (err) {
        console.log('Error cleaning up previous socket:', err);
      }
    }
    
    // Wait a moment before reconnecting
    setTimeout(() => {
      connectToWhatsApp().catch(err => console.error('Error reconnecting after QR regeneration:', err));
    }, 2000);
    
    res.json({ success: true, message: 'Auth reset initiated, new QR code will be generated shortly' });
  } catch (error) {
    console.error('Error regenerating QR code:', error);
    res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

// API endpoint to send WhatsApp message
app.post('/api/send-message', verifyApiKey, async (req, res) => {
  try {
    const { wa_number, message } = req.body;
    
    // Validate wa_number (must be string, start with 62, at least 10 digits)
    if (!wa_number || typeof wa_number !== 'string' || !wa_number.startsWith('62') || wa_number.length < 10) {
      return res.status(400).json({ error: 'Invalid wa_number: must be a string starting with 62 and at least 10 digits' });
    }
    
    // Validate message (must be string, not empty, max 1000 characters)
    if (!message || typeof message !== 'string' || message.length === 0 || message.length > 1000) {
      return res.status(400).json({ error: 'Invalid message: must be a non-empty string with maximum 1000 characters' });
    }
    
    // Send the message using the WhatsApp socket
    await global.whatsappSock.sendMessage(wa_number + '@s.whatsapp.net', { text: message });
    
    // Log the outgoing message if logChat function is available
    if (typeof logChat === 'function') {
      await logChat(wa_number, message, 'outgoing', null);
    }
    
    // Return success response
    return res.status(200).json({ success: true });
  } catch (error) {
    // Log the error server-side but don't expose details to client
    console.error('Error sending WhatsApp message:', error);
    return res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Helper function to clear auth state
async function clearAuthState(completeReset = false) {
  try {
    console.log(`Clearing auth state (completeReset: ${completeReset})`);
    const authFiles = fs.readdirSync(AUTH_FOLDER);
    
    for (const file of authFiles) {
      // If complete reset, delete all files
      // Otherwise, only delete session and app-state files
      if (completeReset || file.includes('session') || file.includes('app-state')) {
        fs.unlinkSync(path.join(AUTH_FOLDER, file));
        console.log(`Deleted auth file: ${file}`);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error clearing auth files:', err);
    return false;
  }
}

// Add a function to properly logout and clear credentials
async function logoutWhatsApp() {
  if (global.whatsappSock) {
    try {
      await global.whatsappSock.logout();
      console.log('Logged out successfully');
      
      // Clear all auth files
      await clearAuthState(true);
      
      // Update connection status
      connectionStatus = {
        state: 'disconnected',
        lastUpdated: new Date().toISOString(),
        phoneNumber: null,
        info: 'Logged out manually'
      };
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Error during logout:', error);
      return { success: false, message: 'Error during logout: ' + error.message };
    }
  } else {
    return { success: false, message: 'No active WhatsApp connection' };
  }
}

// Add API endpoint for logout
app.post('/api/logout', verifyApiKey, async (req, res) => {
  const result = await logoutWhatsApp();
  res.json(result);
});

// Start the WhatsApp connection with proper error handling
connectToWhatsApp().catch(err => {
  console.error('Unexpected error during connection:', err);
  
  // Set a timeout to retry initial connection
  setTimeout(() => {
    console.log('Retrying initial connection after error...');
    connectToWhatsApp().catch(err => console.error('Retry failed:', err));
  }, 5000);
});

console.log('RSH WhatsApp Chatbot is running...');
