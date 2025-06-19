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

// Function to start the WhatsApp connection
async function connectToWhatsApp() {
  // Use the saved authentication state
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  
  // Create a new WhatsApp socket
  const sock = makeWASocket({
    auth: state,
    defaultQueryTimeoutMs: 60000, // 60 seconds timeout
  });
  
  // Handle QR code generation and connection updates
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
      const shouldReconnect = 
        (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
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
      
      // Reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
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

// Start the Express server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start the WhatsApp connection
connectToWhatsApp().catch(err => console.error('Unexpected error:', err));

console.log('RSH WhatsApp Chatbot is running...');
