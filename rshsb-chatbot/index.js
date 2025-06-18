/**
 * RSH WhatsApp Chatbot Main File
 * This is the main entry point for the WhatsApp chatbot using Baileys
 */

require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');

// Import our modules
const { sendToChatbot } = require('./openai');
const { logChat, getThreadId } = require('./supabase');
const { processMessageForInsights } = require('./extractor');

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
    printQRInTerminal: true,
    auth: state,
    defaultQueryTimeoutMs: 60000, // 60 seconds timeout
  });
  
  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const shouldReconnect = 
        (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
      
      // Reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('Connection opened');
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
        
        // Send to OpenAI Assistant and get response
        console.log(`Sending message to OpenAI Assistant with thread ID: ${threadId || 'new'}`);
        const assistantResponse = await sendToChatbot(messageContent, threadId);
        
        // Send the response back to the user
        await sock.sendMessage(chatId, { text: assistantResponse.response });
        
        // Log the outgoing message
        await logChat(waNumber, assistantResponse.response, 'outgoing', assistantResponse.threadId);
        
        // Process the message for insights in the background
        processMessageForInsights(messageContent, waNumber)
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

// Start the WhatsApp connection
connectToWhatsApp().catch(err => console.error('Unexpected error:', err));

console.log('RSH WhatsApp Chatbot is running...');
