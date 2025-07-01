import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const waNumber = searchParams.get('wa_number');
    const type = searchParams.get('type');

    if (!waNumber) {
      return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 });
    }

    if (!type || (type !== 'pdf' && type !== 'txt' && type !== 'html')) {
      return NextResponse.json({ error: 'Valid type (pdf, txt, or html) is required' }, { status: 400 });
    }

    // Fetch chat history from Supabase
    const { data, error } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('wa_number', waNumber)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }

    // Format chat history for reference
    const chatHistory = data.map((message) => {
      const sender = message.direction === 'incoming' ? 'User' : 'Bot';
      const timestamp = new Date(message.timestamp).toLocaleString();
      return `[${timestamp}] ${sender}: ${message.message}`;
    }).join('\n\n');

    // Generate file based on requested type
    if (type === 'txt') {
      // Generate TXT
      const txtContent = generateTxt(waNumber, data);
      
      return new NextResponse(txtContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="chat-${waNumber}.txt"`,
        },
      });
    } else if (type === 'html') {
      // Generate HTML content
      const htmlContent = generateHtmlForPdf(waNumber, data);
      
      // Return HTML content with HTML headers
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="chat-${waNumber}.html"`,
        },
      });
    } else if (type === 'pdf') {
      // For backward compatibility, generate HTML content for PDF
      const htmlContent = generateHtmlForPdf(waNumber, data);
      
      // Return HTML content with PDF headers but HTML content type
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="chat-${waNumber}.html"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting chat:', error);
    return NextResponse.json({ error: 'Failed to export chat' }, { status: 500 });
  }
}

function generateTxt(waNumber: string, messages: any[]) {
  // Create a formatted text document
  let txtContent = `Chat History - ${waNumber}\n`;
  txtContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
  
  // Add messages
  messages.forEach(message => {
    const sender = message.direction === 'incoming' ? 'User' : 'Bot';
    const timestamp = new Date(message.timestamp).toLocaleString();
    txtContent += `[${timestamp}] ${sender}:\n${message.message}\n\n`;
  });
  
  return txtContent;
}

function generateHtmlForPdf(waNumber: string, messages: any[]) {
  // Create HTML content with styling
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chat History - ${waNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #8e003b;
          text-align: center;
          margin-bottom: 10px;
        }
        .timestamp {
          text-align: right;
          color: #666;
          font-size: 12px;
          margin-bottom: 30px;
        }
        .message {
          margin-bottom: 20px;
          padding: 10px;
          border-radius: 5px;
        }
        .user {
          background-color: #f5e0e8;
          border-left: 4px solid #8e003b;
        }
        .bot {
          background-color: #f0f0f0;
          border-left: 4px solid #666;
        }
        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .user .sender {
          color: #8e003b;
        }
        .bot .sender {
          color: #333;
        }
        .message-time {
          font-size: 12px;
          color: #666;
        }
        .message-content {
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <h1>Chat History - ${waNumber}</h1>
      <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
      
      <div class="chat-container">
        ${messages.map(message => {
          const sender = message.direction === 'incoming' ? 'User' : 'Bot';
          const messageClass = message.direction === 'incoming' ? 'user' : 'bot';
          const timestamp = new Date(message.timestamp).toLocaleString();
          
          return `
            <div class="message ${messageClass}">
              <div class="message-header">
                <span class="sender">${sender}</span>
                <span class="message-time">${timestamp}</span>
              </div>
              <div class="message-content">${message.message}</div>
            </div>
          `;
        }).join('')}
      </div>
    </body>
    </html>
  `;
  
  return htmlContent;
}
