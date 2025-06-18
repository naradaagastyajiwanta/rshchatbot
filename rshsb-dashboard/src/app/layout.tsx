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
          {/* Sidebar placeholder */}
          <div className="w-64 bg-white border-r border-gray-200 hidden md:block">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800">RSH SB Dashboard</h2>
            </div>
            <nav className="mt-6">
              <ul>
                <li className="px-6 py-3 hover:bg-gray-100">
                  <a href="/dashboard" className="flex items-center text-gray-700 hover:text-gray-900">
                    <span>Dashboard</span>
                  </a>
                </li>
                <li className="px-6 py-3 hover:bg-gray-100">
                  <a href="/users" className="flex items-center text-gray-700 hover:text-gray-900">
                    <span>Users</span>
                  </a>
                </li>
                <li className="px-6 py-3 hover:bg-gray-100">
                  <a href="/analytics" className="flex items-center text-gray-700 hover:text-gray-900">
                    <span>Analytics</span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold text-gray-800">RSH SB Dashboard</h1>
              <div className="flex items-center">
                <span className="text-sm text-gray-600">Rumah Sehat Holistik Satu Bumi</span>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
