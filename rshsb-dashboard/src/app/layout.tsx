import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RSH SB Dashboard",
  description: "Admin dashboard for Rumah Sehat Holistik Satu Bumi WhatsApp Chatbot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <div className="flex h-screen overflow-hidden">
          {/* improved UI: Persistent sidebar with modern styling according to requirements */}
          <div className="w-64 bg-white border-r shadow-sm flex-shrink-0 fixed h-full z-10">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">RSH SB</h2>
              <p className="text-xs text-gray-500 mt-1">Healthcare Analytics Dashboard</p>
            </div>
            <nav className="mt-4 space-y-4">
              <ul>
                <li>
                  <a 
                    href="/dashboard" 
                    className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-xl group mx-2"
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                    </svg>
                    <span className="font-medium">Live Chat</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="/users" 
                    className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-xl group mx-2"
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                    <span className="font-medium">Users</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="/analytics" 
                    className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-xl group mx-2"
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    <span className="font-medium">Analytics</span>
                  </a>
                </li>
              </ul>
            </nav>
            
            {/* improved UI: Footer with branding */}
            <div className="absolute bottom-0 w-full p-4 border-t">
              <div className="text-xs text-gray-500">
                <p>Rumah Sehat Holistik</p>
                <p className="mt-1 text-gray-400">Satu Bumi</p>
              </div>
            </div>
          </div>

          {/* improved UI: Main content area with proper spacing */}
          <div className="flex-1 overflow-auto ml-64">
            {/* improved UI: Modern header with shadow */}
            <header className="bg-white border-b shadow-sm p-4 sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Rumah Sehat Holistik</h1>
                <div className="text-sm text-gray-500">
                  Admin Dashboard
                </div>
              </div>
            </header>

            {/* improved UI: Page content with proper padding and spacing */}
            <main className="p-4 space-y-4">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
