import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";
import ClientLayout from "./components/ClientLayout";

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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <Toaster position="top-right" toastOptions={{
          success: { duration: 3000 },
          error: { duration: 5000 },
          style: {
            background: '#363636',
            color: '#fff',
          },
        }} />
        {children}
      </body>
    </html>
  );
}
