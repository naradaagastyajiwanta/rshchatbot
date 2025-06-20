# RSH WhatsApp Chatbot

A WhatsApp bot backend built with Node.js, Baileys, OpenAI Assistant API, and Supabase.

## Description

This project provides a WhatsApp bot backend that connects to WhatsApp using the Baileys library, processes messages with OpenAI Assistant API, and stores conversation history and user profiles in Supabase.

## Features

- WhatsApp connection using Baileys
- OpenAI Assistant API integration for intelligent responses
- Supabase database for storing chat history and user profiles
- Insight extraction from conversations
- REST API endpoints for sending messages and managing the bot

## Deployment to Render.com

### Prerequisites

1. A [Render.com](https://render.com) account
2. A [GitHub](https://github.com) repository with your code
3. OpenAI API key
4. Supabase project with URL and API key
5. OpenAI Assistant IDs for chatbot and insight extraction

### Deployment Steps

1. Push your code to GitHub
2. Log in to your Render.com account
3. Click "New" and select "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` file and configure the service
6. Set up the required environment variables in the Render dashboard:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `ASSISTANT_ID_CHATBOT`
   - `ASSISTANT_ID_INSIGHT`
   - `API_KEY_SEND_MESSAGE`
   - `DASHBOARD_URL`
7. Deploy the service

## API Endpoints

### GET /wa-qr

Returns the QR code for WhatsApp Web authentication.

**Response:**
```json
{
  "qr": "data:image/png;base64,..."
}
```

### GET /wa-status

Returns the current WhatsApp connection status.

**Response:**
```json
{
  "state": "connected", // or "disconnected", "connecting"
  "lastUpdated": "2023-06-20T09:00:00.000Z",
  "phoneNumber": "6285183366820",
  "info": "WhatsApp connected successfully"
}
```

### POST /api/send-message

Sends a WhatsApp message to a specified number.

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "wa_number": "6281234567890",
  "message": "Hello from the API!"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /api/regenerate-qr

Forces QR code regeneration for a new WhatsApp Web session.

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "success": true,
  "message": "Auth reset initiated, new QR code will be generated shortly"
}
```

### POST /api/logout

Logs out from the current WhatsApp Web session.

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Environment Variables

Create a `.env` file in the root directory with the following variables (see `.env.example` for reference):

- `OPENAI_API_KEY`: Your OpenAI API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase project API key
- `ASSISTANT_ID_CHATBOT`: OpenAI Assistant ID for the chatbot
- `ASSISTANT_ID_INSIGHT`: OpenAI Assistant ID for insight extraction
- `API_KEY_SEND_MESSAGE`: Custom API key for authenticating API requests
- `DASHBOARD_URL`: URL of the dashboard application
- `PORT`: Server port (default: 3000)

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables
4. Start the server: `npm start`
5. Scan the QR code to connect to WhatsApp

## License

ISC
