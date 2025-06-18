# RSH SB Dashboard

An admin dashboard for monitoring and analyzing the performance of the Rumah Sehat Holistik Satu Bumi (RSH) WhatsApp chatbot. This dashboard provides real-time chat monitoring, user profile management, and analytics visualization.

## 🎯 Features

- **Live Chat Viewer**: Monitor WhatsApp conversations in real-time
- **User Management**: View and filter user profiles by various criteria
- **Analytics Dashboard**: Visualize key metrics with interactive charts
- **User Detail Pages**: Detailed view of individual user profiles and chat history
- **Real-time Updates**: Live data synchronization via Supabase Realtime

## 📦 Tech Stack

- **Next.js** (App Router, TypeScript)
- **TailwindCSS** for UI styling
- **Supabase** for database and real-time subscriptions
- **Recharts** for data visualization

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd rshsb-dashboard
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the project root with the following content:

```
NEXT_PUBLIC_SUPABASE_URL=https://kfrmnlscvejptimbehgb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmcm1ubHNjdmVqcHRpbWJlaGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMzMyMjAsImV4cCI6MjA2NTgwOTIyMH0.s-3sW0OPAv28VRAiA_gCqeu8uxXP2yDeMyeDyfB7Q0I
```

4. Run the development server

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
src/
├── app/                    # App Router pages
│   ├── dashboard/          # Live chat monitoring page
│   ├── users/              # User profiles listing page
│   ├── analytics/          # Data visualization page
│   ├── user/[wa_number]/   # Individual user detail page
│   └── layout.tsx          # Root layout with sidebar and header
├── components/             # Reusable components
│   ├── ChatViewer.tsx      # Chat message display component
│   ├── UserTable.tsx       # User profiles table with filters
│   ├── AnalyticsCharts.tsx # Charts and data visualization
│   └── UserDetail.tsx      # User profile detail component
└── lib/
    └── supabaseClient.ts   # Supabase client configuration
```

## 📊 Database Structure

The dashboard connects to a Supabase database with the following tables:

### `chat_logs`
- `id`: UUID
- `wa_number`: Text
- `message`: Text
- `direction`: Text ('incoming' | 'outgoing')
- `timestamp`: Timestamp
- `thread_id`: Text

### `user_profiles`
- `wa_number`: Text (primary key)
- `name`: Text
- `gender`: Text
- `domisili`: Text
- `keluhan`: Text
- `barrier`: Text
- `lead_status`: Text ('Cold' | 'Warm' | 'Hot')
- `last_updated`: Timestamp
- `age`: Integer
- `symptoms`: Text
- `medical_history`: Text
- `urgency_level`: Text
- `emotion`: Text
- `program_awareness`: Text

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## 📱 Pages

- **`/dashboard`**: Live Chat Viewer from the `chat_logs` table
- **`/users`**: User profiles list from the `user_profiles` table with filtering
- **`/analytics`**: Charts and metrics visualization
- **`/user/[wa_number]`**: Detailed user profile and chat history

## 🛠️ Development

To add new features or modify existing ones:

1. Create or modify components in the `src/components` directory
2. Update pages in the `src/app` directory
3. Test your changes with the development server

## 📝 License

This project is proprietary and confidential.
