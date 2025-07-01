const PDFDocument = require('pdfkit');
const { supabase } = require('./supabase');

/**
 * Get formatted chat history for a WhatsApp number
 * @param {string} wa_number - WhatsApp number
 * @returns {Promise<string|null>} Formatted chat history or null if not found
 */
async function getChatHistoryFormatted(wa_number) {
  const { data, error } = await supabase
    .from('chat_logs')
    .select('*')
    .eq('wa_number', wa_number)
    .order('timestamp', { ascending: true });

  if (error || !data) return null;

  return data.map(chat => {
    const time = new Date(chat.timestamp).toLocaleString();
    const sender = chat.direction === 'incoming' ? 'User' : 'Bot';
    return `[${time}] ${sender}: ${chat.message}`;
  }).join('\n');
}

/**
 * Generate a TXT file from text content
 * @param {string} text - Text content
 * @returns {Buffer} Buffer containing the text
 */
function generateTxtFile(text) {
  return Buffer.from(text, 'utf-8');
}

/**
 * Generate a PDF file from text content
 * @param {string} text - Text content
 * @returns {Promise<Buffer>} Promise resolving to Buffer containing the PDF
 */
function generatePdfFile(text) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.font('Courier').fontSize(10).text(text);
    doc.end();
  });
}

module.exports = {
  getChatHistoryFormatted,
  generateTxtFile,
  generatePdfFile
};
