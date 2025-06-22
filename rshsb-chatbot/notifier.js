/**
 * CS Notification Module
 * This module handles sending notifications to CS staff when high-lead users are detected
 */

const { supabase, getUserProfile } = require('./supabase');

/**
 * Get the CS WhatsApp number from settings
 * @returns {Promise<string|null>} CS WhatsApp number or null if not found
 */
async function getCSNumber() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'cs_number')
      .single();
    
    if (error) {
      console.error('Error getting CS number from settings:', error);
      return null;
    }
    
    return data?.value || null;
  } catch (err) {
    console.error('Exception in getCSNumber:', err);
    return null;
  }
}

/**
 * Check if CS notification is active
 * @returns {Promise<boolean>} true if active, false if inactive
 */
async function isCSNotificationActive() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'cs_status')
      .single();
    
    if (error) {
      console.error('Error getting CS status from settings:', error);
      // Default to active if not found
      return true;
    }
    
    // Return true if active or not found, false if inactive
    return data?.value !== 'inactive';
  } catch (err) {
    console.error('Exception in isCSNotificationActive:', err);
    // Default to active on error
    return true;
  }
}

/**
 * Send a WhatsApp message to a specific number
 * @param {object} sock - Baileys socket connection
 * @param {string} number - WhatsApp number to send message to (with country code, no +)
 * @param {string} message - Message text to send
 * @returns {Promise<boolean>} true if message was sent successfully
 */
async function sendMessageToNumber(sock, number, message) {
  try {
    if (!sock) {
      console.error('Error: WhatsApp socket not provided');
      return false;
    }
    
    if (!number) {
      console.error('Error: WhatsApp number not provided');
      return false;
    }
    
    // Format number to WhatsApp JID format (number@s.whatsapp.net)
    // Remove any + prefix if present
    const formattedNumber = number.startsWith('+') ? number.substring(1) : number;
    const jid = `${formattedNumber}@s.whatsapp.net`;
    
    // Send message
    await sock.sendMessage(jid, { text: message });
    console.log(`Message sent to ${number} successfully`);
    return true;
  } catch (err) {
    console.error(`Error sending message to ${number}:`, err);
    return false;
  }
}

/**
 * Notify CS if user profile has high lead status and hasn't been notified yet
 * @param {object} userProfile - User profile object from database
 * @param {object} sock - Baileys socket connection
 * @returns {Promise<boolean>} true if notification was sent
 */
async function notifyCSIfNeeded(userProfile, sock) {
  try {
    // Check if notification is needed
    if (!userProfile) {
      console.error('Error: User profile not provided');
      return false;
    }
    
    // Skip if not a high or very_high lead
    if (userProfile.lead_status !== 'high' && userProfile.lead_status !== 'very_high') {
      console.log(`User ${userProfile.wa_number} is not a high or very_high lead, skipping notification`);
      return false;
    }
    
    // Skip if already notified
    if (userProfile.notified_cs === true) {
      console.log(`CS already notified about user ${userProfile.wa_number}`);
      return false;
    }
    
    // Check if CS notification is active
    const isActive = await isCSNotificationActive();
    if (!isActive) {
      console.log('CS notification is inactive, skipping notification');
      return false;
    }
    
    // Get CS number
    const csNumber = await getCSNumber();
    if (!csNumber) {
      console.error('CS number not found in settings');
      return false;
    }
    
    // Prepare message with dashboard link
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    const message = `🔔 User tertarik untuk konsultasi:

Nama: ${userProfile.name || 'Tidak diketahui'}

Nomor: wa.me/${userProfile.wa_number}

Keluhan: ${userProfile.keluhan || 'Tidak diketahui'}

Lead: HIGH

Lihat profil lengkap: ${dashboardUrl}/user/${userProfile.wa_number}

Segera hubungi untuk sesi call konsultasi 🙌`;
    
    // Send notification
    const sent = await sendMessageToNumber(sock, csNumber, message);
    
    if (sent) {
      // Update user profile to mark as notified
      const { error } = await supabase
        .from('user_profiles')
        .update({ notified_cs: true })
        .eq('wa_number', userProfile.wa_number);
      
      if (error) {
        console.error(`Error updating notified_cs status for ${userProfile.wa_number}:`, error);
        // Still return true since notification was sent
      }
      
      console.log(`CS notified about high lead user ${userProfile.wa_number}`);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Exception in notifyCSIfNeeded:', err);
    return false;
  }
}

module.exports = {
  getCSNumber,
  isCSNotificationActive,
  sendMessageToNumber,
  notifyCSIfNeeded
};
